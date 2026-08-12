-- Security audit 2026-08-12, finding P2-1: client attachment URL trust.
--
-- THE HOLE. `submit_client_portal_form` and `submit_discovery_share` stored
-- the answers document verbatim behind one `pg_column_size` check. Inside that
-- document, every `${fieldId}Files` key is an array of `{ name, url }` pairs
-- the CLIENT composes — and nothing anywhere required `url` to be an object in
-- `client-uploads`, let alone one belonging to this portal. The studio then
-- rendered them as `<img src>` inside `<a href>`, and `inspirationLinksFiles`
-- auto-pinned onto the Research wall, from where the same URL reaches the
-- brand pack, the delivered pack and the exported PDF.
--
-- Two distinct things were wrong, and they need different fixes:
--
--   A. CROSS-TARGET REFERENCING. A link holder could name an object sitting in
--      a DIFFERENT share or portal's folder. `is_client_upload_target()` only
--      ever required an upload's folder to be SOME live share or portal, never
--      *this* one, so a folder that exists is not evidence of anything. This
--      migration closes it, and it is the half that has to live in the
--      database: it is a fact about storage, and only storage can answer it.
--
--   B. FOREIGN HOSTS. `https://evil.test/storage/v1/object/public/client-uploads/<f>/x.png`
--      carries the same object name as the real one. Postgres cannot tell them
--      apart, because a database does not know its own public hostname. That
--      half is NOT solvable here and is not attempted — see the note at the
--      bottom, and src/lib/client/attachmentUrl.js, which closes it by never
--      dereferencing the stored string once `path` is present.
--
-- WHAT THIS DOES NOT DO: reject the whole submission. A client filling a brief
-- on a phone gets one shot at these RPCs (they are single-use by design), so
-- failing the submit because one attachment did not verify would burn the link
-- and lose every typed answer with it. Bad entries are dropped, the answers are
-- kept, and the designer sees the attachment missing rather than the client
-- seeing "this form was already submitted".
--
-- NOT APPLIED TO `submit_client_portal_survey`: the survey renders text and
-- choice questions only and has no attachment field, exactly as
-- 20260801120000 records for the upload gate. If surveys ever gain one, route
-- it through here too.

-- ---------------------------------------------------------------- parsing ---
-- The object name a client-uploads public URL refers to, or NULL.
--
-- Pure string work, no authority claim: this says "if this URL were ours, it
-- would be pointing at THIS key". Whether it is ours is decided by the caller
-- (folder + existence here, origin in the app).
create or replace function public.client_upload_object_name(url text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  marker constant text := '/storage/v1/object/public/client-uploads/';
  at int;
  rest text;
  parts text[];
begin
  if url is null then
    return null;
  end if;
  at := position(marker in url);
  if at = 0 then
    return null;
  end if;
  rest := substr(url, at + length(marker));

  -- Supabase ignores query and fragment on a public object, so two spellings
  -- of one key must not be able to disagree about which key they are.
  rest := split_part(split_part(rest, '?', 1), '#', 1);
  if rest = '' then
    return null;
  end if;

  -- Deliberately NOT percent-decoded. `storage.objects.name` holds the literal
  -- key, and the keys this app writes (`<uuid>/<millis>-<rand>.<ext>`) never
  -- need escaping. A URL that only matches after decoding is not one this app
  -- produced, and decoding it would be inventing a second spelling for a key.
  parts := string_to_array(rest, '/');
  if array_length(parts, 1) is null or array_length(parts, 1) < 2 then
    return null;
  end if;
  -- An empty or dot segment makes "which folder is this in?" ambiguous. The
  -- answer to an ambiguous security question is no.
  if exists (select 1 from unnest(parts) p where p in ('', '.', '..')) then
    return null;
  end if;

  return rest;
end;
$$;

-- `from public` alone is NOT enough, and the repo has been getting this wrong.
-- Verified 2026-08-12 on the live project: `has_function_privilege('anon',
-- 'public.cap_rows_per_project()', 'EXECUTE')` returns TRUE even though
-- 20260805140000 revoked it from PUBLIC. Supabase grants EXECUTE to `anon` and
-- `authenticated` explicitly, and revoking the PUBLIC pseudo-role does not
-- touch an explicit grant to a named role. Every `revoke all ... from public`
-- in this directory is therefore weaker than its comment claims. Naming the
-- roles is what actually closes it.
revoke all on function public.client_upload_object_name(text) from public;
revoke execute on function public.client_upload_object_name(text) from anon, authenticated;

-- ------------------------------------------------------------- sanitising ---
-- Rebuild an answers document keeping only attachments that are provably
-- objects in THIS target's folder, and stamp the verified key onto each one.
--
-- `path` is the field that carries a proof. `url` is preserved because the
-- app uses it as an opaque identity key — dedupe, React keys, and the Asset
-- Library's `linkBriefAttachmentToAsset` all match on it — but nothing may
-- dereference it once `path` exists.
--
-- Every other key on an entry is dropped. An attachment is a name and a file;
-- anything else a client attaches to one is something we would be storing and
-- later handing to a renderer without ever having decided to.
create or replace function public.sanitize_client_attachments(
  answers jsonb,
  target uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  entry_key text;
  entry_val jsonb;
  item jsonb;
  kept jsonb;
  object_name text;
begin
  result := coalesce(answers, '{}'::jsonb);
  if jsonb_typeof(result) <> 'object' then
    return '{}'::jsonb;
  end if;
  if target is null then
    return result;
  end if;

  -- Iterate the ORIGINAL document; `result` is rewritten as we go.
  for entry_key, entry_val in
    select k, v from jsonb_each(coalesce(answers, '{}'::jsonb)) as t(k, v)
  loop
    if entry_key like '%Files' and jsonb_typeof(entry_val) = 'array' then
      kept := '[]'::jsonb;

      for item in select e from jsonb_array_elements(entry_val) as a(e) loop
        -- Same ceiling as is_client_upload_target's per-folder cap. A client
        -- who cannot upload a 26th file has no business submitting one.
        exit when jsonb_array_length(kept) >= 25;

        if jsonb_typeof(item) <> 'object' then
          continue;
        end if;

        object_name := public.client_upload_object_name(item ->> 'url');
        if object_name is null then
          continue;
        end if;

        -- (A) The folder must be THIS share or portal. `storage` is not on the
        -- search_path, so the helper is schema-qualified.
        if (storage.foldername(object_name))[1] is distinct from target::text then
          continue;
        end if;

        -- ...and the object must actually exist. Without this the folder check
        -- only proves the client can spell a UUID they already hold.
        if not exists (
          select 1 from storage.objects o
          where o.bucket_id = 'client-uploads'
            and o.name = object_name
        ) then
          continue;
        end if;

        kept := kept || jsonb_build_array(
          jsonb_build_object(
            'name', left(coalesce(nullif(item ->> 'name', ''), 'image'), 200),
            'url', item ->> 'url',
            'path', object_name
          )
        );
      end loop;

      result := jsonb_set(result, array[entry_key], kept);
    end if;
  end loop;

  return result;
end;
$$;

-- Only ever called from inside the SECURITY DEFINER submit functions below,
-- which run as the owner and so may execute it regardless of these revokes.
--
-- Both lines are needed — see the note on client_upload_object_name above.
-- Without the second, `anon` keeps Supabase's default EXECUTE grant and can
-- POST /rest/v1/rpc/sanitize_client_attachments directly, which turns this
-- into an oracle for "does object X exist in folder Y" against a bucket the
-- caller cannot list. Low value on its own, since reaching it already requires
-- a portal UUID, but it is exactly the kind of accessory the next finding gets
-- built out of.
revoke all on function public.sanitize_client_attachments(jsonb, uuid) from public;
revoke execute on function public.sanitize_client_attachments(jsonb, uuid) from anon, authenticated;

-- ------------------------------------------------------- submit RPCs ------
-- Bodies are otherwise unchanged from 20260801120000 — the liveness gate, the
-- single-use status gate, the size cap and the atomic UPDATE ... GET
-- DIAGNOSTICS shape all stay exactly as they were. The only edit is routing
-- the payload through the sanitiser first.
--
-- Size is checked BEFORE sanitising, not after: the cap exists to stop a large
-- payload being processed at all, and sanitising a 5MB document to find out it
-- was too big does the work the cap is there to avoid.

create or replace function public.submit_client_portal_form(
  portal_id_in uuid,
  submitted jsonb
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  updated_count int;
  cleaned jsonb;
begin
  if pg_column_size(coalesce(submitted, '{}'::jsonb)) > 200000 then
    return false;
  end if;
  cleaned := public.sanitize_client_attachments(submitted, portal_id_in);
  update public.client_portals
  set submitted_answers = cleaned,
      form_status = 'submitted',
      updated_at = now()
  where id = portal_id_in
    and form_status is not null
    and form_status not in ('submitted', 'not_sent')
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$function$;

revoke all on function public.submit_client_portal_form(uuid, jsonb) from public;
grant execute on function public.submit_client_portal_form(uuid, jsonb) to anon, authenticated;

create or replace function public.submit_discovery_share(
  share_id uuid,
  submitted_answers jsonb
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  updated_count int;
  cleaned jsonb;
begin
  if pg_column_size(coalesce(submitted_answers, '{}'::jsonb)) > 200000 then
    return false;
  end if;
  cleaned := public.sanitize_client_attachments(submitted_answers, share_id);
  update public.discovery_shares
  set answers = cleaned,
      status = 'submitted',
      submitted_at = now()
  where id = share_id
    and status = 'pending'
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$function$;

revoke all on function public.submit_discovery_share(uuid, jsonb) from public;
grant execute on function public.submit_discovery_share(uuid, jsonb) to anon, authenticated;

-- ------------------------------------------------------------- not closed ---
-- ROWS WRITTEN BEFORE THIS MIGRATION ARE NOT BACKFILLED, and that is a
-- decision rather than an oversight. A backfill would have to drop every
-- attachment it could not verify, and the ones it cannot verify include every
-- legitimate attachment whose object was uploaded correctly but whose URL was
-- stored before `path` existed. Deleting a client's reference photos out of a
-- live project to close a hole that the render path already closes is the
-- worse trade. `attachmentSrc()` treats a `path`-less entry as legacy and
-- renders it only if it still passes the structural check.
--
-- FOREIGN HOSTS (B above) remain unclosed IN SQL, permanently. Postgres has no
-- way to know which hostname serves this project, so it cannot reject a URL
-- that names a real object on somebody else's domain. The app closes it by
-- rebuilding every src and href from its own configured origin and never
-- fetching the stored string. If a future reader is tempted to "finish the job
-- here" by hardcoding the project ref into a check: don't. It would be wrong in
-- every branch database and every self-hosted deploy, and it would look like a
-- guarantee while being one.
