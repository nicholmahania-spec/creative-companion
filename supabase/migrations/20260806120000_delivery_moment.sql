-- Phase 8 — the delivery moment.
--
-- Handing over a brand is the emotional peak of the engagement and the moment
-- referrals get decided. Today it is a status flip: the designer downloads a
-- PDF and emails it. This gives the handover a state machine, a designer's
-- note, a dedicated reveal page for the client, a reaction the client can send
-- back, and — the part the designer actually cares about — a record of the
-- moment the client opened it.
--
-- On client_portals rather than a new table, for the same reason the survey
-- landed here (see 20260728170000): the client already has this link. A
-- delivery that arrives on a fourth id is a fourth "which link was that",
-- and the portal id is the one they have bookmarked.
--
-- delivery_status: 'not_delivered' → 'delivered'. There is deliberately no
-- 'preview' value: the preview state is the designer looking at what the
-- client will see BEFORE anything is written server-side, so it lives in the
-- studio UI. A preview that had to round-trip to the server would be a
-- publish you can't take back, which is precisely what it exists to avoid.

alter table public.client_portals
  add column if not exists delivery_status text not null default 'not_delivered',
  add column if not exists delivery_note text,
  add column if not exists delivery_pack jsonb,
  add column if not exists delivered_at timestamptz,
  -- FIRST view only, never the latest. "They opened it" is an event that
  -- happened once; overwriting it on every subsequent visit turns the one
  -- fact the designer wants into a last-seen counter nobody asked for.
  add column if not exists delivery_viewed_at timestamptz,
  add column if not exists delivery_reaction text,
  add column if not exists delivery_reaction_at timestamptz;

-- ── Client-visible portal payload learns that a delivery exists ──
--
-- Only the status, never the note or the pack: the portal card's job is to say
-- "your brand book is ready" and point at /d/<id>. The reveal page is where the
-- payload is fetched, so an unopened delivery is not smuggled into a page the
-- client may already have open.
--
-- DROP first, not `create or replace` — Postgres refuses to change an existing
-- function's OUT columns, and this gains one (see 20260728170000 for the same
-- trap).
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
  delivery_status text
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
    delivery_status
  from public.client_portals
  where id = portal_id
    and revoked_at is null
    and (expires_at is null or expires_at > now());
$function$;

revoke all on function public.get_client_portal(uuid) from public;
grant execute on function public.get_client_portal(uuid) to anon, authenticated;

-- ── The reveal payload (anon) ──
--
-- Returns nothing at all until the designer has actually delivered, so the
-- reveal URL cannot be used to watch a book being assembled. Same live-link
-- gate as every other anon read (#19).
create or replace function public.get_brand_delivery(portal_id uuid)
returns table(
  client_name text,
  delivery_note text,
  delivery_pack jsonb,
  delivered_at timestamptz,
  delivery_reaction text
)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    client_name,
    delivery_note,
    delivery_pack,
    delivered_at,
    delivery_reaction
  from public.client_portals
  where id = portal_id
    and delivery_status = 'delivered'
    and revoked_at is null
    and (expires_at is null or expires_at > now());
$function$;

revoke all on function public.get_brand_delivery(uuid) from public;
grant execute on function public.get_brand_delivery(uuid) to anon, authenticated;

-- ── "They opened it" (anon) ──
--
-- Write-once by the WHERE clause, not by reading then writing: a client
-- opening the page twice in quick succession would otherwise race and the
-- second write would move the timestamp. `delivery_viewed_at is null` in the
-- update predicate makes the second call a no-op at the storage layer, so
-- there is nothing to race over.
--
-- Returns void-ish (boolean) and is deliberately unauthenticated-safe: the
-- worst a link holder can do is stamp a time that is already true — they are
-- holding the link, which is what the timestamp claims.
create or replace function public.mark_brand_delivery_viewed(portal_id_in uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count int;
begin
  update public.client_portals
  set delivery_viewed_at = now()
  where id = portal_id_in
    and delivery_status = 'delivered'
    and delivery_viewed_at is null
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on function public.mark_brand_delivery_viewed(uuid) from public;
grant execute on function public.mark_brand_delivery_viewed(uuid) to anon, authenticated;

-- ── The reaction (anon, single-use) ──
--
-- RULE (see 20260728023723): a single atomic UPDATE ... WHERE <status gate>,
-- then GET DIAGNOSTICS. Never SELECT-then-UPDATE — two concurrent submits both
-- pass the check and the second silently overwrites the first.
--
-- Single-use like the form and the survey: this is a reaction to a reveal, not
-- a chat. The portal's message thread is still there and still open, and that
-- is where a conversation belongs.
create or replace function public.submit_brand_delivery_reaction(
  portal_id_in uuid,
  body_in text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count int;
  trimmed text;
begin
  trimmed := btrim(coalesce(body_in, ''));
  if trimmed = '' then
    return false;
  end if;

  update public.client_portals
  set delivery_reaction = left(trimmed, 2000),
      delivery_reaction_at = now(),
      updated_at = now()
  where id = portal_id_in
    and delivery_status = 'delivered'
    and delivery_reaction is null
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on function public.submit_brand_delivery_reaction(uuid, text) from public;
grant execute on function public.submit_brand_delivery_reaction(uuid, text) to anon, authenticated;
