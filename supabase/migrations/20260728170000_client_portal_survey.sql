-- Client survey — on the portal the client already has, not a third link.
--
-- The app already runs two "create link / copy / poll for a response" systems:
-- discovery_shares and client_portals. A survey is a third thing you send and
-- collect answers back from, and giving it its own link would triple the
-- "which link was that" tax the ADHD review flagged on the contract feature.
-- So the survey is three columns on client_portals and one RPC, reusing the
-- portal id, the RLS, and the client's existing bookmark.
--
-- survey_status: 'not_sent' → 'sent' → 'submitted'. Same shape as form_status
-- so the studio side has one status vocabulary to learn, not two.

alter table public.client_portals
  add column if not exists survey_kind text,
  add column if not exists survey_status text not null default 'not_sent',
  add column if not exists survey_questions jsonb not null default '[]'::jsonb,
  add column if not exists survey_answers jsonb;

-- Client-visible portal payload gains the survey. Questions are only exposed
-- once the survey has actually been sent — the same redaction rule
-- detective_answers already follows, so a portal id cannot be used to read a
-- survey the studio is still drafting.
--
-- DROP first, not `create or replace`. Postgres refuses to replace a function
-- whose OUT columns changed ("cannot change return type of existing
-- function"), and this one gains three, so a plain replace fails the whole
-- migration.
drop function if exists public.get_client_portal(uuid);

create function public.get_client_portal(portal_id uuid)
returns table(
  client_name text,
  detective_answers jsonb,
  step_visibility jsonb,
  step_status jsonb,
  form_status text,
  submitted_answers jsonb,
  survey_kind text,
  survey_status text,
  survey_questions jsonb
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
    submitted_answers,
    survey_kind,
    survey_status,
    case
      when survey_status in ('sent', 'submitted') then survey_questions
      else '[]'::jsonb
    end as survey_questions
  from public.client_portals
  where id = portal_id;
$$;

revoke all on function public.get_client_portal(uuid) from public;
grant execute on function public.get_client_portal(uuid) to anon, authenticated;

-- RULE (see 20260728023723): submit RPCs use a single atomic
--   UPDATE ... WHERE <status gate>, then GET DIAGNOSTICS row_count.
-- Never SELECT status then unconditional UPDATE — two concurrent submits both
-- pass the check and the second silently overwrites the first.
create or replace function public.submit_client_portal_survey(
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
  set survey_answers = submitted,
      survey_status = 'submitted',
      updated_at = now()
  where id = portal_id_in
    and survey_status = 'sent';
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on function public.submit_client_portal_survey(uuid, jsonb) from public;
grant execute on function public.submit_client_portal_survey(uuid, jsonb) to anon, authenticated;
