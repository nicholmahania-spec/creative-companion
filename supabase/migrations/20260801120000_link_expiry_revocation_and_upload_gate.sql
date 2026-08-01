-- Security cluster from the full-app audit: #8 (rate-limit client approvals),
-- #9 (gate anonymous uploads on open state), #19 (link expiry + revocation).
--
-- Root problem behind #8/#9/#19: a discovery-share / client-portal id is a
-- permanent, unguessable credential. Every anon RPC authorized purely on
-- "row exists by id", with no way to invalidate a leaked/forwarded link short
-- of deleting the row (which also destroys the client's answers, chat and
-- approval history). This adds a revoke/expire lifecycle and threads a single
-- "is this link still live?" check through every anonymous surface.
--
-- Deliberately NOT done: any automatic expiry. REVOCATION is the primary,
-- owner-driven kill switch (a leaked/forwarded link can be killed without
-- deleting the row and losing the client's answers/chat/approvals). expires_at
-- is fully ENFORCED below if ever set, but the app does not auto-stamp it and
-- nothing is backfilled: a client link silently dying mid-project is a worse
-- failure than the risk auto-expiry would mitigate — especially for an owner
-- who is time-blind by their own account. Expiry is left as an available
-- lever, off by default; revoked_at is the tool that actually closes #19.

-- ===== #19: lifecycle columns on both public-link tables =====
alter table public.discovery_shares
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz;

alter table public.client_portals
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz;

-- ===== #19: reads — a revoked or expired link reads as not-found =====

create or replace function public.get_discovery_share(share_id uuid)
returns table(client_name text, answers jsonb, status text)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select client_name, answers, status
  from public.discovery_shares
  where id = share_id
    and revoked_at is null
    and (expires_at is null or expires_at > now());
$function$;

create or replace function public.get_client_portal(portal_id uuid)
returns table(client_name text, detective_answers jsonb, step_visibility jsonb, step_status jsonb, form_status text, submitted_answers jsonb, survey_kind text, survey_status text, survey_questions jsonb)
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
    end as survey_questions
  from public.client_portals
  where id = portal_id
    and revoked_at is null
    and (expires_at is null or expires_at > now());
$function$;

-- A leaked id must not keep reading the whole studio<->client conversation
-- after the link is killed.
create or replace function public.get_client_portal_messages(portal_id_in uuid)
returns setof client_portal_messages
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select m.*
  from public.client_portal_messages m
  where m.portal_id = portal_id_in
    and exists (
      select 1 from public.client_portals p
      where p.id = portal_id_in
        and p.revoked_at is null
        and (p.expires_at is null or p.expires_at > now())
    )
  order by m.created_at asc;
$function$;

-- ===== #19 + #8: client approvals — live-link gate, and a rate limit =====
-- Also folds in the coalesce NULL-handling fix (the live function still had the
-- pre-fix `(vis ->> step_id_in) in ('true','1')` form, which treated a missing
-- key as pass-through). A per-portal audit row per response gives us a real
-- sliding-window rate limit (mirroring post_client_portal_message) and, as a
-- bonus, a trail of who flipped what when.

create table if not exists public.client_portal_step_events (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.client_portals(id) on delete cascade,
  step_id text not null,
  status text not null,
  created_at timestamptz not null default now()
);

alter table public.client_portal_step_events enable row level security;

-- Owner may read the trail for their own portals; anon never touches it
-- directly (the SECURITY DEFINER function writes it).
drop policy if exists "Owners read own step events" on public.client_portal_step_events;
create policy "Owners read own step events"
  on public.client_portal_step_events
  for select
  using (
    exists (
      select 1 from public.client_portals p
      where p.id = client_portal_step_events.portal_id
        and p.owner_id = auth.uid()
    )
  );

create index if not exists client_portal_step_events_portal_time
  on public.client_portal_step_events (portal_id, created_at desc);

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
  step_ok boolean;
  recent_count int;
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
  select step_visibility into vis
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

  -- Rate limit (#8): mirror the message limit — at most 20 responses per
  -- portal per 5 minutes. Stops a link holder silently flipping decisions in a
  -- loop; a real client approves a handful of steps, nowhere near this.
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
          'note', left(coalesce(note_in, ''), 2000)
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

-- ===== #19: writes — a revoked/expired link cannot submit either =====

create or replace function public.submit_client_portal_form(portal_id_in uuid, submitted jsonb)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  updated_count int;
begin
  if pg_column_size(coalesce(submitted, '{}'::jsonb)) > 200000 then
    return false;
  end if;
  update public.client_portals
  set submitted_answers = submitted,
      form_status = 'submitted',
      updated_at = now()
  where id = portal_id_in
    and form_status is not null
    and form_status not in ('submitted', 'not_sent')
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$function$;

create or replace function public.submit_client_portal_survey(portal_id_in uuid, submitted jsonb)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  updated_count int;
begin
  if pg_column_size(coalesce(submitted, '{}'::jsonb)) > 200000 then
    return false;
  end if;
  update public.client_portals
  set survey_answers = submitted,
      survey_status = 'submitted',
      updated_at = now()
  where id = portal_id_in
    and survey_status = 'sent'
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$function$;

create or replace function public.post_client_portal_message(portal_id_in uuid, body_in text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  cleaned text;
  recent_count int;
begin
  cleaned := left(trim(coalesce(body_in, '')), 2000);
  if cleaned = '' then
    return false;
  end if;
  if not exists (
    select 1 from public.client_portals
    where id = portal_id_in
      and revoked_at is null
      and (expires_at is null or expires_at > now())
  ) then
    return false;
  end if;
  select count(*) into recent_count
  from public.client_portal_messages
  where portal_id = portal_id_in
    and sender = 'client'
    and created_at > now() - interval '5 minutes';
  if recent_count >= 20 then
    return false;
  end if;
  insert into public.client_portal_messages (portal_id, sender, body)
  values (portal_id_in, 'client', cleaned);
  return true;
end;
$function$;

-- ===== #9: gate anonymous uploads on OPEN state (was deliberately deferred) =====
-- Now authorizes a write only when the target share/portal is still live AND
-- still accepting input — a submitted or not-yet-sent form no longer accepts
-- attachments, and a revoked/expired link accepts nothing. Kept lenient on the
-- accepting window (form 'pending'/'sent') so a client attaching a photo mid-
-- fill is never rejected; the per-folder ceiling and mime allow-list are
-- unchanged.
create or replace function public.is_client_upload_target(folder text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  target uuid;
  existing integer;
  open_target boolean;
begin
  if folder is null or folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  target := folder::uuid;

  open_target := (
    exists (
      select 1 from public.discovery_shares s
      where s.id = target
        and s.status = 'pending'
        and s.revoked_at is null
        and (s.expires_at is null or s.expires_at > now())
    )
    or exists (
      select 1 from public.client_portals p
      where p.id = target
        and p.form_status is not null
        and p.form_status not in ('submitted', 'not_sent')
        and p.revoked_at is null
        and (p.expires_at is null or p.expires_at > now())
    )
  );
  if not open_target then
    return false;
  end if;

  select count(*) into existing
  from storage.objects o
  where o.bucket_id = 'client-uploads'
    and (storage.foldername(o.name))[1] = folder;

  return existing < 25;
end;
$function$;

revoke all on function public.is_client_upload_target(text) from public;
grant execute on function public.is_client_upload_target(text) to anon, authenticated;
