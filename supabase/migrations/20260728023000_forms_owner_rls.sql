-- Align public.forms with formApi.js (owner_id + owner RLS).
-- Older schema.sql used project_id = auth.uid() which never matched real rows.

alter table public.forms
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

-- If project_id was wrongly used as user id historically, copy into owner_id once.
update public.forms
set owner_id = project_id
where owner_id is null
  and project_id is not null
  and exists (select 1 from auth.users u where u.id = project_id);

create index if not exists forms_owner_id_idx on public.forms (owner_id);
create index if not exists forms_submitted_at_idx on public.forms (submitted_at desc);

-- Drop legacy policies (names from schema.sql and forms_migration.sql)
drop policy if exists "forms_select_own" on public.forms;
drop policy if exists "forms_insert_own" on public.forms;
drop policy if exists "forms_update_own" on public.forms;
drop policy if exists "forms_delete_own" on public.forms;
drop policy if exists "Users can view own forms" on public.forms;
drop policy if exists "Users can insert own forms" on public.forms;
drop policy if exists "Users can update own forms" on public.forms;
drop policy if exists "Users can delete own forms" on public.forms;

alter table public.forms enable row level security;

create policy "forms_select_own" on public.forms for select
  using (auth.uid() = owner_id);

create policy "forms_insert_own" on public.forms for insert
  with check (auth.uid() = owner_id);

create policy "forms_update_own" on public.forms for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "forms_delete_own" on public.forms for delete
  using (auth.uid() = owner_id);

-- project_id is a local app project id string in the client; keep as text-compatible uuid nullable.
-- Do not FK project_id to user_workspaces.
