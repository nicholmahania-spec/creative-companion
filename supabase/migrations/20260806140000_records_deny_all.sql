-- Make the lockdown on public.records explicit.
--
-- The security advisor flags `records` as RLS-enabled-with-no-policy. That
-- state is already CLOSED, not open — with RLS on and no policy, anon and
-- authenticated match nothing and the table is unreadable and unwritable by
-- both. The advisory exists because "no policy" cannot be told apart from
-- "somebody forgot to write one", and the next person to read it should not
-- have to guess which this is.
--
-- WHAT THIS TABLE IS: not ours, as far as this repo can tell. It is
-- `(id text, collection text, data jsonb, updated_at timestamptz, room_id
-- text)`, it is empty, it is created by no migration here, and nothing in
-- `src/`, `server/` or `api/` references it. It looks like scaffolding left by
-- another tool or template.
--
-- WHAT THIS DOES NOT DO: drop it. An empty unreferenced table is cheap to
-- keep and impossible to un-drop, and something outside this repo may expect
-- it. Deleting other people's data because it looks unused is how you find out
-- it was used. If it is genuinely dead, drop it deliberately in its own
-- change, with someone who knows its provenance.
--
-- EFFECTIVE ACCESS CHANGE: none. `using (false)` denies exactly what an absent
-- policy already denied. `service_role` bypasses RLS either way, so any
-- server-side job that legitimately touches this keeps working.
do $$
begin
  -- Guarded: this table is created by nothing in this repo, so a fresh
  -- environment built from these migrations alone will not have it, and an
  -- unguarded statement would fail the whole migration run.
  if to_regclass('public.records') is null then
    raise notice 'public.records not present — nothing to lock down';
    return;
  end if;

  execute 'alter table public.records enable row level security';

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'records'
      and policyname = 'records_denied_by_default'
  ) then
    execute $p$
      create policy "records_denied_by_default"
        on public.records
        for all
        to anon, authenticated
        using (false)
        with check (false)
    $p$;
  end if;
end $$;

comment on table public.records is
  'Not used by Creative Companion. RLS-denied to anon and authenticated by '
  'the records_denied_by_default policy. See migration 20260806140000 before '
  'granting anything here.';
