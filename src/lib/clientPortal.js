/**
 * Client portal — a no-login dashboard link for a project's client.
 * Studio side chooses which of the 7 journey steps are "pushed" (visible)
 * to the client; the client can view what's pushed, approve or request
 * changes per step, chat with the studio, and fill in the Project overview
 * form themselves if asked to.
 *
 * Server side: public.client_portals (owner-only RLS) + public.client_portal_messages
 * (owner-only RLS), plus SECURITY DEFINER RPCs so the anon client never
 * touches the tables directly (mirrors discoveryShare.js's pattern).
 */
import { supabase, isSupabaseConfigured } from './supabase'
import { publicUrl } from './appPaths'

/** Build the client-facing URL for a portal id. */
export function clientPortalUrl(portalId) {
  return publicUrl('c', portalId)
}

/**
 * Create a new client portal for the given project, owned by the current
 * signed-in user.
 * @returns {Promise<{ ok: true, portalId: string } | { ok: false, error: string }>}
 */
export async function createClientPortal({ projectLocalId, clientName, detectiveAnswers }) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { data: userData } = await supabase.auth.getUser()
  const ownerId = userData?.user?.id
  if (!ownerId) return { ok: false, error: 'Sign in to send a client link' }

  const { data, error } = await supabase
    .from('client_portals')
    .insert({
      owner_id: ownerId,
      project_local_id: String(projectLocalId),
      client_name: clientName || null,
      detective_answers: detectiveAnswers || {},
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message || 'Couldn’t create the portal' }
  return { ok: true, portalId: data.id }
}

/** Studio side: update which steps are pushed (visible) to the client. */
export async function setPortalStepVisibility(portalId, stepVisibility) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { error } = await supabase
    .from('client_portals')
    .update({ step_visibility: stepVisibility, updated_at: new Date().toISOString() })
    .eq('id', portalId)
  if (error) return { ok: false, error: error.message || 'Couldn’t update the portal' }
  return { ok: true }
}

/** Studio side: refresh the fillable form snapshot pushed to the client. */
export async function setPortalDetectiveAnswers(portalId, detectiveAnswers) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { error } = await supabase
    .from('client_portals')
    .update({
      detective_answers: detectiveAnswers || {},
      form_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', portalId)
  if (error) return { ok: false, error: error.message || 'Couldn’t send the form' }
  return { ok: true }
}

/** Studio side: read the current portal + step statuses (owner-only, direct table read). */
export async function fetchPortalStudioView(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { data, error } = await supabase
    .from('client_portals')
    .select('*')
    .eq('id', portalId)
    .single()
  if (error) return { ok: false, error: error.message || 'Couldn’t load the portal' }
  return { ok: true, portal: data }
}

/** Studio side: post a message as the studio (owner-only RLS insert). */
export async function postStudioMessage(portalId, body) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { error } = await supabase
    .from('client_portal_messages')
    .insert({ portal_id: portalId, sender: 'studio', body })
  if (error) return { ok: false, error: error.message || 'Couldn’t send the message' }
  return { ok: true }
}

/** Studio side: read chat messages (owner-only, direct table read). */
export async function fetchStudioMessages(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { data, error } = await supabase
    .from('client_portal_messages')
    .select('*')
    .eq('portal_id', portalId)
    .order('created_at', { ascending: true })
  if (error) return { ok: false, error: error.message || 'Couldn’t load messages' }
  return { ok: true, messages: data || [] }
}

// ── Anon (client-facing) access — all via SECURITY DEFINER RPCs ──

/** Client side: fetch the portal's visible state (no auth). */
export async function fetchClientPortal(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { data, error } = await supabase.rpc('get_client_portal', { portal_id: portalId })
  if (error) return { ok: false, error: error.message || 'Couldn’t load the portal' }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { ok: false, error: 'This link isn’t valid' }
  return {
    ok: true,
    clientName: row.client_name,
    detectiveAnswers: row.detective_answers || {},
    stepVisibility: row.step_visibility || {},
    stepStatus: row.step_status || {},
    formStatus: row.form_status,
    submittedAnswers: row.submitted_answers || null,
  }
}

/** Client side: fetch chat messages (no auth). */
export async function fetchClientPortalMessages(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { data, error } = await supabase.rpc('get_client_portal_messages', {
    portal_id_in: portalId,
  })
  if (error) return { ok: false, error: error.message || 'Couldn’t load messages' }
  return { ok: true, messages: data || [] }
}

/** Client side: post a chat message (no auth, always sender='client'). */
export async function postClientPortalMessage(portalId, body) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { data, error } = await supabase.rpc('post_client_portal_message', {
    portal_id_in: portalId,
    body_in: body,
  })
  if (error) return { ok: false, error: error.message || 'Couldn’t send the message' }
  if (!data) return { ok: false, error: 'This link isn’t valid' }
  return { ok: true }
}

/** Client side: approve or request changes on a pushed step (no auth). */
export async function respondToPortalStep(portalId, stepId, status, note = '') {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { data, error } = await supabase.rpc('respond_client_portal_step', {
    portal_id_in: portalId,
    step_id_in: stepId,
    status_in: status,
    note_in: note,
  })
  if (error) return { ok: false, error: error.message || 'Couldn’t save your response' }
  if (!data) return { ok: false, error: 'This link isn’t valid' }
  return { ok: true }
}

/** Client side: submit the fillable Project overview form (single-use, no auth). */
export async function submitClientPortalForm(portalId, answers) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  const { data, error } = await supabase.rpc('submit_client_portal_form', {
    portal_id_in: portalId,
    submitted: answers || {},
  })
  if (error) return { ok: false, error: error.message || 'Couldn’t submit the form' }
  if (!data) return { ok: false, error: 'This form was already submitted' }
  return { ok: true }
}
