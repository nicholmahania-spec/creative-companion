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
