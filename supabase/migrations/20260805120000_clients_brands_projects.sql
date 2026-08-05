-- Client -> Brand -> Project.
--
-- The hierarchy exists because a brand outlives the project that created it:
-- a client owns brands, a brand collects projects over years, and the colour,
-- type and decision records belong to the BRAND so a later packaging job
-- already knows them. A flat projects table cannot express that without
-- re-entering the system on every job.
--
-- Ownership is denormalised onto all three tables on purpose. RLS could reach
-- the owner by joining brands -> clients, but every policy would then run a
-- join on every row. owner_id on each table keeps each policy a single
-- indexed comparison.
--
-- Denormalisation is only safe if a child's owner_id ALWAYS equals its
-- parent's. That invariant is enforced twice, deliberately:
--   1. structurally, by composite FKs (client_id, owner_id) ->
--      clients (id, owner_id) — which service_role, SECURITY DEFINER
--      functions and future backfills cannot bypass, and which keeps the
--      cascade below from ever being a cross-tenant destroy;
--   2. in the insert/update policies, as belt and braces.
-- (Audit 2026-08-05: policy-only enforcement left the invariant a two-policy
-- proof that RLS-exempt writers could break once, after which the cascade —
-- which never consults policies — would delete across tenants.)

-- No `if not exists` on the tables: on a security-establishing migration,
-- silently adopting a table someone else created (branch DB, partial apply)
-- and attaching policies to an unknown shape is the wrong failure mode.
-- Indexes keep `if not exists`; re-running those is harmless.

-- ---------------------------------------------------------------- clients ---
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(name) <= 200),
  contact_name text check (contact_name is null or length(contact_name) <= 200),
  contact_email text check (contact_email is null or length(contact_email) <= 320),
  notes text check (notes is null or length(notes) <= 20000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite target for the child FK that carries owner alignment.
  constraint clients_id_owner_key unique (id, owner_id)
);

create index if not exists clients_owner_id_idx on public.clients (owner_id);

-- ----------------------------------------------------------------- brands ---
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  name text not null check (length(name) <= 200),
  -- The living brand system. Distinct from any brand BOOK, which is a
  -- published snapshot of this and is versioned separately.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_id_owner_key unique (id, owner_id),
  -- Structural owner alignment: the referenced client row must carry the
  -- SAME owner_id. No writer, RLS-exempt or not, can point a brand at
  -- another tenant's client.
  constraint brands_client_owner_fkey
    foreign key (client_id, owner_id)
    references public.clients (id, owner_id) on delete cascade
);

create index if not exists brands_owner_id_idx on public.brands (owner_id);
create index if not exists brands_client_id_idx on public.brands (client_id);

-- --------------------------------------------------------------- projects ---
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null,
  name text not null check (length(name) <= 200),
  -- The local app's own project id, so a locally-created project can be
  -- matched to its row on sync without minting a second identity for it.
  --
  -- NOTE the pre-existing hazard recorded in 20260728023000_forms_owner_rls:
  -- forms.project_id holds this same local id — except in legacy rows where
  -- it was misused as a USER id and backfilled into owner_id. Any future FK
  -- from forms.project_id to this table must reconcile that first.
  local_id text check (local_id is null or length(local_id) <= 100),
  stage text check (stage is null or stage ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  -- Project payload stays document-shaped for now. Phase 3 lifts
  -- strategy_attributes / brand_tokens / decisions out of here into their own
  -- tables; until then this is the working copy and must not be read as a
  -- stable schema. Capped like every other client-writable payload in this
  -- schema (the anon RPCs cap at 200KB; authenticated gets 1MB).
  data jsonb not null default '{}'::jsonb
    check (pg_column_size(data) <= 1000000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_brand_owner_fkey
    foreign key (brand_id, owner_id)
    references public.brands (id, owner_id) on delete cascade
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists projects_brand_id_idx on public.projects (brand_id);

-- One local project maps to at most one row per user. TOTAL index, not
-- partial: PostgREST's `onConflict` cannot repeat a partial index's
-- predicate, so an upsert against a partial index fails with 42P10 (audit
-- finding, verified live). NULL local_ids never collide under NULL
-- semantics, so the partial clause bought nothing anyway.
create unique index if not exists projects_owner_local_id_idx
  on public.projects (owner_id, local_id);

-- -------------------------------------------------------------------- RLS ---
alter table public.clients enable row level security;
alter table public.brands enable row level security;
alter table public.projects enable row level security;

-- These tables have NO anon surface, and that should be structural rather
-- than an accident of `auth.uid()` being null for anon. Supabase's default
-- privileges grant anon full DML on new public tables; revoke it.
revoke all on public.clients, public.brands, public.projects from anon;

-- clients
create policy "clients_select_own" on public.clients for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "clients_insert_own" on public.clients for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "clients_update_own" on public.clients for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Delete only what is already archived. Two reasons:
--   1. PRODUCT.md commits to undo-everywhere; a hard-delete-only backend
--      cannot honour that, and archive-then-delete gives every destroy a
--      recoverable middle state.
--   2. It blunts a stolen token: one DELETE with no filter can no longer
--      cascade a whole tenant's brands and project documents away.
create policy "clients_delete_archived_own" on public.clients for delete
  to authenticated
  using (auth.uid() = owner_id and archived_at is not null);

-- brands. Parent checks are belt and braces on top of the composite FK.
create policy "brands_select_own" on public.brands for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "brands_insert_own" on public.brands for insert
  to authenticated
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = auth.uid()
    )
  );

create policy "brands_update_own" on public.brands for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = auth.uid()
    )
  );

create policy "brands_delete_archived_own" on public.brands for delete
  to authenticated
  using (auth.uid() = owner_id and archived_at is not null);

-- projects
create policy "projects_select_own" on public.projects for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "projects_insert_own" on public.projects for insert
  to authenticated
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.brands b
      where b.id = brand_id and b.owner_id = auth.uid()
    )
  );

create policy "projects_update_own" on public.projects for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.brands b
      where b.id = brand_id and b.owner_id = auth.uid()
    )
  );

create policy "projects_delete_archived_own" on public.projects for delete
  to authenticated
  using (auth.uid() = owner_id and archived_at is not null);

-- ------------------------------------------------------------ row times ----
-- created_at/updated_at are pinned server-side ON BOTH PATHS. A default
-- alone is not protection — a default only applies when the column is
-- omitted, and authenticated holds column-level INSERT on every column, so
-- an insert carrying "updated_at": "2099-01-01" would land verbatim. The
-- Phase 1b conflict rule reads these; they must not be writer-supplied.
--
-- Known limit, for that rule's author: now() is transaction-start time, so
-- two writes in one transaction carry identical updated_at. The comparator
-- needs a deterministic tie-break; updated_at alone cannot be one.
create or replace function public.stamp_row_times()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = now();
    new.updated_at = now();
  else
    new.created_at = old.created_at; -- immutable after insert
    new.updated_at = now();
  end if;
  return new;
end;
$$;

-- Consistency with the RPC discipline in this directory (harden_portal_rpcs):
-- functions get explicit grants, not the PUBLIC default. A trigger function
-- cannot be called directly anyway; this keeps the convention mechanical.
revoke all on function public.stamp_row_times() from public;

create trigger clients_stamp_row_times
  before insert or update on public.clients
  for each row execute function public.stamp_row_times();

create trigger brands_stamp_row_times
  before insert or update on public.brands
  for each row execute function public.stamp_row_times();

create trigger projects_stamp_row_times
  before insert or update on public.projects
  for each row execute function public.stamp_row_times();
