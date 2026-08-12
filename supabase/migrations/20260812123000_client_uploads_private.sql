-- Security audit 2026-08-12, finding P2-2 — owner decision applied.
--
-- THE DECISION (product/security owner, 2026-08-12): attachment
-- confidentiality must survive revocation. The revoke promise — "kills this
-- link for anyone holding it" — is a real contract, so `client-uploads` may
-- not remain publicly readable. A public bucket serves objects through
-- /storage/v1/object/public/… WITHOUT consulting RLS, so no policy, RPC or
-- application change can retire an issued URL. Only the bucket flag can.
--
-- WHY THIS IS A SEPARATE MIGRATION FROM 20260812121000.
--
-- 121000 records what production ALREADY IS, transcribed from the live
-- database, and its test asserts it can never move `public`. This file records
-- a CHANGE. Folding the two together would squash the parity record that made
-- this change safe to reason about — the audit trail is the thing that caught
-- three defects in the first draft — and would leave the repo unable to say
-- what the configuration was before anyone touched it.
--
-- Ordering is coherent in both directions:
--   * fresh environment: 121000 creates the bucket public with zero objects
--     and no traffic, 123000 makes it private one step later. The window is
--     inside a single `db push` with nothing in the bucket to expose.
--   * production: 121000's `on conflict` deliberately omits `public`, so it is
--     a no-op for visibility; this file is the only statement that moves it.
--
-- WHY NO DATA MIGRATION. Verified against production on 2026-08-12:
-- `client-uploads` holds 0 objects, and 0 attachment references exist across
-- client_portals (submitted_answers, detective_answers, survey_answers,
-- delivery_pack), discovery_shares.answers, projects.data and
-- user_workspaces.payload. There are no issued URLs to break and nothing to
-- backfill. That window closes the first time a real client attaches a photo.

-- --------------------------------------------------------------- the flip ---
-- `public = false` is the whole security change. Everything below exists to
-- keep the designer's own surfaces working once it is false.
update storage.buckets
set public = false
where id = 'client-uploads';

-- --------------------------------------------------------- owner check ------
-- Who may read an object in this bucket.
--
-- The folder is a share or portal id, NOT auth.uid(), so this cannot be the
-- single indexed comparison that brand-assets and workspace-images use. The
-- owner is one join away: a portal or share with that id whose owner_id is the
-- caller.
--
-- SECURITY DEFINER because the policy is evaluated as the caller, and the
-- caller has no direct read on client_portals beyond their own rows — which is
-- the answer we want, but reached without making the policy depend on another
-- table's RLS evaluating mid-policy.
create or replace function public.is_client_upload_owner(folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  target uuid;
begin
  -- No session, no ownership. Explicit rather than relying on the comparison
  -- below being NULL, so the intent survives a future edit.
  if auth.uid() is null then
    return false;
  end if;
  -- Shape-check before the cast: casting arbitrary text to ::uuid throws, and
  -- an exception inside a policy surfaces as a 500 rather than a clean "no".
  if folder is null
     or folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  target := folder::uuid;

  return exists (
    select 1 from public.client_portals p
    where p.id = target and p.owner_id = auth.uid()
  ) or exists (
    select 1 from public.discovery_shares s
    where s.id = target and s.owner_id = auth.uid()
  );
end;
$$;

-- Both lines, per the verified grant defect: `revoke ... from public` does NOT
-- remove Supabase's explicit EXECUTE grant to anon/authenticated. `anon` must
-- not hold this — it would answer "does a portal with this id exist" one bit
-- at a time. `authenticated` MUST hold it, because a storage policy is
-- evaluated as the invoking role.
revoke all on function public.is_client_upload_owner(text) from public;
revoke execute on function public.is_client_upload_owner(text) from anon;
grant execute on function public.is_client_upload_owner(text) to authenticated;

-- ------------------------------------------------------------- the policy ---
-- SELECT is required even though nothing lists this bucket: signed-URL
-- creation runs as the caller and consults RLS, so without this every studio
-- read 404s. Same reason 20260806120000 gives for brand-assets.
--
-- Owner-scoped, so the `list` capability this grants returns only folders the
-- caller already owns. That is the same trade 20260731120000 made when it
-- re-scoped workspace-images rather than dropping its SELECT, and for the same
-- reason: the danger was never SELECT, it was an UNSCOPED select handing out a
-- directory of live share and portal ids.
drop policy if exists "client-uploads owner read" on storage.objects;
create policy "client-uploads owner read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'client-uploads'
    and public.is_client_upload_owner((storage.foldername(name))[1])
  );

-- ------------------------------------------- what this actually delivers ----
-- Stated precisely, because "confidentiality survives revocation" is the
-- DECISION and it is not the same sentence as what the mechanism does. A
-- review pass asked for the difference in writing rather than assumed.
--
--   * ANONYMOUS PARTIES — the audience revocation exists for — get nothing,
--     before or after revocation. There is no anon SELECT policy, so a link
--     holder cannot obtain a URL of any kind for these objects. The permanent,
--     unauthenticated URL that used to exist is gone outright. This is the
--     part that is absolute, and it is the part the decision was about.
--
--   * A SIGNED URL IS NOT REVOCABLE ONCE MINTED. It is a token the storage
--     service validates against its own signature and `exp`; it does not
--     re-consult RLS, this function, or `revoked_at` on each request. Nothing
--     here can kill one early, short of rotating the project JWT secret, which
--     would invalidate every signed URL in every bucket.
--
--   * THIS FUNCTION DELIBERATELY DOES NOT CHECK `revoked_at`. Only the owner
--     can mint a URL, and the owner must keep reading their own client's brief
--     after they kill the link — 20260801120000 chose revocation over deletion
--     precisely so the answers survive. Gating reads on link liveness would
--     make the designer's own evidence disappear the moment they used the kill
--     switch.
--
-- So the residual exposure is not "a revoked client keeps reading". It is "a
-- URL the DESIGNER's own browser minted leaks", bounded by the one-hour TTL in
-- lib/assets/signedUrls.js. That is a different and far smaller risk than the
-- permanent public URL it replaces, and it is not what revocation is for. Do
-- not describe this migration as making issued URLs die on revoke.

-- ------------------------------------------------------------- NOT added ----
-- NO ANONYMOUS SELECT POLICY, now or ever. It would defeat the flip above in
-- two ways at once: it restores read access to exactly the audience the
-- revocation contract is about, and — because
-- POST /storage/v1/object/list/<bucket> runs storage.search() as SECURITY
-- INVOKER — it hands out a directory of every folder name, which here are the
-- share and portal UUIDs that are the only credential protecting /f/ and /c/.
-- That is the hole 20260731120000 closed. Anonymous access to this bucket is
-- INSERT only, unchanged, still gated by is_client_upload_target().
--
-- The consequence for the client's own screens is deliberate and is handled in
-- the app rather than here: /f/ and /c/ preview an attachment from the file
-- the client just chose, and name it without an image once that local copy is
-- gone. A client does not need to re-download their own photograph from us;
-- the designer needs to see it, and the designer is authenticated.
