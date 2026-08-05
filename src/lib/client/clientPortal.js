/**
 * Client portal — a no-login dashboard link for a project's client.
 * Studio side chooses which of the journey steps are "pushed" (visible)
 * to the client; the client can view what's pushed, approve or request
 * changes per step, chat with the studio, and fill in the Project overview
 * form themselves if asked to.
 *
 * Server side: public.client_portals (owner-only RLS) + public.client_portal_messages
 * (owner-only RLS), plus SECURITY DEFINER RPCs so the anon client never
 * touches the tables directly (mirrors discoveryShare.js's pattern).
 */
import { supabase, isSupabaseConfigured } from '../supabase'
import { ANSWERS_TOO_LARGE_MESSAGE, answersTooLarge } from './answerPayload'
import { publicUrl } from '../appPaths'
import { CLOUD_REQUIRED } from './cloudRequired.js'

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
    return { ok: false, error: CLOUD_REQUIRED }
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

  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t create the portal', error)
    return { ok: false, error: 'Couldn’t create the portal' }
  }
  return { ok: true, portalId: data.id }
}

/**
 * Studio side: revoke a client portal link (audit #19). Owner-scoped RLS
 * update sets revoked_at; every anon RPC then treats the link as not-found,
 * so a leaked/forwarded link is killed without deleting the row (the client's
 * answers, chat and approvals survive). Reversible by clearing revoked_at.
 */
export async function revokeClientPortal(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('client_portals')
    .update({ revoked_at: now, updated_at: now })
    .eq('id', portalId)
  if (error) {
    console.warn('Couldn’t revoke the portal', error)
    return { ok: false, error: 'Couldn’t revoke the link' }
  }
  return { ok: true }
}

/** Studio side: update which steps are pushed (visible) to the client. */
export async function setPortalStepVisibility(portalId, stepVisibility) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { error } = await supabase
    .from('client_portals')
    .update({ step_visibility: stepVisibility, updated_at: new Date().toISOString() })
    .eq('id', portalId)
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t update the portal', error)
    return { ok: false, error: 'Couldn’t update the portal' }
  }
  return { ok: true }
}

/** Studio side: refresh the fillable form snapshot pushed to the client. */
export async function setPortalDetectiveAnswers(portalId, detectiveAnswers) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { error } = await supabase
    .from('client_portals')
    .update({
      detective_answers: detectiveAnswers || {},
      form_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', portalId)
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t send the form', error)
    return { ok: false, error: 'Couldn’t send the form' }
  }
  return { ok: true }
}

/**
 * Studio side: send the survey for a moment.
 *
 * One gesture. Picking the moment picks the questions, sets the status and
 * puts it in the portal the client already has — no draft step, no question
 * editor, and no separate link to copy and then lose.
 */
export async function sendPortalSurvey(portalId, kind, questions) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { error } = await supabase
    .from('client_portals')
    .update({
      survey_kind: kind,
      survey_questions: questions || [],
      survey_status: 'sent',
      /* Clear the previous answers along with the questions they answered.
         A new survey showing the last round's replies is worse than empty. */
      survey_answers: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', portalId)
  if (error) {
    // Log the driver's message, show the human one.
    console.warn('Couldn’t send the survey', error)
    return { ok: false, error: 'Couldn’t send the survey' }
  }
  return { ok: true }
}

/** Studio side: read the current portal + step statuses (owner-only, direct table read). */
export async function fetchPortalStudioView(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { data, error } = await supabase
    .from('client_portals')
    .select('*')
    .eq('id', portalId)
    .single()
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t load the portal', error)
    return { ok: false, error: 'Couldn’t load the portal' }
  }
  return { ok: true, portal: data }
}

/** Studio side: post a message as the studio (owner-only RLS insert). */
export async function postStudioMessage(portalId, body) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { error } = await supabase
    .from('client_portal_messages')
    .insert({ portal_id: portalId, sender: 'studio', body })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t send the message', error)
    return { ok: false, error: 'Couldn’t send the message' }
  }
  return { ok: true }
}

/** Studio side: read chat messages (owner-only, direct table read). */
export async function fetchStudioMessages(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { data, error } = await supabase
    .from('client_portal_messages')
    .select('*')
    .eq('portal_id', portalId)
    .order('created_at', { ascending: true })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t load messages', error)
    return { ok: false, error: 'Couldn’t load messages' }
  }
  return { ok: true, messages: data || [] }
}

/**
 * Studio side: every portal this user owns, across all projects.
 *
 * This is the only server-side way to find a portal — `clientPortalId` lives
 * in localStorage on one device, so without this a cleared cache or a second
 * machine orphans a portal permanently. RLS already scopes to the owner; the
 * explicit `owner_id` filter is belt-and-braces.
 *
 * @returns {Promise<{ ok: true, portals: object[] } | { ok: false, error: string, signedOut?: boolean }>}
 */
export async function fetchOwnerPortals() {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { data: userData } = await supabase.auth.getUser()
  const ownerId = userData?.user?.id
  if (!ownerId) {
    return { ok: false, signedOut: true, error: 'Sign in to see client activity' }
  }
  const { data, error } = await supabase
    .from('client_portals')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t load your client links', error)
    return { ok: false, error: 'Couldn’t load your client links' }
  }
  return { ok: true, portals: data || [] }
}

/**
 * Studio side: messages for many portals in one round trip.
 * @param {string[]} portalIds
 */
export async function fetchMessagesForPortals(portalIds) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const ids = (portalIds || []).filter(Boolean)
  if (!ids.length) return { ok: true, messages: [] }
  const { data, error } = await supabase
    .from('client_portal_messages')
    .select('*')
    .in('portal_id', ids)
    .order('created_at', { ascending: true })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t load messages', error)
    return { ok: false, error: 'Couldn’t load messages' }
  }
  return { ok: true, messages: data || [] }
}

// ── Anon (client-facing) access — all via SECURITY DEFINER RPCs ──

/** Client side: fetch the portal's visible state (no auth). */
export async function fetchClientPortal(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { data, error } = await supabase.rpc('get_client_portal', { portal_id: portalId })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t load the portal', error)
    return { ok: false, error: 'Couldn’t load the portal' }
  }
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
    surveyKind: row.survey_kind || '',
    surveyStatus: row.survey_status || 'not_sent',
    surveyQuestions: Array.isArray(row.survey_questions)
      ? row.survey_questions
      : [],
  }
}

/** Client side: fetch chat messages (no auth). */
export async function fetchClientPortalMessages(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { data, error } = await supabase.rpc('get_client_portal_messages', {
    portal_id_in: portalId,
  })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t load messages', error)
    return { ok: false, error: 'Couldn’t load messages' }
  }
  return { ok: true, messages: data || [] }
}

/** Client side: post a chat message (no auth, always sender='client'). */
export async function postClientPortalMessage(portalId, body) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { data, error } = await supabase.rpc('post_client_portal_message', {
    portal_id_in: portalId,
    body_in: body,
  })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t send the message', error)
    return { ok: false, error: 'Couldn’t send the message' }
  }
  if (!data) return { ok: false, error: 'This link isn’t valid' }
  return { ok: true }
}

/** Client side: approve or request changes on a pushed step (no auth). */
export async function respondToPortalStep(portalId, stepId, status, note = '') {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { data, error } = await supabase.rpc('respond_client_portal_step', {
    portal_id_in: portalId,
    step_id_in: stepId,
    status_in: status,
    note_in: note,
  })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t save your response', error)
    return { ok: false, error: 'Couldn’t save your response' }
  }
  if (!data) return { ok: false, error: 'This link isn’t valid' }
  return { ok: true }
}

/** Client side: submit the fillable Project overview form (single-use, no auth). */
export async function submitClientPortalForm(portalId, answers) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  /* Before the round trip, not after: the RPC signals "too large" and "already
     submitted" the same way (false), so an oversize payload that reaches it
     comes back as a message telling the client they are finished when they are
     not — on a link that only works once. Caught here, the link is not burned
     and the message can name the one thing they can do about it. */
  if (answersTooLarge(answers)) {
    return { ok: false, error: ANSWERS_TOO_LARGE_MESSAGE }
  }
  const { data, error } = await supabase.rpc('submit_client_portal_form', {
    portal_id_in: portalId,
    submitted: answers || {},
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

/** Client side: submit the survey (single-use, no auth). */
export async function submitClientPortalSurvey(portalId, answers) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  /* Before the round trip, not after: the RPC signals "too large" and "already
     submitted" the same way (false), so an oversize payload that reaches it
     comes back as a message telling the client they are finished when they are
     not — on a link that only works once. Caught here, the link is not burned
     and the message can name the one thing they can do about it. */
  if (answersTooLarge(answers)) {
    return { ok: false, error: ANSWERS_TOO_LARGE_MESSAGE }
  }
  const { data, error } = await supabase.rpc('submit_client_portal_survey', {
    portal_id_in: portalId,
    submitted: answers || {},
  })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Couldn’t send your answers', error)
    return { ok: false, error: 'Couldn’t send your answers' }
  }
  if (!data) return { ok: false, error: 'This survey was already answered' }
  return { ok: true }
}
