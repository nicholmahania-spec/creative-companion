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

-- Forms table for storing form submissions
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  form_name text not null,
  form_data jsonb not null,
  project_id uuid references public.user_workspaces(user_id) on delete set null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forms_project_id_idx on public.forms(project_id);
create index if not exists forms_submitted_at_idx on public.forms(submitted_at desc);

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

-- Row level security for forms
alter table public.forms enable row level security;

create policy "forms_select_own" on public.forms for select
  using (auth.uid() = project_id);

create policy "forms_insert_own" on public.forms for insert
  with check (auth.uid() = project_id);

create policy "forms_update_own" on public.forms for update
  using (auth.uid() = project_id)
  with check (auth.uid() = project_id);

create policy "forms_delete_own" on public.forms for delete
  using (auth.uid() = project_id);

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

create or replace function public.submit_client_portal_form(portal_id_in uuid, submitted jsonb)
returns boolean
language plpgsql security definer set search_path to 'public'
as $$
declare
  current_status text;
begin
  select form_status into current_status from public.client_portals where id = portal_id_in;
  if current_status is null or current_status = 'submitted' then
    return false;
  end if;
  update public.client_portals
  set submitted_answers = submitted, form_status = 'submitted', updated_at = now()
  where id = portal_id_in;
  return true;
end;
$$;
