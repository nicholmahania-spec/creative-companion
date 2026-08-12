/**
 * Deleting a project kills its client links.
 *
 * The invariant, from security audit 2026-08-12 (P2-3): a deleted project has
 * no live client link. Before this, `deleteProject` filtered four local store
 * slices and nothing else, so the portal kept serving the client's answers,
 * the message thread, every approval and any delivered brand book to anyone
 * holding the URL — for a project the designer believed was gone, and whose
 * `clientPortalId` handle went with it.
 *
 * Revoked, never deleted. That is the existing retention contract, not a new
 * one: the revoke button's own copy is "the client's answers, chat and
 * approvals are kept", and migration 20260801120000 chose revocation over
 * deletion precisely so killing a link does not destroy the answers.
 *
 * Both calls go through owner-scoped SECURITY DEFINER RPCs
 * (20260812122000) rather than table updates, so the transition is one
 * authoritative operation rather than two PATCHes the client could half-apply.
 */
import { supabase, isSupabaseConfigured } from '../supabase'

/**
 * Revoke every live link on a project.
 *
 * Returns the ids it actually changed, split by kind, so `restoreProjectLinks`
 * can put back exactly those and nothing else — a link the designer revoked
 * deliberately last week must not come back on an unrelated undo.
 *
 * @param {string|number} projectLocalId the local store project id
 * @returns {Promise<{ ok: boolean, portalIds: string[], shareIds: string[], error?: string }>}
 */
export async function revokeProjectLinks(projectLocalId) {
  const empty = { portalIds: [], shareIds: [] }
  if (!isSupabaseConfigured() || !supabase) {
    /* No cloud on this desk means no links to revoke — a local-only project
       never had one. Not a failure, and it must not read as one. */
    return { ok: true, ...empty }
  }
  if (projectLocalId == null || projectLocalId === '') {
    return { ok: true, ...empty }
  }

  const { data, error } = await supabase.rpc('revoke_project_links', {
    p_local_id: String(projectLocalId),
  })
  if (error) {
    // Log the driver's message; the caller decides what the designer is told.
    console.warn('Couldn’t revoke this project’s client links', error)
    return { ok: false, ...empty, error: error.message }
  }

  const rows = Array.isArray(data) ? data : []
  return {
    ok: true,
    portalIds: rows.filter((r) => r?.kind === 'portal').map((r) => r.link_id),
    shareIds: rows.filter((r) => r?.kind === 'share').map((r) => r.link_id),
  }
}

/**
 * Put back exactly the links a revoke took down. Undo, not un-revoke-all.
 *
 * @param {{ portalIds?: string[], shareIds?: string[] }} ids
 */
export async function restoreProjectLinks({ portalIds = [], shareIds = [] } = {}) {
  if (!isSupabaseConfigured() || !supabase) return { ok: true, restored: 0 }
  if (!portalIds.length && !shareIds.length) return { ok: true, restored: 0 }

  const { data, error } = await supabase.rpc('restore_project_links', {
    p_portal_ids: portalIds,
    p_share_ids: shareIds,
  })
  if (error) {
    console.warn('Couldn’t bring this project’s client links back', error)
    return { ok: false, restored: 0, error: error.message }
  }
  return { ok: true, restored: Number(data) || 0 }
}
