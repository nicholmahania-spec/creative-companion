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
-- join on every row, and a recursive policy is the usual way these get slow
-- and then get "temporarily" disabled. owner_id on each table keeps each
-- policy a single indexed comparison.
--
-- Denormalising ownership creates its own hole, though: a user could insert a
-- brand with their own owner_id while pointing client_id at someone else's
-- client, and a policy that only checks owner_id would allow it. So the insert
-- and update checks below ALSO require the parent row to belong to the same
-- user. That is what stops a row being adopted across tenants.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- clients ---
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_owner_id_idx on public.clients (owner_id);

-- ----------------------------------------------------------------- brands ---
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  -- The living brand system. Distinct from any brand BOOK, which is a
  -- published snapshot of this and is versioned separately.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brands_owner_id_idx on public.brands (owner_id);
create index if not exists brands_client_id_idx on public.brands (client_id);

-- --------------------------------------------------------------- projects ---
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  name text not null,
  -- The local app's own project id, so a locally-created project can be
  -- matched to its row on sync without minting a second identity for it.
  local_id text,
  stage text,
  status text not null default 'active',
  -- Project payload stays document-shaped for now. Phase 3 lifts
  -- strategy_attributes / brand_tokens / decisions out of here into their own
  -- tables; until then this is the working copy and must not be read as a
  -- stable schema.
  data jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists projects_brand_id_idx on public.projects (brand_id);

-- One local project maps to at most one row per user. Partial, because
-- local_id is null for anything created server-side and null is not a
-- collision.
create unique index if not exists projects_owner_local_id_idx
  on public.projects (owner_id, local_id)
  where local_id is not null;

-- -------------------------------------------------------------------- RLS ---
alter table public.clients enable row level security;
alter table public.brands enable row level security;
alter table public.projects enable row level security;

-- clients
drop policy if exists "clients_select_own" on public.clients;
drop policy if exists "clients_insert_own" on public.clients;
drop policy if exists "clients_update_own" on public.clients;
drop policy if exists "clients_delete_own" on public.clients;

create policy "clients_select_own" on public.clients for select
  using (auth.uid() = owner_id);

create policy "clients_insert_own" on public.clients for insert
  with check (auth.uid() = owner_id);

create policy "clients_update_own" on public.clients for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "clients_delete_own" on public.clients for delete
  using (auth.uid() = owner_id);

-- brands. The parent check is the point: owning the brand row is not enough,
-- the client it hangs off must be yours too.
drop policy if exists "brands_select_own" on public.brands;
drop policy if exists "brands_insert_own" on public.brands;
drop policy if exists "brands_update_own" on public.brands;
drop policy if exists "brands_delete_own" on public.brands;

create policy "brands_select_own" on public.brands for select
  using (auth.uid() = owner_id);

create policy "brands_insert_own" on public.brands for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = auth.uid()
    )
  );

create policy "brands_update_own" on public.brands for update
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = auth.uid()
    )
  );

create policy "brands_delete_own" on public.brands for delete
  using (auth.uid() = owner_id);

-- projects
drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;

create policy "projects_select_own" on public.projects for select
  using (auth.uid() = owner_id);

create policy "projects_insert_own" on public.projects for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.brands b
      where b.id = brand_id and b.owner_id = auth.uid()
    )
  );

create policy "projects_update_own" on public.projects for update
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.brands b
      where b.id = brand_id and b.owner_id = auth.uid()
    )
  );

create policy "projects_delete_own" on public.projects for delete
  using (auth.uid() = owner_id);

-- ------------------------------------------------------------ updated_at ----
-- Set server-side. A client-supplied timestamp is the thing a sync conflict
-- rule would later depend on, and it must not be forgeable by the writer.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_touch_updated_at on public.clients;
create trigger clients_touch_updated_at
  before update on public.clients
  for each row execute function public.touch_updated_at();

drop trigger if exists brands_touch_updated_at on public.brands;
create trigger brands_touch_updated_at
  before update on public.brands
  for each row execute function public.touch_updated_at();

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();
