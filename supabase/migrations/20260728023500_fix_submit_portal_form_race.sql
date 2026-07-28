-- The previous migration (20260728021200_harden_portal_rpcs.sql) reintroduced
-- a select-then-update race in submit_client_portal_form: it read
-- form_status, checked it, then updated with no status re-check in the
-- WHERE clause and no row_count check on the return. Two near-simultaneous
-- submits could both pass the read-check and the second would silently
-- overwrite the first. Keeps that migration's additions (not_sent guard,
-- 200KB size cap) -- just makes the state transition atomic again, matching
-- submit_discovery_share's pattern.
create or replace function public.submit_client_portal_form(portal_id_in uuid, submitted jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
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
