-- Harden public portal / discovery SECURITY DEFINER RPCs (v1.50.1 audit).
-- Keep is_client_upload_target + client-uploads storage (already correct on live).
-- Improve: detective redaction, step visibility, body/json caps, search_path, grants.

-- ── Discovery ──────────────────────────────────────────────────────────────

create or replace function public.get_discovery_share(share_id uuid)
returns table(client_name text, answers jsonb, status text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select client_name, answers, status
  from public.discovery_shares
  where id = share_id;
$$;

create or replace function public.submit_discovery_share(share_id uuid, submitted_answers jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count int;
begin
  if pg_column_size(coalesce(submitted_answers, '{}'::jsonb)) > 200000 then
    return false;
  end if;
  update public.discovery_shares
  set answers = submitted_answers,
      status = 'submitted',
      submitted_at = now()
  where id = share_id and status = 'pending';
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

-- ── Portal: redact detective until form is client-visible ─────────────────

create or replace function public.get_client_portal(portal_id uuid)
returns table(
  client_name text,
  detective_answers jsonb,
  step_visibility jsonb,
  step_status jsonb,
  form_status text,
  submitted_answers jsonb
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    client_name,
    case
      when form_status in ('pending', 'submitted') then detective_answers
      else '{}'::jsonb
    end as detective_answers,
    step_visibility,
    step_status,
    form_status,
    submitted_answers
  from public.client_portals
  where id = portal_id;
$$;

create or replace function public.get_client_portal_messages(portal_id_in uuid)
returns setof public.client_portal_messages
language sql
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.client_portal_messages
  where portal_id = portal_id_in
  order by created_at asc;
$$;

-- Keep remote rate limit; cap body length; search_path includes pg_temp
create or replace function public.post_client_portal_message(portal_id_in uuid, body_in text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cleaned text;
  recent_count int;
begin
  cleaned := left(trim(coalesce(body_in, '')), 2000);
  if cleaned = '' then
    return false;
  end if;
  if not exists (select 1 from public.client_portals where id = portal_id_in) then
    return false;
  end if;
  select count(*) into recent_count
  from public.client_portal_messages
  where portal_id = portal_id_in
    and sender = 'client'
    and created_at > now() - interval '5 minutes';
  if recent_count >= 20 then
    return false;
  end if;
  insert into public.client_portal_messages (portal_id, sender, body)
  values (portal_id_in, 'client', cleaned);
  return true;
end;
$$;

-- Step allowlist + visibility gate + note cap
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
  step_ok :=
    (vis ->> step_id_in) in ('true', '1')
    or (vis -> step_id_in) = 'true'::jsonb;
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

-- Block not_sent + double-submit; size cap.
-- IMPORTANT: single atomic UPDATE with status in WHERE + row_count (like
-- submit_discovery_share above). SELECT-then-UPDATE races concurrent submits
-- and was fixed again in 20260728023723 — do not reintroduce.
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

-- ── Grants: drop PUBLIC execute; allow anon + authenticated only ──────────

revoke all on function public.get_discovery_share(uuid) from public;
grant execute on function public.get_discovery_share(uuid) to anon, authenticated;

revoke all on function public.submit_discovery_share(uuid, jsonb) from public;
grant execute on function public.submit_discovery_share(uuid, jsonb) to anon, authenticated;

revoke all on function public.get_client_portal(uuid) from public;
grant execute on function public.get_client_portal(uuid) to anon, authenticated;

revoke all on function public.get_client_portal_messages(uuid) from public;
grant execute on function public.get_client_portal_messages(uuid) to anon, authenticated;

revoke all on function public.post_client_portal_message(uuid, text) from public;
grant execute on function public.post_client_portal_message(uuid, text) to anon, authenticated;

revoke all on function public.respond_client_portal_step(uuid, text, text, text) from public;
grant execute on function public.respond_client_portal_step(uuid, text, text, text) to anon, authenticated;

revoke all on function public.submit_client_portal_form(uuid, jsonb) from public;
grant execute on function public.submit_client_portal_form(uuid, jsonb) to anon, authenticated;

-- Upload helper already correct on live (folder text + pg_temp). Ensure grants.
revoke all on function public.is_client_upload_target(text) from public;
grant execute on function public.is_client_upload_target(text) to anon, authenticated;
