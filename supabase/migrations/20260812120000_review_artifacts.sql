-- R4 — the client approves a THING, not a stage name.
--
-- Until now `respond_client_portal_step` recorded {status, note} against a step
-- id, and the portal rendered that step's LABEL with two buttons. A client
-- approved the word "Identity". DESIGN_GRAMMAR G10.5 has forbidden that since
-- it was written, and docs/PRD.md §4.8 says the same: gates attach to things
-- you show. CLAUDE.md §17 adds the half nothing implemented — an approval must
-- say WHICH VERSION was approved, "rather than simply replacing old files".
--
-- Two columns' worth of change, and one rule:
--
--   review_artifacts   what the studio has explicitly shown, per step. Stamped
--                      by a deliberate act, never derived on read: a portal
--                      that rebuilt the artifact when the client opened it
--                      would let the artwork change underneath an approval in
--                      progress.
--
--   step_status.artifact   the fingerprint the client actually approved,
--                      written SERVER-SIDE from the shown artifact. The client
--                      does not send it and cannot spoof it, which is what
--                      makes the record evidence rather than a claim.
--
-- DELIBERATELY NOT delivery_pack. That column stays gated on
-- delivery_status = 'delivered'. A review artifact is a different thing at a
-- different time, and reusing the delivered book for pre-delivery review would
-- collapse VERIFIED ≠ DELIVERED — the boundary this workstream has held
-- through four passes.
--
-- DELIBERATELY NOT packageAssets. Touchpoint production files carry usage
-- rights that forbid handing them over; routing them through the portal is the
-- exact P0 leak closed in pass 1.

alter table public.client_portals
  add column if not exists review_artifacts jsonb not null default '{}'::jsonb;

-- ── The client-visible payload learns about review artifacts ──
--
-- DROP first, not `create or replace` — Postgres refuses to change an existing
-- function's OUT columns and this gains one. Same trap recorded in
-- 20260728170000 and again in 20260806120000.
--
-- Every existing gate is carried forward unchanged: revoked_at, expires_at,
-- the detective_answers form-status gate, the survey_questions gate, and
-- delivery_status. portalRpcGates.test.js asserts each of them against the LAST
-- definition of this function, which is this one.
drop function if exists public.get_client_portal(uuid);

create function public.get_client_portal(portal_id uuid)
returns table(
  client_name text,
  detective_answers jsonb,
  step_visibility jsonb,
  step_status jsonb,
  form_status text,
  submitted_answers jsonb,
  survey_kind text,
  survey_status text,
  survey_questions jsonb,
  delivery_status text,
  review_artifacts jsonb
)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    client_name,
    case
      when form_status in ('pending', 'submitted') then detective_answers
      else '{}'::jsonb
    end as detective_answers,
    step_visibility,
    step_status,
    form_status,
    submitted_answers,
    survey_kind,
    survey_status,
    case
      when survey_status in ('sent', 'submitted') then survey_questions
      else '[]'::jsonb
    end as survey_questions,
    delivery_status,
    -- Only artifacts for steps the studio has actually pushed. A row could
    -- carry an artifact for a stop later switched off, and shipping it would
    -- show a client work that had been withdrawn.
    coalesce(
      (
        select jsonb_object_agg(key, value)
        from jsonb_each(coalesce(review_artifacts, '{}'::jsonb))
        where coalesce(step_visibility -> key, 'false'::jsonb) = 'true'::jsonb
      ),
      '{}'::jsonb
    ) as review_artifacts
  from public.client_portals
  where id = portal_id
    and revoked_at is null
    and (expires_at is null or expires_at > now());
$function$;

revoke all on function public.get_client_portal(uuid) from public;
grant execute on function public.get_client_portal(uuid) to anon, authenticated;

-- ── The approval records WHICH artifact ──
--
-- Carried forward from 20260801120000 with every gate intact: the status
-- allowlist, the step-id shape check, the step-id allowlist, the live-link
-- gate, the coalesce visibility fix from 20260728024000, the 5-minute rate
-- limit, and the audit-trail insert. The only change is that the recorded row
-- now carries the fingerprint of the artifact that was on screen.
--
-- The fingerprint is READ FROM THE ROW, never taken from the caller. An
-- approval whose version identity came from the client would be a claim about
-- itself; this one is a fact the server observed.
--
-- A step with no artifact stamped cannot be responded to at all. That is the
-- whole rule in one predicate: no artifact, no approval, because there was
-- nothing to look at.
create or replace function public.respond_client_portal_step(
  portal_id_in uuid,
  step_id_in text,
  status_in text,
  note_in text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  vis jsonb;
  arts jsonb;
  step_ok boolean;
  recent_count int;
  shown jsonb;
  fingerprint text;
begin
  if status_in not in ('approved', 'changes_requested') then
    return false;
  end if;
  if step_id_in is null or step_id_in !~ '^[a-z0-9_-]{1,40}$' then
    return false;
  end if;
  if step_id_in not in (
    'define', 'research', 'ideate', 'sketch', 'design', 'review', 'deliver'
  ) then
    return false;
  end if;

  -- Link must still be live (#19).
  select step_visibility, review_artifacts into vis, arts
  from public.client_portals
  where id = portal_id_in
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  if vis is null then
    return false;
  end if;

  -- Missing/false key = not visible (coalesce fix).
  step_ok := coalesce(vis -> step_id_in, 'false'::jsonb) = 'true'::jsonb;
  if not step_ok then
    return false;
  end if;

  -- G10.5, enforced where it cannot be routed around: an approval needs
  -- something that was shown. No artifact on the row means the client was
  -- looking at a label, which is the defect this migration exists to end.
  shown := coalesce(arts, '{}'::jsonb) -> step_id_in;
  if shown is null then
    return false;
  end if;
  fingerprint := coalesce(shown ->> 'fingerprint', '');
  if fingerprint = '' then
    return false;
  end if;

  -- Rate limit (#8): at most 20 responses per portal per 5 minutes.
  select count(*) into recent_count
  from public.client_portal_step_events
  where portal_id = portal_id_in
    and created_at > now() - interval '5 minutes';
  if recent_count >= 20 then
    return false;
  end if;

  update public.client_portals
  set step_status = jsonb_set(
        coalesce(step_status, '{}'::jsonb),
        array[step_id_in],
        jsonb_build_object(
          'status', status_in,
          'note', left(coalesce(note_in, ''), 2000),
          -- WHICH artifact. Server-observed, not client-supplied.
          'artifact', fingerprint
        )
      ),
      updated_at = now()
  where id = portal_id_in;

  insert into public.client_portal_step_events (portal_id, step_id, status)
  values (portal_id_in, step_id_in, status_in);

  return true;
end;
$$;

revoke all on function public.respond_client_portal_step(uuid, text, text, text) from public;
grant execute on function public.respond_client_portal_step(uuid, text, text, text) to anon, authenticated;
