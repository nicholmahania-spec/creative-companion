-- Fix double-submit race on client portal form (reintroduced by harden_portal_rpcs).
--
-- RULE: portal/discovery submit RPCs must use a single atomic
--   UPDATE ... WHERE <status gate>
--   GET DIAGNOSTICS updated_count = row_count
--   RETURN updated_count > 0
-- Never SELECT status then unconditional UPDATE — two concurrent submits can
-- both pass the check and the second overwrites the first with no error.
-- Reference pattern: submit_discovery_share (status = 'pending' in WHERE).

create or replace function public.submit_client_portal_form(
  portal_id_in uuid,
  submitted jsonb
)
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

revoke all on function public.submit_client_portal_form(uuid, jsonb) from public;
grant execute on function public.submit_client_portal_form(uuid, jsonb) to anon, authenticated;
