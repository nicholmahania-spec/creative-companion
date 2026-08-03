/**
 * Public discovery-brief link — lets a studio user hand a client a
 * no-login URL to fill in their own answers, which flow back into the
 * project once submitted.
 *
 * Server side: public.discovery_shares (owner-only RLS) plus two
 * SECURITY DEFINER functions so the anon client never touches the
 * table directly — get_discovery_share (read) and
 * submit_discovery_share (single-use write, pending -> submitted).
 */
import { supabase, isSupabaseConfigured } from '../supabase'
import { ANSWERS_TOO_LARGE_MESSAGE, answersTooLarge } from './answerPayload'
import { publicUrl } from '../appPaths'

/** Build the client-facing URL for a share id. */
export function discoveryShareUrl(shareId) {
  return publicUrl('f', shareId)
}

/**
 * Create a new share row for the given project, owned by the current
 * signed-in user.
 * @returns {Promise<{ ok: true, shareId: string } | { ok: false, error: string }>}
 */
export async function createDiscoveryShare({ projectLocalId, clientName, answers }) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { data: userData } = await supabase.auth.getUser()
  const ownerId = userData?.user?.id
  if (!ownerId) return { ok: false, error: 'Sign in to send a client link' }

  const { data, error } = await supabase
    .from('discovery_shares')
    .insert({
      owner_id: ownerId,
      project_local_id: projectLocalId || null,
      client_name: clientName || null,
      answers: answers || {},
    })
    .select('id')
    .single()

  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t create the link', error)
    return { ok: false, error: 'Couldn’t create the link' }
  }
  return { ok: true, shareId: data.id }
}

/**
 * Studio side: revoke a discovery-share link (audit #19). Owner-scoped RLS
 * update sets revoked_at; get_discovery_share() and the upload gate then treat
 * the link as not-found, killing a leaked/forwarded link without deleting the
 * client's answers. Reversible by clearing revoked_at.
 */
export async function revokeDiscoveryShare(shareId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { error } = await supabase
    .from('discovery_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId)
  if (error) {
    console.warn('Couldn’t revoke the share', error)
    return { ok: false, error: 'Couldn’t revoke the link' }
  }
  return { ok: true }
}

/**
 * Fetch a share by id — usable by anyone with the link (no auth),
 * via the get_discovery_share() RPC.
 */
export async function fetchDiscoveryShare(shareId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { data, error } = await supabase.rpc('get_discovery_share', {
    share_id: shareId,
  })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t load the form', error)
    return { ok: false, error: 'Couldn’t load the form' }
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { ok: false, error: 'This link isn’t valid' }
  return { ok: true, clientName: row.client_name, answers: row.answers || {}, status: row.status }
}

/**
 * Submit a client's answers — single-use (server rejects if the share
 * has already been submitted).
 */
export async function submitDiscoveryShare(shareId, answers) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  /* Before the round trip, not after: the RPC signals "too large" and "already
     submitted" the same way (false), so an oversize payload that reaches it
     comes back as a message telling the client they are finished when they are
     not — on a link that only works once. Caught here, the link is not burned
     and the message can name the one thing they can do about it. */
  if (answersTooLarge(answers)) {
    return { ok: false, error: ANSWERS_TOO_LARGE_MESSAGE }
  }
  const { data, error } = await supabase.rpc('submit_discovery_share', {
    share_id: shareId,
    submitted_answers: answers || {},
  })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t submit the form', error)
    return { ok: false, error: 'Couldn’t submit the form' }
  }
  if (!data) return { ok: false, error: 'This form was already submitted' }
  return { ok: true }
}
