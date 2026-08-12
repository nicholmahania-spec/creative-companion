-- Security audit 2026-08-12, findings P2-4 (storage config is not reproducible)
-- and P2-5 (the 8MB upload cap is client-side only).
--
-- P2-4, THE PROBLEM. `brand-assets` is created and pinned by
-- 20260806120000_asset_library.sql. The two older buckets were not created by
-- anything: `client-uploads` and `workspace-images`, their `public` flag, and
-- the policy that is the ENTIRE authorization for anonymous writes existed
-- only in the live project. The repo's record of them was a commented-out
-- block at schema.sql:346-352 — which was already wrong in two ways, and that
-- is the whole argument for this file.
--
-- ─────────────────────────────────────────────────────────────────────────
-- EVERY VALUE BELOW IS TRANSCRIBED FROM THE LIVE PROJECT, NOT INFERRED.
--
-- Verified 2026-08-12 against project `shzkqbtoepqqdkjgupry` by reading
-- `storage.buckets` and `pg_policies where schemaname='storage' and
-- tablename='objects'`. An earlier draft of this migration guessed, and the
-- verification caught it guessing wrong three times:
--
--   1. The anon insert policy is named `client-uploads anon insert`, NOT
--      `anon_insert_client_upload_folder` as schema.sql's comment claimed.
--      Creating the commented name would have left the real policy in place
--      and ADDED a second permissive INSERT policy beside it. Permissive
--      policies OR together, so the result is a duplicate that no test would
--      have noticed and that quietly doubles the surface to reason about.
--
--   2. That policy applies to `{anon, authenticated}`, not `anon` alone.
--
--   3. `workspace-images` carries `file_size_limit = 8388608`. The draft
--      omitted the column, so a fresh environment would have been built with
--      NULL — a bucket with no ceiling, produced by the migration whose job
--      is to make environments match.
--
-- The four `workspace-images` object policies below were the reason the
-- previous pass stopped: no migration and no comment recorded their text, so
-- writing them would have been a guess, and a guessed permissive policy ORs
-- with the real one. They are now transcribed from `pg_policies` and are
-- exact.
-- ─────────────────────────────────────────────────────────────────────────
--
-- WHAT THIS MIGRATION WILL NOT DO:
--
--   * It does not touch `public` on either bucket. Both are `true` in
--     production and the app reads them through `getPublicUrl`. Making
--     `client-uploads` private is the correct end state (P2-2) but that is an
--     architectural decision with its own review, not something to smuggle in
--     under the heading "make config reproducible". The `on conflict` clauses
--     omit the column entirely so this file cannot move it even by accident,
--     and a test asserts they never gain it.
--
--   * It does not touch `brand-assets`. Its bucket row and all four of its
--     policies already live in 20260806120000 and were verified to match
--     production exactly. Restating them here would give two migrations
--     authority over one bucket.

-- ---------------------------------------------------------------- buckets ---

-- client-uploads: anonymous client brief attachments on /f/ and /c/.
--
-- P2-5 IS THE `file_size_limit` LINE — and the audit's reading of it needs
-- correcting now that production has been looked at. The finding said the
-- effective ceiling was "the project default". It is not: production already
-- carries 8388608. So the live gap was never an unbounded anonymous upload;
-- it was that the repo could not reproduce the limit and nothing would notice
-- if it were removed. Setting it here closes the real gap and changes nothing
-- about today's behaviour.
--
-- 8388608 is exactly `8 * 1024 * 1024`, matching MAX_UPLOAD_BYTES in
-- clientUploads.js. A file the browser accepts must not then be refused by
-- storage — that failure lands on a stranger filling a form on a phone, whose
-- only feedback is "Didn't send. Try again".
--
-- MIME allow-list transcribed from production, and identical to what
-- 20260731130000 set. SVG and PDF stay OUT: this bucket takes ANONYMOUS
-- writes and Supabase serves the stored content-type, so a stored .svg opened
-- directly runs script on the supabase.co origin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-uploads',
  'client-uploads',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- workspace-images: the owner's own mood pins and logo artwork.
-- Both values transcribed from production. SVG is allowed here and not above
-- because these writes are owner-authenticated — an SVG here is the designer's
-- own logo, which is not a cross-user risk (20260731130000 reaches the same
-- conclusion for the same reason).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-images',
  'workspace-images',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------------------------- policies ---
-- Names and expressions transcribed from `pg_policies`. Because the names now
-- match production exactly, each `drop ... if exists` + `create` pair is a
-- true restatement on an existing database and a real creation on a fresh
-- one — never a duplicate.
--
-- Note for anyone diffing this against `pg_policies` later: that view renders
-- the function call unqualified (`is_client_upload_target(...)`) because
-- `public` is on the search_path. The `public.` prefix written here is the
-- same call, spelled so it does not depend on the search_path of whoever runs
-- the migration.

-- The anonymous write gate. This is the only thing standing between the open
-- internet and this bucket, and until now it lived in a SQL comment.
drop policy if exists "client-uploads anon insert" on storage.objects;
create policy "client-uploads anon insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'client-uploads'
    and public.is_client_upload_target((storage.foldername(name))[1])
  );

-- Deliberately no SELECT, UPDATE or DELETE policy for client-uploads, and
-- production has none — verified, not assumed. 20260731120000 removed the
-- SELECT policy that once existed and its reasoning holds: the bucket is
-- public, so a SELECT policy grants no read the app needs, and it DOES grant
-- `list`, because POST /storage/v1/object/list/<bucket> runs storage.search()
-- as SECURITY INVOKER. Folder names here are the share and portal ids, which
-- are the only credential protecting /f/ and /c/. Do not add one.

-- workspace-images: owner-prefix on all four verbs. The object key is
-- `${auth.uid()}/...` (cloudSync.js), so each policy is a single indexed
-- comparison rather than a join.
drop policy if exists "workspace-images owner read" on storage.objects;
create policy "workspace-images owner read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "workspace-images owner insert" on storage.objects;
create policy "workspace-images owner insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- UPDATE carries both clauses. cloudSync.js writes with `upsert: true`, so an
-- upsert that lands on an existing object needs USING to see the old row and
-- WITH CHECK to approve the new one; a policy with only one of them fails in a
-- way cloudSync's catch swallows silently.
drop policy if exists "workspace-images owner update" on storage.objects;
create policy "workspace-images owner update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  )
  with check (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "workspace-images owner delete" on storage.objects;
create policy "workspace-images owner delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
