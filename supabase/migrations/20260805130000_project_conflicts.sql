-- Phase 1b: the losing side of a sync conflict is RETAINED, not discarded.
--
-- The conflict rule (stated in src/services/syncEngine.js) picks a winner so
-- the app can show one document — but picking a winner is only safe because
-- the loser lands here first, durably, before the winner overwrites anything.
-- This is the CouchDB lesson PHASES.md quotes: last-write-wins is a DISPLAY
-- choice applied after both versions are stored, never a storage choice.
--
-- This table is the backstop for every other table's mistakes, which makes
-- its own threat model unusual: the thing it must survive is the compromise
-- of the account that owns it. Hence no mass-delete verb below (audit
-- 2026-08-05) — see the discard RPC.

-- 1a established composite (id, owner_id) keys so children could carry
-- structural owner alignment, but never added one to `projects`, so no child
-- of projects could use the pattern. Close that gap before relying on it.
alter table public.projects
  add constraint projects_id_owner_key unique (id, owner_id);

create table public.project_conflicts (
  id uuid primary key default gen_random_uuid(),
  -- Monotonic within the table. created_at alone cannot order these: now()
  -- is transaction-start time, so versions retained in one transaction share
  -- a timestamp and their relative order is undefined — which would let the
  -- recovery list show a different subset per call. 1a documented this trap
  -- for updated_at; this is the same trap on the one table whose entire job
  -- is recovery.
  seq bigserial not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- The project row the conflict happened on. SET NULL, not cascade: if the
  -- project row is deleted, its retained versions are the only copies left —
  -- deleting them with it would defeat the table's purpose.
  --
  -- Composite FK so a misaligned pointer is structurally impossible, not
  -- merely policy-checked. The column-list SET NULL form (PG15+) is required:
  -- a plain `on delete set null` would null owner_id too, and owner_id is
  -- NOT NULL, so every project delete would fail.
  project_row_id uuid,
  -- The local store id, kept as text so a retained version stays findable
  -- even after its project row is gone. NOTE: not 1:1 with a project once a
  -- project is deleted and a new one reuses the same local id.
  local_id text check (local_id is null or length(local_id) <= 100),
  project_name text check (project_name is null or length(project_name) <= 200),
  -- Which side lost: the copy that was on this desk, or the cloud copy.
  -- Only 'remote' is written today (the desk wins, so the cloud copy is the
  -- loser). 'local' is permitted for the pull-side retention a later phase
  -- may need; it is deliberately not dead-lettered out of the constraint.
  losing_side text not null check (losing_side in ('local', 'remote')),
  -- The entire losing document, same shape and same cap as projects.data.
  data jsonb not null check (pg_column_size(data) <= 1000000),
  created_at timestamptz not null default now(),
  constraint project_conflicts_project_owner_fkey
    foreign key (project_row_id, owner_id)
    references public.projects (id, owner_id)
    on delete set null (project_row_id)
);

create index if not exists project_conflicts_owner_id_idx
  on public.project_conflicts (owner_id);
-- Matches the recovery list's order exactly (owner, then newest first with a
-- deterministic tie-break), so paging it is stable.
create index if not exists project_conflicts_recovery_idx
  on public.project_conflicts (owner_id, created_at desc, seq desc);

alter table public.project_conflicts enable row level security;

revoke all on public.project_conflicts from anon;
-- TRUNCATE ignores RLS entirely, so this one grant would make every policy
-- below moot. Not reachable through PostgREST today; costs nothing to drop.
revoke truncate on public.project_conflicts from authenticated;

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
        -- Qualified deliberately. Unqualified `project_row_id` resolves to
        -- the outer row only because `projects` happens to have no column of
        -- that name; add one and this silently becomes p.x = p.x — true for
        -- every row — and the parent check evaporates with no error.
        where p.id = project_conflicts.project_row_id
          and p.owner_id = auth.uid()
      )
    )
  );

-- No UPDATE policy: a retained version is a record of what was lost, and a
-- record you can rewrite is not a record. Verified closed on the upsert path
-- too (ON CONFLICT DO UPDATE returns 42501, not a silent success).
--
-- If you are here to add one: RLS denies UPDATE by affecting zero rows rather
-- than erroring, so client code that PATCHes this table will report success
-- while doing nothing. Do not add one without also fixing pin_row_times to
-- keep created_at immutable.

-- No DELETE policy either. Discarding is a real need — the recovery list has
-- a per-card dismiss — but a table-level delete grant means one unfiltered
-- request wipes the entire safety net, which is exactly what a stolen token
-- would reach for before overwriting projects. Deletion goes through an RPC
-- that can only ever remove one row.
create or replace function public.discard_retained_version(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed int;
begin
  delete from public.project_conflicts
  where id = p_id and owner_id = auth.uid();
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke all on function public.discard_retained_version(uuid) from public;
grant execute on function public.discard_retained_version(uuid) to authenticated;

-- ------------------------------------------------------------- row times ---
-- created_at pinned server-side, same reasoning as the parent tables: this
-- timestamp is what orders retained versions for recovery. NOT the shared
-- stamp_row_times — that assigns new.updated_at, and this table has no
-- updated_at, so the shared trigger would error on every insert.
--
-- The UPDATE leg is defensive: there is no update policy today, but if one is
-- ever added this keeps created_at immutable rather than silently rewritable.
create or replace function public.pin_row_times()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = now();
  else
    new.created_at = old.created_at;
  end if;
  return new;
end;
$$;

revoke all on function public.pin_row_times() from public;

create trigger project_conflicts_pin_row_times
  before insert or update on public.project_conflicts
  for each row execute function public.pin_row_times();

-- Per-owner budget. Retained versions are unbounded otherwise: the insert
-- policy accepts a null parent, so an account owning no project at all can
-- still write rows. Prune rather than reject — a safety net that refuses new
-- entries because it is full has failed at the one job it has.
create or replace function public.prune_retained_versions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.project_conflicts
  where owner_id = new.owner_id
    and seq <= (
      select seq from public.project_conflicts
      where owner_id = new.owner_id
      order by seq desc
      offset 200 limit 1
    );
  return null;
end;
$$;

revoke all on function public.prune_retained_versions() from public;

create trigger project_conflicts_prune
  after insert on public.project_conflicts
  for each row execute function public.prune_retained_versions();
