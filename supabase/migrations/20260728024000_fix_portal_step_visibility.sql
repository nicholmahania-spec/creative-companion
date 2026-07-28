-- Fix security issue in respond_client_portal_step: step_visibility NULL handling
--
-- PROBLEM: The original condition:
--   step_ok := (vis ->> step_id_in) in ('true', '1') or (vis -> step_id_in) = 'true'::jsonb;
-- When vis ->> step_id_in is NULL (missing key), the first part is NULL (not in 'true','1').
-- When vis -> step_id_in is NULL (missing key), the second part is NULL = 'true'::jsonb -> NULL.
-- NULL or NULL = NULL, and IF NULL THEN is skipped, falling through to UPDATE.
--
-- FIX: Use coalesce to treat missing keys as false:
--   step_ok := coalesce(vis -> step_id_in, 'false'::jsonb) = 'true'::jsonb;
-- This returns false when the key is missing or has a non-true value.

create or replace function public.respond_client_portal_step(
  portal_id_in uuid,
  step_id_in text,
  status_in text,
  note_in text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  vis jsonb;
  step_ok boolean;
begin
  if status_in not in ('approved', 'changes_requested') then
    return false;
  end if;
  if step_id_in is null or step_id_in !~ '^[a-z0-9_-]{1,40}$' then
    return false;
  end if;
  if step_id_in not in (
    'define', 'research', 'ideate', 'sketch', 'design', 'review', 'deliver'
  ) then
    return false;
  end if;
  select step_visibility into vis from public.client_portals where id = portal_id_in;
  if vis is null then
    return false;
  end if;
  step_ok := coalesce(vis -> step_id_in, 'false'::jsonb) = 'true'::jsonb;
  if not step_ok then
    return false;
  end if;
  update public.client_portals
  set step_status = jsonb_set(
        coalesce(step_status, '{}'::jsonb),
        array[step_id_in],
        jsonb_build_object(
          'status', status_in,
          'note', left(coalesce(note_in, ''), 2000)
        )
      ),
      updated_at = now()
  where id = portal_id_in;
  return true;
end;
$$;

-- Update permissions
revoke all on function public.respond_client_portal_step(uuid, text, text, text) from public;
grant execute on function public.respond_client_portal_step(uuid, text, text, text) to anon, authenticated;