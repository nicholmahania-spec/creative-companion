-- Bound what an anonymous client upload can do.
--
-- Two gaps, both in the same surface:
--
--   1. is_client_upload_target() authorized a write if the share/portal row
--      merely EXISTED. There is no expiry anywhere in the schema, so a link
--      from months ago still authorized uploads forever, and nothing capped
--      how many. Anyone who ever held a link — a former client, whoever they
--      forwarded it to — could loop 8 MB objects into that folder indefinitely
--      at storage cost to the owner, and because the bucket is public-read it
--      doubled as free file hosting on the project's domain.
--
--   2. The bucket accepted image/svg+xml and application/pdf, while
--      src/lib/clientUploads.js rejects anything that is not image/*. The PDF
--      entry was pure drift — reachable only by bypassing the browser, which
--      is what an attacker does by definition. SVG matters more: Supabase
--      serves the stored content-type, so a stored .svg opened directly
--      executes script on the *.supabase.co origin. The app's CSP covers the
--      app's origin, not that one. In-app the files render in <img>, where SVG
--      script does not execute, so the risk is a link handed to someone.
--
-- The ceiling is deliberately generous (25 objects per folder). The real case
-- is a client attaching a handful of reference photos to two brief questions;
-- 25 cannot plausibly reject a genuine first upload, which is the failure this
-- was most at risk of introducing. BriefAttach's failure path is an in-place
-- retry that a stranger on a phone may simply abandon, so a false rejection
-- costs a real answer.
--
-- NOT done here, deliberately: gating on open state (status = 'pending' /
-- form_status not submitted). It is the more correct end state, but it can
-- reject a legitimate upload if a client attaches at a moment when the status
-- has already flipped, and that lifecycle has not been traced end to end yet.
-- Recorded as an open item rather than guessed at.
--
-- workspace-images is left alone on mime types on purpose: its writes are
-- owner-scoped, so an SVG there is the owner uploading their own file, which
-- is not a cross-user risk — and an SVG logo is a legitimate thing to want.

create or replace function public.is_client_upload_target(folder text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  target uuid;
  existing integer;
begin
  -- Shape-check before the cast: casting arbitrary text to ::uuid throws, and
  -- an exception here surfaces as a 500 to an anonymous caller instead of a
  -- clean "no".
  if folder is null or folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  target := folder::uuid;

  if not (
    exists (select 1 from public.discovery_shares s where s.id = target)
    or exists (select 1 from public.client_portals p where p.id = target)
  ) then
    return false;
  end if;

  -- Per-folder ceiling. storage is not on the search_path above, so both the
  -- table and the helper are schema-qualified.
  select count(*) into existing
  from storage.objects o
  where o.bucket_id = 'client-uploads'
    and (storage.foldername(o.name))[1] = folder;

  return existing < 25;
end;
$function$;

revoke all on function public.is_client_upload_target(text) from public;
grant execute on function public.is_client_upload_target(text) to anon, authenticated;

-- Match the server's allow-list to what the client actually sends (image/* only).
update storage.buckets
set allowed_mime_types = array[
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif'
]
where id = 'client-uploads';
