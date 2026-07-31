-- Close anonymous listing on both Storage buckets.
--
-- Both buckets carried `SELECT ... USING (bucket_id = '<name>')` for role
-- `public`. Because both buckets are `public: true`, that policy was never
-- what served the images: a public bucket serves object URLs through
-- /storage/v1/object/public/... without consulting RLS at all. What the
-- policy actually granted was the *list* capability, because
-- POST /storage/v1/object/list/<bucket> runs storage.search() as SECURITY
-- INVOKER against storage.objects.
--
-- Why that mattered, per bucket:
--
--   client-uploads  — folder names are the share/portal UUIDs
--                     (src/lib/clientUploads.js builds `${targetId}/...`),
--                     and those UUIDs are the only credential protecting
--                     /f/:shareId and /c/:portalId. Listing the bucket root
--                     returned a directory of every live share and portal id,
--                     which is enough to read a client's brief and messages,
--                     approve or reject deliverables as the client, and burn
--                     the one-shot submits. Not yet armed only because the
--                     bucket held zero objects; the first client attachment
--                     would have armed it.
--
--   workspace-images — folder name is auth.uid(). Listing the root returned
--                     the owner's user id, and listing that prefix returned
--                     every mood-board pin and logo they had uploaded, each
--                     resolving to a public URL. Exploitable as written.
--
-- Supabase's own linter flags both as `public_bucket_allows_listing`.
--
-- The two buckets are treated differently on purpose:
--
--   client-uploads is insert-only (upsert: false at clientUploads.js:42) and
--   has no UPDATE or DELETE policy, so nothing needs row visibility. The
--   SELECT policy is dropped outright.
--
--   workspace-images is written with upsert: true (cloudSync.js:58). An
--   upsert can need to see the existing row, so rather than gamble on the
--   UPDATE policy's USING clause being sufficient and risk a silent
--   re-upload failure (cloudSync wraps errors in withTimeout/catch and
--   degrades quietly), its SELECT is re-scoped to the owner instead of
--   removed. anon has no auth.uid(), so anonymous listing returns nothing —
--   same security outcome, no risk to image sync.

drop policy if exists "client-uploads public read" on storage.objects;

drop policy if exists "workspace-images public read" on storage.objects;

create policy "workspace-images owner read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
