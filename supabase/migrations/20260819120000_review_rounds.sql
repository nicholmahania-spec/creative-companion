-- Phase 6 — Approval + Client Portal.
--
-- WHAT WAS WRONG, IN ONE SENTENCE: a client's answer was stored with
-- `jsonb_set` against a step id, so the second answer destroyed the first and
-- the app could not say what had been approved, when, or against which version.
--
-- `CLAUDE.md` §17 asked for the opposite in as many words — "maintain version
-- history rather than simply replacing old files" — and `docs/ADDITIONS.md` 5.5
-- has carried the gap as PART since it was written. This migration is that fix.
--
-- TWO TABLES, AND THE SPLIT BETWEEN THEM IS THE WHOLE MODEL.
--
--   client_portal_review_rounds      WHAT was shown, and when. Opened by the
--                                    studio, one per (portal, step, target).
--                                    Mutable in exactly one direction:
--                                    open → superseded.
--
--   client_portal_review_responses   WHAT the client said. Append-only. There
--                                    is no UPDATE path and no unique key on
--                                    round_id: a client may answer twice, and
--                                    both answers survive. The current verdict
--                                    is the latest row, never the only row.
--
-- `client_portals.step_status` SURVIVES AS A DERIVED MIRROR. It is written in
-- the same statement as the response insert so it cannot disagree with its
-- source, and every existing reader (the portal page, the studio panel, the
-- inbox) keeps working untouched. It is no longer the record.
--
-- WHAT THIS DOES NOT DO. It does not touch delivery_pack, delivery_status, or
-- any delivery gate — VERIFIED ≠ DELIVERED is unchanged. It does not create a
-- Document Version: an approval is a decision ABOUT a frozen composition, and
-- minting a second Version whose contents equal the first would be the
-- duplicate-source-of-truth defect this codebase has spent six PRs removing.
-- The `changesRequested` / `approved` / `delivered` freeze events stay
-- declared and unwritten.

-- ── The rounds ──
--
-- `target_ref` is the identity of the thing shown: a Presentation Document
-- Version id for `ideate`, the review artifact fingerprint for `design`. It is
-- read from the portal row by the server on every write and never accepted
-- from a caller, which is what makes a stored response evidence rather than a
-- claim about itself.
create table if not exists public.client_portal_review_rounds (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.client_portals(id) on delete cascade,
  step_id text not null,
  unit text not null,
  target_kind text not null,
  target_ref text not null,
  round_no int not null,
  sent_at timestamptz not null default now(),
  status text not null default 'open',
  superseded_at timestamptz
);

-- One open round per (portal, step). Two would make "which round am I on"
-- unanswerable, which is the question this table exists to answer.
create unique index if not exists client_portal_review_rounds_one_open
  on public.client_portal_review_rounds (portal_id, step_id)
  where status = 'open';

create index if not exists client_portal_review_rounds_lookup
  on public.client_portal_review_rounds (portal_id, step_id, round_no desc);

-- ── The responses ──
--
-- `seq` is the ordering authority. `created_at` is a timestamp and two rows can
-- share one; "latest wins" has to be decided by something strictly monotonic
-- that the client cannot influence, so it is decided by the sequence the
-- database itself assigns.
create table if not exists public.client_portal_review_responses (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  round_id uuid not null references public.client_portal_review_rounds(id) on delete cascade,
  verdict text not null,
  note text not null default '',
  -- The Direction the client leans toward, for `ideate` only. FEEDBACK, not a
  -- decision: `logoConcepts[].chosen` remains the designer's sole mark call and
  -- nothing here writes it.
  preferred_ref text,
  -- Copied from the round by the server. Present on the row so a response is
  -- readable as evidence without a join, and so a later change to the round
  -- cannot rewrite what a past response was answering.
  target_ref text not null,
  actor text not null default 'client',
  created_at timestamptz not null default now()
);

create index if not exists client_portal_review_responses_by_round
  on public.client_portal_review_responses (round_id, seq desc);

alter table public.client_portal_review_rounds enable row level security;
alter table public.client_portal_review_responses enable row level security;

-- Supabase's default privileges grant anon full DML on every new public table,
-- and RLS is not the whole answer: TRUNCATE ignores row-level security
-- entirely, so that one grant would make both policies below moot. Not
-- reachable through PostgREST today; costs nothing to drop. Same treatment as
-- 20260805120000, 20260805130000, 20260805140000 and 20260806120000 — this is
-- the established pattern for a new table here, and an append-only approval log
-- is the last thing that should be droppable by the role the public portal
-- runs as.
revoke all on public.client_portal_review_rounds from anon;
revoke all on public.client_portal_review_responses from anon;
revoke truncate on public.client_portal_review_rounds from authenticated;
revoke truncate on public.client_portal_review_responses from authenticated;

-- SELECT ONLY for the studio, and this is what actually holds the append-only
-- claim up. RLS already default-denies an UPDATE or DELETE here, because these
-- tables carry SELECT policies and nothing else — but that makes the guarantee
-- rest on the ABSENCE of a policy, which a later migration could add for some
-- unrelated reason without anyone connecting the two. Taking the privilege away
-- makes it rest on the absence of a grant instead. Both writers are SECURITY
-- DEFINER and run as the definer, so neither role needs INSERT.
revoke insert, update, delete on public.client_portal_review_rounds from authenticated;
revoke insert, update, delete on public.client_portal_review_responses from authenticated;

-- Owner may read the review history for their own portals. Anon never touches
-- either table directly — the SECURITY DEFINER functions below are the only
-- write path, and the client reads its own verdict through the step_status
-- mirror that `get_client_portal` already returns.
drop policy if exists "Owners read own review rounds" on public.client_portal_review_rounds;
create policy "Owners read own review rounds"
  on public.client_portal_review_rounds
  for select
  using (
    exists (
      select 1 from public.client_portals p
      where p.id = client_portal_review_rounds.portal_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners read own review responses" on public.client_portal_review_responses;
create policy "Owners read own review responses"
  on public.client_portal_review_responses
  for select
  using (
    exists (
      select 1
      from public.client_portal_review_rounds r
      join public.client_portals p on p.id = r.portal_id
      where r.id = client_portal_review_responses.round_id
        and p.owner_id = auth.uid()
    )
  );

-- ── Opening a round: the studio side ──
--
-- Granted to `authenticated` ONLY. This is the publication boundary: a client
-- holding the link may answer what they were shown and may never decide what
-- they are shown.
--
-- Showing the same target twice is not a new round. Showing a different target
-- supersedes the old round and opens the next one, in one statement pair inside
-- one function call, so there is never a moment with two open rounds or none.
create or replace function public.open_client_portal_review_round(
  portal_id_in uuid,
  step_id_in text,
  unit_in text,
  target_kind_in text,
  target_ref_in text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  owns boolean;
  stamped text;
  existing record;
  next_no int;
  new_id uuid;
begin
  if step_id_in is null or step_id_in !~ '^[a-z0-9_-]{1,40}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_step');
  end if;
  if step_id_in not in (
    'define', 'research', 'ideate', 'sketch', 'design', 'review', 'deliver'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'bad_step');
  end if;
  if unit_in is null or unit_in not in ('ideate', 'design') then
    return jsonb_build_object('ok', false, 'reason', 'bad_unit');
  end if;
  if target_kind_in is null
     or target_kind_in not in ('presentationVersion', 'identityArtifact') then
    return jsonb_build_object('ok', false, 'reason', 'bad_target');
  end if;
  if target_ref_in is null or length(trim(target_ref_in)) = 0
     or length(target_ref_in) > 400 then
    return jsonb_build_object('ok', false, 'reason', 'bad_target');
  end if;

  -- The studio boundary. A live link is not enough here; an account that owns
  -- this portal is. The stamped fingerprint comes back in the same read.
  select true, coalesce(p.review_artifacts -> step_id_in ->> 'fingerprint', '')
  into owns, stamped
  from public.client_portals p
  where p.id = portal_id_in and p.owner_id = auth.uid();
  if owns is null then
    return jsonb_build_object('ok', false, 'reason', 'not_owner');
  end if;

  -- THE TARGET IS CHECKED AGAINST WHAT IS ACTUALLY STAMPED, so the header's
  -- claim above — that a target is never taken on a caller's word — is true of
  -- this function too. It was not, and the cost was not a security hole (the
  -- ownership gate holds) but a trap: a round opened against a target no
  -- artifact carries makes every client response fail `stale_round`, which the
  -- client reads as "your designer has sent a newer version — refresh", and
  -- refreshing never helps.
  if stamped = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_artifact');
  end if;
  if target_ref_in <> stamped then
    return jsonb_build_object('ok', false, 'reason', 'bad_target');
  end if;

  select * into existing
  from public.client_portal_review_rounds
  where portal_id = portal_id_in and step_id = step_id_in and status = 'open';

  if existing.id is not null and existing.target_ref = target_ref_in then
    return jsonb_build_object(
      'ok', true, 'roundId', existing.id, 'roundNo', existing.round_no, 'reused', true
    );
  end if;

  if existing.id is not null then
    update public.client_portal_review_rounds
    set status = 'superseded', superseded_at = now()
    where id = existing.id;
  end if;

  select coalesce(max(round_no), 0) + 1 into next_no
  from public.client_portal_review_rounds
  where portal_id = portal_id_in and step_id = step_id_in;

  -- The partial unique index is what actually guarantees one open round, and it
  -- holds. Left unhandled it would surface as a raised unique_violation rather
  -- than a refusal — a studio double-clicking Show would get a 500 where the
  -- contract promises a reason. `next_no` is a non-atomic max()+1 for the same
  -- reason and is covered by the same index.
  begin
    insert into public.client_portal_review_rounds
      (portal_id, step_id, unit, target_kind, target_ref, round_no)
    values
      (portal_id_in, step_id_in, unit_in, target_kind_in, target_ref_in, next_no)
    returning id into new_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'concurrent_open');
  end;

  return jsonb_build_object('ok', true, 'roundId', new_id, 'roundNo', next_no, 'reused', false);
end;
$function$;

revoke all on function public.open_client_portal_review_round(uuid, text, text, text, text) from public;
grant execute on function public.open_client_portal_review_round(uuid, text, text, text, text) to authenticated;

-- ── Responding: the client side ──
--
-- DROP first, not `create or replace` — this changes the return type from
-- boolean to jsonb and Postgres refuses that in place. The same trap is
-- recorded in 20260728170000 and 20260806120000 for OUT columns.
--
-- WHY THE RETURN TYPE CHANGES. The old function answered every one of its nine
-- refusals with a bare `false`, so the portal could not tell "your link
-- expired" from "there is nothing here to approve" and said the same unhelpful
-- sentence for both. Phase 6 adds three more refusal paths, and stacking them
-- on one undifferentiated `false` would make the client surface worse. The
-- reason is a short machine token; `clientFacingError.js` owns the wording.
--
-- EVERY GATE FROM 20260812120000 IS CARRIED FORWARD: the status allowlist, the
-- step-id shape check, the step-id allowlist, the live-link gate, the coalesce
-- visibility fix from 20260728024000, the artifact-must-exist rule, the
-- server-observed fingerprint, the 5-minute rate limit, and the audit insert.
-- `portalRpcGates.test.js` asserts each of them against this definition,
-- because it is now the last one.
--
-- WHAT IS NEW: a response needs an OPEN ROUND whose target matches what is
-- currently stamped. That single predicate is what makes a response to
-- withdrawn or superseded work impossible rather than merely unlikely.
drop function if exists public.respond_client_portal_step(uuid, text, text, text);

create function public.respond_client_portal_step(
  portal_id_in uuid,
  step_id_in text,
  status_in text,
  note_in text,
  preferred_ref_in text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  vis jsonb;
  arts jsonb;
  shown jsonb;
  step_ok boolean;
  fingerprint text;
  unit_name text;
  clean_note text;
  clean_pref text;
  rnd record;
  latest record;
  recent_count int;
  known_direction boolean;
begin
  -- `null not in (...)` evaluates to NULL, and plpgsql IF treats NULL as
  -- false — so a null argument walks straight through an allowlist written
  -- without this clause and dies later at a not-null constraint, returning a
  -- 500 whose DETAIL names the table, its columns and the row being written.
  -- The step check below has always had the null test; these did not.
  if status_in is null or status_in not in ('approved', 'changes_requested') then
    return jsonb_build_object('ok', false, 'reason', 'bad_status');
  end if;
  if step_id_in is null or step_id_in !~ '^[a-z0-9_-]{1,40}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_step');
  end if;
  if step_id_in not in (
    'define', 'research', 'ideate', 'sketch', 'design', 'review', 'deliver'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'bad_step');
  end if;

  -- Link must still be live (#19).
  select step_visibility, review_artifacts into vis, arts
  from public.client_portals
  where id = portal_id_in
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  if vis is null then
    return jsonb_build_object('ok', false, 'reason', 'link_dead');
  end if;

  -- Missing/false key = not visible (coalesce fix, 20260728024000). Kept in
  -- the exact shape that migration established, positive test and all: it is
  -- the line a rewrite lost once, and portalRpcGates.test.js matches on it.
  step_ok := coalesce(vis -> step_id_in, 'false'::jsonb) = 'true'::jsonb;
  if not step_ok then
    return jsonb_build_object('ok', false, 'reason', 'not_shown');
  end if;

  -- G10.5, enforced where it cannot be routed around: a response needs
  -- something that was shown. No artifact on the row means the client was
  -- looking at a label, which is the defect 20260812120000 exists to end.
  shown := coalesce(arts, '{}'::jsonb) -> step_id_in;
  if shown is null then
    return jsonb_build_object('ok', false, 'reason', 'no_artifact');
  end if;
  fingerprint := coalesce(shown ->> 'fingerprint', '');
  if fingerprint = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_artifact');
  end if;

  -- A presentation of options is not a thing to say yes to. The portal hides
  -- the button; this is the half a caller cannot skip.
  unit_name := coalesce(shown ->> 'unit', '');
  if unit_name = 'ideate' and status_in = 'approved' then
    return jsonb_build_object('ok', false, 'reason', 'not_approvable');
  end if;

  -- The open round IS the permission to answer. A superseded round has no
  -- row here, so a response to withdrawn work fails on this predicate rather
  -- than landing quietly against stale work.
  -- FOR UPDATE, and the reason is the idempotency check further down. That
  -- check is a read followed by a write, and two identical requests that
  -- interleave between the two both see "no matching latest" and both append —
  -- so a double tap lands twice in a log whose whole job is to say what the
  -- client decided. Locking the round serialises responses to it.
  select * into rnd
  from public.client_portal_review_rounds
  where portal_id = portal_id_in and step_id = step_id_in and status = 'open'
  for update;
  if rnd.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_open_round');
  end if;
  if rnd.target_ref is distinct from fingerprint then
    return jsonb_build_object('ok', false, 'reason', 'stale_round');
  end if;

  clean_note := left(coalesce(note_in, ''), 2000);
  clean_pref := nullif(trim(coalesce(preferred_ref_in, '')), '');

  if clean_pref is not null then
    if unit_name <> 'ideate' then
      return jsonb_build_object('ok', false, 'reason', 'preference_not_allowed');
    end if;
    -- Validated against the artifact that was actually shown, so a client
    -- cannot name a Direction that was withheld from this send.
    select exists (
      select 1
      -- `coalesce` catches SQL NULL but not JSON `null`, and not an object.
      -- Both raise rather than returning no rows, which would turn an intended
      -- `unknown_direction` refusal into an unhandled 500 on a public endpoint.
      from jsonb_array_elements(
        case
          when jsonb_typeof(shown -> 'payload' -> 'items') = 'array'
            then shown -> 'payload' -> 'items'
          else '[]'::jsonb
        end
      ) as it
      where it ->> 'sourceId' = clean_pref
    ) into known_direction;
    if not known_direction then
      return jsonb_build_object('ok', false, 'reason', 'unknown_direction');
    end if;
  end if;

  -- Rate limit (#8): at most 20 responses per portal per 5 minutes.
  select count(*) into recent_count
  from public.client_portal_step_events
  where portal_id = portal_id_in
    and created_at > now() - interval '5 minutes';
  if recent_count >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;

  -- Idempotency. A retried request, a double tap, or a flaky connection is one
  -- decision, not two — so an identical repeat of the round's latest answer
  -- succeeds and writes nothing. Anything different is a real change of mind
  -- and appends, because the client is allowed to have one.
  select * into latest
  from public.client_portal_review_responses
  where round_id = rnd.id
  order by seq desc
  limit 1;

  if latest.id is not null
     and latest.verdict = status_in
     and latest.note = clean_note
     and latest.preferred_ref is not distinct from clean_pref
  then
    return jsonb_build_object('ok', true, 'duplicate', true, 'roundNo', rnd.round_no);
  end if;

  insert into public.client_portal_review_responses
    (round_id, verdict, note, preferred_ref, target_ref, actor)
  values
    (rnd.id, status_in, clean_note, clean_pref, rnd.target_ref, 'client');

  -- The mirror. Written in the same transaction as the response it reflects,
  -- and — since the round is locked above — after any concurrent response has
  -- finished, so the two agree. Being in one transaction is not on its own
  -- enough to guarantee that, which an earlier version of this comment claimed:
  -- `seq` is assigned at the INSERT, before this row lock is taken, so without
  -- the lock commit order could invert and leave the mirror showing a verdict
  -- that is not the highest-`seq` response. Every existing reader keeps
  -- working; none of them is the record any more.
  update public.client_portals
  set step_status = jsonb_set(
        coalesce(step_status, '{}'::jsonb),
        array[step_id_in],
        jsonb_build_object(
          'status', status_in,
          'note', clean_note,
          -- WHICH artifact. Server-observed, not client-supplied.
          'artifact', fingerprint,
          'preferredRef', coalesce(clean_pref, ''),
          'roundNo', rnd.round_no
        )
      ),
      updated_at = now()
  where id = portal_id_in;

  insert into public.client_portal_step_events (portal_id, step_id, status)
  values (portal_id_in, step_id_in, status_in);

  return jsonb_build_object('ok', true, 'duplicate', false, 'roundNo', rnd.round_no);
end;
$function$;

revoke all on function public.respond_client_portal_step(uuid, text, text, text, text) from public;
grant execute on function public.respond_client_portal_step(uuid, text, text, text, text) to anon, authenticated;
