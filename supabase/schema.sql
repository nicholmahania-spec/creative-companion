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
