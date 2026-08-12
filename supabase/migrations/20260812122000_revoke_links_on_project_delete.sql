-- Security audit 2026-08-12, finding P2-3: project deletion and client portal
-- lifecycle.
--
-- THE INVARIANT THIS ESTABLISHES:
--
--     A DELETED PROJECT HAS NO LIVE CLIENT LINK.
--
-- What happened before: `deleteProject` (useAppStore.js) is a local-store
-- action. It filters four slices — projects, tasks, moodItems, deletedProjects
-- — and touches nothing else, by design, because the desk works offline. The
-- portal row is not part of the desk. So a project the designer deleted kept
-- serving, to anyone holding the link, for ever: the client's brief answers,
-- the whole studio/client message thread, every step approval, and any
-- delivered brand book. The designer also lost the handle to stop it, because
-- `clientPortalId` lives on the project that was just filtered away — the only
-- remaining route is the client inbox, which they have no reason to visit for
-- a project they believe is gone.
--
-- WHY REVOKE AND NOT DELETE. The existing retention contract is already
-- written down and this follows it rather than inventing a new one.
-- `revokeClientPortal`'s own UI copy says it: "Kills this link for anyone
-- holding it. The client's answers, chat and approvals are kept." 20260801120000
-- chose revocation over deletion for the same reason — deleting the row to kill
-- a link also destroys the client's answers, which the designer may still need
-- and which may be the only copy. Deletion semantics are NOT invented here.
--
-- WHY AN RPC AND NOT A POLICY OR AN FK. There is nothing to hang a foreign key
-- on: `client_portals.project_local_id` is the LOCAL store id as text, with no
-- FK, deliberately (20260805120000 records why — the local id is not a cloud
-- identity and legacy rows misuse it). A project can also be deleted while it
-- has no cloud `projects` row at all. So the authoritative enforcement point is
-- a function that owns the whole transition, scoped to the caller.

-- --------------------------------------------------------------- revoking ---
-- Returns what it actually changed, which is the part that makes undo safe.
--
-- Only rows that were LIVE are returned. A link the designer had already
-- revoked deliberately, weeks ago, is not in the result set — so the undo below
-- cannot resurrect it. That is the difference between "put back what I just
-- did" and "unrevoke everything on this project", and only the first is a
-- correct undo.
create or replace function public.revoke_project_links(p_local_id text)
returns table(kind text, link_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- No caller, no scope. Returning zero rows rather than raising keeps this
  -- callable from a signed-out desk without the delete path having to care.
  if auth.uid() is null then
    return;
  end if;
  if p_local_id is null or p_local_id = '' or length(p_local_id) > 100 then
    return;
  end if;

  return query
  with killed_portals as (
    update public.client_portals p
    set revoked_at = now(),
        updated_at = now()
    where p.owner_id = auth.uid()
      and p.project_local_id = p_local_id
      and p.revoked_at is null
    returning p.id
  ),
  killed_shares as (
    update public.discovery_shares s
    set revoked_at = now()
    where s.owner_id = auth.uid()
      and s.project_local_id = p_local_id
      and s.revoked_at is null
    returning s.id
  )
  select 'portal'::text, killed_portals.id from killed_portals
  union all
  select 'share'::text, killed_shares.id from killed_shares;
end;
$$;

-- `from public` alone does NOT close this. Verified on the live project
-- 2026-08-12: has_function_privilege('anon', …, 'EXECUTE') is TRUE for seven
-- functions in this directory whose migrations revoke from PUBLIC, because
-- Supabase grants EXECUTE to `anon` and `authenticated` by name and revoking
-- the PUBLIC pseudo-role leaves a named grant untouched. Naming the role is
-- what makes the comment above true.
--
-- The function body already refuses an anonymous caller (`auth.uid() is null`
-- returns immediately), so this was never exploitable — but the safety rested
-- entirely on the WHERE clause, with the grant contributing nothing. Two
-- independent reasons to refuse is the standard everywhere else here.
revoke all on function public.revoke_project_links(text) from public;
revoke execute on function public.revoke_project_links(text) from anon;
grant execute on function public.revoke_project_links(text) to authenticated;

-- ---------------------------------------------------------------- undoing ---
-- Deletion in this app is an undo, never a confirmation dialog (PRODUCT.md
-- §21, "Undo everywhere"). A revoke the designer cannot take back would make
-- the undo a lie: the project comes back and the client's link stays dead.
--
-- Takes explicit id lists rather than a project id, so it can only ever
-- reverse the exact rows `revoke_project_links` reported. Owner-scoped on top,
-- because an id list from a client is an id list from a client.
create or replace function public.restore_project_links(
  p_portal_ids uuid[],
  p_share_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  restored int := 0;
  n int;
begin
  if auth.uid() is null then
    return 0;
  end if;

  update public.client_portals
  set revoked_at = null,
      updated_at = now()
  where owner_id = auth.uid()
    and id = any (coalesce(p_portal_ids, '{}'::uuid[]));
  get diagnostics n = row_count;
  restored := restored + n;

  update public.discovery_shares
  set revoked_at = null
  where owner_id = auth.uid()
    and id = any (coalesce(p_share_ids, '{}'::uuid[]));
  get diagnostics n = row_count;
  restored := restored + n;

  return restored;
end;
$$;

revoke all on function public.restore_project_links(uuid[], uuid[]) from public;
revoke execute on function public.restore_project_links(uuid[], uuid[]) from anon;
grant execute on function public.restore_project_links(uuid[], uuid[]) to authenticated;

-- ------------------------------------------------------------ known limit ---
-- A portal whose `project_local_id` does not match the deleted project is not
-- touched, and cannot be: nothing else ties the two together. That covers two
-- real cases —
--
--   * `createDiscoveryShare` writes `projectLocalId || null`, so a share
--     created before the caller knew the project id has a NULL and is
--     unreachable from here;
--   * a project deleted and recreated can reuse neither id nor association.
--
-- Both are pre-existing and neither is made worse by this migration. The
-- client inbox remains the sweep-up route, and it lists every portal the owner
-- has regardless of project. Closing this properly means giving portals a real
-- project reference, which is a data-model change and a different pass.
