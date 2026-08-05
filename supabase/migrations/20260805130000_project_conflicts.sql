-- Phase 1b: the losing side of a sync conflict is RETAINED, not discarded.
--
-- The conflict rule (stated in src/services/projectSync.js) picks a winner so
-- the app can show one document — but picking a winner is only safe because
-- the loser lands here first, durably, before the winner overwrites anything.
-- This is the CouchDB lesson PHASES.md quotes: last-write-wins is a DISPLAY
-- choice applied after both versions are stored, never a storage choice.
--
-- Rows here are a safety net, not a feature surface. The app writes one on
-- every conflict and lists them so a designer can recover; nothing else
-- reads them. They are deletable without archiving — a retained loser IS
-- the backup, it has no children, and requiring a second step to discard a
-- backup would punish the recovery flow this table exists to serve.

create table public.project_conflicts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- The project row the conflict happened on. SET NULL, not cascade: if the
  -- project row is deleted, its retained versions are the only copies left —
  -- deleting them with it would defeat the table's purpose.
  project_row_id uuid references public.projects (id) on delete set null,
  -- The local store id, kept as text so a retained version stays findable
  -- even after its project row is gone.
  local_id text check (local_id is null or length(local_id) <= 100),
  project_name text check (project_name is null or length(project_name) <= 200),
  -- Which side lost: the copy that was on this desk, or the cloud copy.
  losing_side text not null check (losing_side in ('local', 'remote')),
  -- The entire losing document, same shape and same cap as projects.data.
  data jsonb not null check (pg_column_size(data) <= 1000000),
  created_at timestamptz not null default now()
);

create index if not exists project_conflicts_owner_id_idx
  on public.project_conflicts (owner_id);
create index if not exists project_conflicts_local_id_idx
  on public.project_conflicts (owner_id, local_id);

alter table public.project_conflicts enable row level security;

revoke all on public.project_conflicts from anon;

create policy "project_conflicts_select_own" on public.project_conflicts
  for select to authenticated
  using (auth.uid() = owner_id);

create policy "project_conflicts_insert_own" on public.project_conflicts
  for insert to authenticated
  with check (
    auth.uid() = owner_id
    and (
      project_row_id is null
      or exists (
        select 1 from public.projects p
        where p.id = project_row_id and p.owner_id = auth.uid()
      )
    )
  );

-- No update policy at all: a retained version is a record of what was lost,
-- and a record you can rewrite is not a record.

create policy "project_conflicts_delete_own" on public.project_conflicts
  for delete to authenticated
  using (auth.uid() = owner_id);

-- created_at pinned server-side, same reasoning as the parent tables: this
-- timestamp is what orders retained versions for recovery. NOT the shared
-- stamp_row_times — that assigns new.updated_at, and this table has no
-- updated_at (nothing may update it), so the shared trigger would error on
-- every insert.
create or replace function public.pin_created_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.created_at = now();
  return new;
end;
$$;

revoke all on function public.pin_created_at() from public;

create trigger project_conflicts_pin_created_at
  before insert on public.project_conflicts
  for each row execute function public.pin_created_at();
