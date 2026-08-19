-- Creative Companion · Supabase schema
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Then enable Email auth: Authentication → Providers → Email

-- One workspace blob per user (projects, tasks, pins, prefs).
-- Matches the app's exportAllData() shape for simple sync.

create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Forms table for storing form submissions (matches formApi.js)
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  form_name text not null,
  form_data jsonb not null,
  project_id uuid,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forms_owner_id_idx on public.forms (owner_id);
create index if not exists forms_project_id_idx on public.forms (project_id);
create index if not exists forms_submitted_at_idx on public.forms (submitted_at desc);

-- Updated at trigger for forms
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists forms_set_updated_at on public.forms;
create trigger forms_set_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();

-- Row level security for forms (owner, not project_id)
alter table public.forms enable row level security;

drop policy if exists "forms_select_own" on public.forms;
drop policy if exists "forms_insert_own" on public.forms;
drop policy if exists "forms_update_own" on public.forms;
drop policy if exists "forms_delete_own" on public.forms;

create policy "forms_select_own" on public.forms for select
  using (auth.uid() = owner_id);

create policy "forms_insert_own" on public.forms for insert
  with check (auth.uid() = owner_id);

create policy "forms_update_own" on public.forms for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "forms_delete_own" on public.forms for delete
  using (auth.uid() = owner_id);

create index if not exists user_workspaces_updated_at_idx
  on public.user_workspaces (updated_at desc);

alter table public.user_workspaces enable row level security;

-- Drop old policies if re-running
drop policy if exists "workspace_select_own" on public.user_workspaces;
drop policy if exists "workspace_insert_own" on public.user_workspaces;
drop policy if exists "workspace_update_own" on public.user_workspaces;
drop policy if exists "workspace_delete_own" on public.user_workspaces;

create policy "workspace_select_own"
  on public.user_workspaces for select
  using (auth.uid() = user_id);

create policy "workspace_insert_own"
  on public.user_workspaces for insert
  with check (auth.uid() = user_id);

create policy "workspace_update_own"
  on public.user_workspaces for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workspace_delete_own"
  on public.user_workspaces for delete
  using (auth.uid() = user_id);

-- Optional: keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_workspaces_set_updated_at on public.user_workspaces;
create trigger user_workspaces_set_updated_at
  before update on public.user_workspaces
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Client portal + discovery share
--
-- Transcribed from the live project (ref shzkqbtoepqqdkjgupry) — these were
-- applied by hand in the dashboard and were missing from this file, so the
-- database could not be rebuilt from the repo. Anon (client-facing) access is
-- only ever via the SECURITY DEFINER RPCs below; the anon role never touches
-- the tables directly.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.discovery_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_name text,
  project_local_id text,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

alter table public.discovery_shares enable row level security;

create policy "owner_full_access" on public.discovery_shares
  for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create table if not exists public.client_portals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_local_id text not null,
  client_name text,
  detective_answers jsonb not null default '{}'::jsonb,
  step_visibility jsonb not null default '{}'::jsonb,
  step_status jsonb not null default '{}'::jsonb,
  form_status text not null default 'not_sent',
  submitted_answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_portals enable row level security;

create policy "Owners can view own client portals" on public.client_portals
  for select using (auth.uid() = owner_id);

create policy "Owners can insert own client portals" on public.client_portals
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own client portals" on public.client_portals
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owners can delete own client portals" on public.client_portals
  for delete using (auth.uid() = owner_id);

create table if not exists public.client_portal_messages (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null,
  sender text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.client_portal_messages enable row level security;

create policy "Owners can view messages on own portals" on public.client_portal_messages
  for select using (
    auth.uid() = (select owner_id from public.client_portals where id = portal_id)
  );

create policy "Owners can insert studio messages on own portals" on public.client_portal_messages
  for insert with check (
    sender = 'studio'
    and auth.uid() = (select owner_id from public.client_portals where id = portal_id)
  );

-- ── Anon-facing RPCs (SECURITY DEFINER) ──

create or replace function public.get_discovery_share(share_id uuid)
returns table(client_name text, answers jsonb, status text)
language sql security definer set search_path to 'public'
as $$
  select client_name, answers, status
  from public.discovery_shares
  where id = share_id;
$$;

create or replace function public.submit_discovery_share(share_id uuid, submitted_answers jsonb)
returns boolean
language plpgsql security definer set search_path to 'public'
as $$
declare
  updated_count int;
begin
  update public.discovery_shares
  set answers = submitted_answers,
      status = 'submitted',
      submitted_at = now()
  where id = share_id and status = 'pending';
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.get_client_portal(portal_id uuid)
returns table(
  client_name text, detective_answers jsonb, step_visibility jsonb,
  step_status jsonb, form_status text, submitted_answers jsonb
)
language sql security definer set search_path to 'public'
as $$
  select client_name, detective_answers, step_visibility, step_status,
         form_status, submitted_answers
  from public.client_portals
  where id = portal_id;
$$;

create or replace function public.get_client_portal_messages(portal_id_in uuid)
returns setof public.client_portal_messages
language sql security definer set search_path to 'public'
as $$
  select * from public.client_portal_messages
  where portal_id = portal_id_in
  order by created_at asc;
$$;

create or replace function public.post_client_portal_message(portal_id_in uuid, body_in text)
returns boolean
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.client_portals where id = portal_id_in) then
    return false;
  end if;
  insert into public.client_portal_messages (portal_id, sender, body)
  values (portal_id_in, 'client', body_in);
  return true;
end;
$$;

create or replace function public.respond_client_portal_step(
  portal_id_in uuid, step_id_in text, status_in text, note_in text
)
returns boolean
language plpgsql security definer set search_path to 'public'
as $$
begin
  if status_in not in ('approved', 'changes_requested') then
    return false;
  end if;
  if not exists (select 1 from public.client_portals where id = portal_id_in) then
    return false;
  end if;
  update public.client_portals
  set step_status = jsonb_set(
        coalesce(step_status, '{}'::jsonb),
        array[step_id_in],
        jsonb_build_object('status', status_in, 'note', coalesce(note_in, ''))
      ),
      updated_at = now()
  where id = portal_id_in;
  return true;
end;
$$;

-- Atomic double-submit guard (same shape as submit_discovery_share).
-- Do NOT SELECT then UPDATE — concurrent submits race. See migration
-- 20260728023723_fix_submit_portal_form_race.sql.
create or replace function public.submit_client_portal_form(portal_id_in uuid, submitted jsonb)
returns boolean
language plpgsql security definer set search_path to 'public'
as $$
declare
  updated_count int;
begin
  update public.client_portals
  set submitted_answers = submitted, form_status = 'submitted', updated_at = now()
  where id = portal_id_in
    and form_status is not null
    and form_status not in ('submitted', 'not_sent');
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Client uploads (public brief attachments on /f and /c)
-- Anon INSERT only into folders named after an existing share or portal id.
-- ─────────────────────────────────────────────────────────────────────────

-- Kept in step with 20260731130000_bound_client_uploads.sql. The parameter is
-- `folder`, not `folder_id` — this file said `folder_id` while live said
-- `folder`, which is the kind of drift that makes schema.sql untrustworthy as
-- a record.
create or replace function public.is_client_upload_target(folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  target uuid;
  existing integer;
begin
  -- Reject non-UUID folder names before cast (clean false, not 500)
  if folder is null
     or folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  target := folder::uuid;

  if not (
    exists (select 1 from public.discovery_shares s where s.id = target)
    or exists (select 1 from public.client_portals p where p.id = target)
  ) then
    return false;
  end if;

  -- Per-folder ceiling: existence alone authorized unbounded writes forever,
  -- since no link ever expires. storage is not on the search_path, so the
  -- table and helper are schema-qualified.
  select count(*) into existing
  from storage.objects o
  where o.bucket_id = 'client-uploads'
    and (storage.foldername(o.name))[1] = folder;

  return existing < 25;
end;
$$;

revoke all on function public.is_client_upload_target(text) from public;
grant execute on function public.is_client_upload_target(text) to anon, authenticated;

-- Storage policies require the bucket to exist (create in dashboard or migration):
--   insert into storage.buckets (id, name, public) values ('client-uploads', 'client-uploads', true);
-- Then:
--   create policy "anon_insert_client_upload_folder" on storage.objects
--     for insert to anon
--     with check (
--       bucket_id = 'client-uploads'
--       and public.is_client_upload_target((storage.foldername(name))[1])
--     );
-- Do NOT add a broad SELECT policy here. `client-uploads` is a public bucket,
-- so object URLs are served through /storage/v1/object/public/... without
-- consulting RLS — a `using (bucket_id = 'client-uploads')` policy adds no
-- read capability the app needs, and does add the *list* capability, because
-- POST /storage/v1/object/list/<bucket> runs storage.search() as SECURITY
-- INVOKER. Folder names here are the share/portal UUIDs, which are the only
-- credential protecting /f/:shareId and /c/:portalId, so listing the bucket
-- handed out a directory of every live client link. That policy existed and
-- was removed in 20260731120000_close_storage_bucket_listing.sql — see that
-- migration for the full reasoning and for why workspace-images was
-- owner-scoped rather than dropped.

-- ── Hardened RPCs (search_path, grants, portal honesty) ──

create or replace function public.get_discovery_share(share_id uuid)
returns table(client_name text, answers jsonb, status text)
language sql security definer set search_path = public, pg_temp
as $$
  select client_name, answers, status
  from public.discovery_shares
  where id = share_id;
$$;

create or replace function public.submit_discovery_share(share_id uuid, submitted_answers jsonb)
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  updated_count int;
begin
  if pg_column_size(coalesce(submitted_answers, '{}'::jsonb)) > 200000 then
    return false;
  end if;
  update public.discovery_shares
  set answers = submitted_answers,
      status = 'submitted',
      submitted_at = now()
  where id = share_id and status = 'pending';
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

-- Redact detective_answers until form is visible to client (pending/submitted)
create or replace function public.get_client_portal(portal_id uuid)
returns table(
  client_name text, detective_answers jsonb, step_visibility jsonb,
  step_status jsonb, form_status text, submitted_answers jsonb
)
language sql security definer set search_path = public, pg_temp
as $$
  select
    client_name,
    case
      when form_status in ('pending', 'submitted') then detective_answers
      else '{}'::jsonb
    end as detective_answers,
    step_visibility,
    step_status,
    form_status,
    submitted_answers
  from public.client_portals
  where id = portal_id;
$$;

create or replace function public.get_client_portal_messages(portal_id_in uuid)
returns setof public.client_portal_messages
language sql security definer set search_path = public, pg_temp
as $$
  select * from public.client_portal_messages
  where portal_id = portal_id_in
  order by created_at asc;
$$;

create or replace function public.post_client_portal_message(portal_id_in uuid, body_in text)
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  cleaned text;
begin
  cleaned := left(trim(coalesce(body_in, '')), 2000);
  if cleaned = '' then
    return false;
  end if;
  if not exists (select 1 from public.client_portals where id = portal_id_in) then
    return false;
  end if;
  insert into public.client_portal_messages (portal_id, sender, body)
  values (portal_id_in, 'client', cleaned);
  return true;
end;
$$;

create or replace function public.respond_client_portal_step(
  portal_id_in uuid, step_id_in text, status_in text, note_in text
)
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  vis jsonb;
  step_ok boolean;
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
  select step_visibility into vis from public.client_portals where id = portal_id_in;
  if vis is null then
    return false;
  end if;
  step_ok :=
    (vis ->> step_id_in) in ('true', '1')
    or (vis -> step_id_in) = 'true'::jsonb;
  if not step_ok then
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
  return true;
end;
$$;

-- Atomic double-submit guard — copy submit_discovery_share shape.
-- WHERE form_status gates the write; row_count is the return. No SELECT-then-UPDATE.
create or replace function public.submit_client_portal_form(portal_id_in uuid, submitted jsonb)
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
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
    and form_status not in ('submitted', 'not_sent');
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on function public.get_discovery_share(uuid) from public;
grant execute on function public.get_discovery_share(uuid) to anon, authenticated;
revoke all on function public.submit_discovery_share(uuid, jsonb) from public;
grant execute on function public.submit_discovery_share(uuid, jsonb) to anon, authenticated;
revoke all on function public.get_client_portal(uuid) from public;
grant execute on function public.get_client_portal(uuid) to anon, authenticated;
revoke all on function public.get_client_portal_messages(uuid) from public;
grant execute on function public.get_client_portal_messages(uuid) to anon, authenticated;
revoke all on function public.post_client_portal_message(uuid, text) from public;
grant execute on function public.post_client_portal_message(uuid, text) to anon, authenticated;
revoke all on function public.respond_client_portal_step(uuid, text, text, text) from public;
grant execute on function public.respond_client_portal_step(uuid, text, text, text) to anon, authenticated;
revoke all on function public.submit_client_portal_form(uuid, jsonb) from public;
grant execute on function public.submit_client_portal_form(uuid, jsonb) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Phase 6 · Review rounds and append-only responses
--
-- The tables and their row-level security only. The functions — including the
-- redefined respond_client_portal_step — live in
-- supabase/migrations/20260819120000_review_rounds.sql and are NOT repeated
-- here.
--
-- BE CLEAR ABOUT WHAT THIS FILE IS. It is the base schema, and the migrations
-- run on top of it; it is not a complete rebuild on its own and has not been
-- for some time. The respond_client_portal_step above is the pre-hardening
-- 4-arg boolean version, predating the link-expiry, artifact and review-round
-- work. Running this file alone gives a database whose approval RPC has none
-- of those gates and returns the wrong type. Run the migrations after it.
--
-- Anon never touches either table. The only write path is the SECURITY DEFINER
-- function, and the only read is the owner, through these policies.
-- ─────────────────────────────────────────────────────────────────────────

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

create unique index if not exists client_portal_review_rounds_one_open
  on public.client_portal_review_rounds (portal_id, step_id)
  where status = 'open';

create table if not exists public.client_portal_review_responses (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  round_id uuid not null references public.client_portal_review_rounds(id) on delete cascade,
  verdict text not null,
  note text not null default '',
  preferred_ref text,
  target_ref text not null,
  actor text not null default 'client',
  created_at timestamptz not null default now()
);

create index if not exists client_portal_review_rounds_lookup
  on public.client_portal_review_rounds (portal_id, step_id, round_no desc);

create index if not exists client_portal_review_responses_by_round
  on public.client_portal_review_responses (round_id, seq desc);

alter table public.client_portal_review_rounds enable row level security;
alter table public.client_portal_review_responses enable row level security;

revoke all on public.client_portal_review_rounds from anon;
revoke all on public.client_portal_review_responses from anon;
revoke truncate on public.client_portal_review_rounds from authenticated;
revoke truncate on public.client_portal_review_responses from authenticated;
revoke insert, update, delete on public.client_portal_review_rounds from authenticated;
revoke insert, update, delete on public.client_portal_review_responses from authenticated;

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
