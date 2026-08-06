import { JOURNEY_STEPS, labelForStepId } from '../journey/journey'
/**
 * Client inbox — one merged stream of everything clients did, across every
 * project.
 *
 * Why a content diff instead of timestamps: step responses and form
 * submissions are stored in `client_portals` as bare `{status, note}` JSON
 * with no per-event time — only the row's `updated_at` moves. Sorting or
 * splitting "new vs seen" by time would therefore drag every old approval
 * back above the line the moment any single new message arrived. So unread is
 * derived by comparing each event against a snapshot of what was last seen.
 *
 * No counts leave this module, and the only timestamp that does is `at`, on
 * message rows, where a real per-event `created_at` exists. Step/approval rows
 * have no `at` by design — see the note beside it. `sortAt` is internal
 * ordering data and must never be rendered. Unread stays a boolean per row,
 * and recency is expressed only as sort order plus the new/seen split.
 */
/**
 * Client-facing step names stay process language (Design, Research, …),
 * independent of the designer’s 5-stop path labels (System, Board, …).
 * Views still map for “open the right screen.”
 */
/* Path stops derived from the journey; Ideate and Review are Tools views the
   portal can still reference, so they keep an explicit entry. Restating the
   five stops here is how this map came to say "Project overview". */
const PORTAL_STEP_META = {
  ...Object.fromEntries(
    JOURNEY_STEPS.map((s) => [s.id, { label: s.label, view: s.view }])
  ),
  ideate: { label: labelForStepId('ideate'), view: 'spark' },
  review: { label: labelForStepId('review'), view: 'review' },
}

const STEP_LABEL = new Map(
  Object.entries(PORTAL_STEP_META).map(([id, m]) => [id, m.label])
)
const STEP_VIEW = new Map(
  Object.entries(PORTAL_STEP_META).map(([id, m]) => [id, m.view])
)

/** First line of a body, trimmed to something that fits one row. */
function firstLine(text, max = 140) {
  const line = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean)
  if (!line) return ''
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line
}

/**
 * Build the seen-snapshot for one portal. Stored verbatim in the app store
 * and compared field-by-field on the next load.
 */
export function portalSeenSnapshot(portal, messages) {
  const steps = {}
  Object.entries(portal?.step_status || {}).forEach(([stepId, v]) => {
    steps[stepId] = `${v?.status || ''}::${v?.note || ''}`
  })
  const mine = (messages || []).filter((m) => m.portal_id === portal?.id)
  const lastClient = [...mine].reverse().find((m) => m.sender === 'client')
  return {
    steps,
    formStatus: portal?.form_status || 'not_sent',
    lastClientMessageId: lastClient?.id || null,
    /* Both are write-once server-side, so the timestamp itself is the
       fingerprint — no content diff needed. Stored even when null, so the
       first time either lands it reads as new rather than as "already seen". */
    deliveryViewedAt: portal?.delivery_viewed_at || null,
    deliveryReactionAt: portal?.delivery_reaction_at || null,
  }
}

/**
 * Turn portals + messages into inbox rows.
 *
 * @param {object[]} portals    rows from `client_portals`
 * @param {object[]} messages   rows from `client_portal_messages`
 * @param {object} seen         { [portalId]: snapshot } from the store
 * @param {object[]} projects   local projects, to resolve names
 * @returns {{ rows: object[], hasUnread: boolean }}
 */
export function buildInboxRows(portals, messages, seen, projects) {
  const projectName = new Map(
    (projects || []).map((p) => [String(p.id), p.name || 'Untitled project'])
  )
  const rows = []

  ;(portals || []).forEach((portal) => {
    const prev = seen?.[portal.id] || null
    const who = portal.client_name || 'Your client'
    const project = projectName.get(String(portal.project_local_id)) || 'Another project'
    const base = {
      portalId: portal.id,
      projectLocalId: portal.project_local_id,
      projectName: project,
      clientName: who,
      // Approximate only — used for coarse ordering between portals, never
      // shown to the user. Per-event times don't exist server-side.
      sortAt: portal.updated_at || portal.created_at || '',
    }

    // ── Step approvals / change notes ──
    Object.entries(portal.step_status || {}).forEach(([stepId, v]) => {
      const status = v?.status
      if (status !== 'approved' && status !== 'changes_requested') return
      const stepLabel = STEP_LABEL.get(stepId) || stepId
      const fingerprint = `${status}::${v?.note || ''}`
      const unread = !prev || prev.steps?.[stepId] !== fingerprint

      rows.push({
        ...base,
        id: `${portal.id}:step:${stepId}`,
        kind: status === 'approved' ? 'approval' : 'notes',
        unread,
        stepId,
        stepLabel,
        targetView: STEP_VIEW.get(stepId) || null,
        // Neutral, non-verdict phrasing on purpose — "Changes requested" and
        // "Rejected" read as a judgement and get avoided rather than opened.
        title:
          status === 'approved'
            ? `${who} approved ${stepLabel}`
            : `Notes from ${who} on ${stepLabel}`,
        preview: firstLine(v?.note) || (status === 'approved' ? 'No notes added.' : ''),
        body: v?.note || '',
      })
    })

    /* ── The delivery was opened ──
       The one event in this inbox that is not something the client typed. It
       is here because it is the thing a designer most wants to know at the end
       of a project and has no other way to find out — the alternative is
       asking, which nobody does.

       It carries a real per-event timestamp (`delivery_viewed_at`), so unlike
       the step rows it gets an `at` and can honestly say when. */
    if (portal.delivery_viewed_at) {
      rows.push({
        ...base,
        id: `${portal.id}:delivery-viewed`,
        kind: 'delivery',
        unread: !prev || prev.deliveryViewedAt !== portal.delivery_viewed_at,
        at: portal.delivery_viewed_at,
        sortAt: portal.delivery_viewed_at,
        targetView: 'finish',
        /* The detail panel's fallback action reads "Go to {stepLabel}", so a
           row without one offers "Go to undefined". Taken from the journey,
           never typed out — see journeySingleSource.test.js. */
        stepLabel: labelForStepId('deliver'),
        title: `${who} opened the brand book`,
        preview: 'They have seen it.',
        body: '',
      })
    }

    // ── What they wrote back after the reveal ──
    if (portal.delivery_reaction) {
      rows.push({
        ...base,
        id: `${portal.id}:delivery-reaction`,
        kind: 'reaction',
        unread: !prev || prev.deliveryReactionAt !== portal.delivery_reaction_at,
        at: portal.delivery_reaction_at || '',
        sortAt: portal.delivery_reaction_at || base.sortAt,
        targetView: 'finish',
        stepLabel: labelForStepId('deliver'),
        title: `${who} wrote back about the brand book`,
        preview: firstLine(portal.delivery_reaction),
        body: portal.delivery_reaction,
      })
    }

    // ── Form submission ──
    if (portal.form_status === 'submitted') {
      rows.push({
        ...base,
        id: `${portal.id}:form`,
        kind: 'form',
        unread: !prev || prev.formStatus !== 'submitted',
        title: `${who} filled in the project overview`,
        preview: 'Their answers are ready for you to look over.',
        body: '',
      })
    }
  })

  // ── Client messages ──
  const byPortal = new Map((portals || []).map((p) => [p.id, p]))
  ;(messages || []).forEach((m) => {
    if (m.sender !== 'client') return
    const portal = byPortal.get(m.portal_id)
    if (!portal) return
    const prev = seen?.[portal.id] || null
    const who = portal.client_name || 'Your client'
    // Anything newer than the last message we'd seen is unread. With no
    // snapshot at all, only the newest message counts as new — a first-ever
    // open shouldn't light up every message the client ever sent.
    let unread
    if (!prev) {
      const clientMsgs = (messages || []).filter(
        (x) => x.portal_id === portal.id && x.sender === 'client'
      )
      unread = clientMsgs[clientMsgs.length - 1]?.id === m.id
    } else if (!prev.lastClientMessageId) {
      unread = true
    } else {
      const seenAt = (messages || []).find((x) => x.id === prev.lastClientMessageId)?.created_at
      unread = seenAt ? m.created_at > seenAt : true
    }

    rows.push({
      portalId: portal.id,
      projectLocalId: portal.project_local_id,
      projectName: projectName.get(String(portal.project_local_id)) || 'Another project',
      clientName: who,
      sortAt: m.created_at || '',
      /* `at` is the DISPLAYABLE time, and only message rows get one, because
         only messages carry a real per-event `created_at`. Step/approval rows
         deliberately have none: their `sortAt` is the portal's row-level
         `updated_at`, shared by every event on that portal, so rendering it
         would show the same age against several different approvals and move
         them all whenever anything else on the portal changed.
         Consumers must read `at`, never `sortAt` — the desk read `sortAt` and
         showed exactly that fabricated age. Keeping the rule in the data
         rather than in each view is what stops the next view repeating it. */
      at: m.created_at || '',
      id: `${portal.id}:msg:${m.id}`,
      kind: 'message',
      unread,
      title: `${who} sent a message`,
      preview: firstLine(m.body),
      body: m.body || '',
    })
  })

  // Unread first, then newest-known-activity first. The user never sees the
  // sort key — only "these are new" above the divider and the rest below.
  rows.sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1
    return String(b.sortAt).localeCompare(String(a.sortAt))
  })

  return { rows, hasUnread: rows.some((r) => r.unread) }
}
