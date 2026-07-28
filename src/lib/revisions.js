/**
 * Revision rounds and what they cost.
 *
 * The app had no concept of a revision. Review existed as a *stage* — a place
 * you passed through — not as a countable thing with an agreed limit. So
 * "am I on round two or round five, and was that agreed?" was a question the
 * app could not answer, and the honest answer for a solo studio is usually
 * "round five, unpaid".
 *
 * The rule this encodes is the one the research kept repeating: a revision
 * count is a NUMBER agreed up front, not "as needed". Everything here is
 * derived from that number and a list of rounds.
 *
 * What this deliberately does NOT do is block. Reaching the limit changes what
 * the app SAYS, never what it lets you do — a hard gate in front of work
 * you're ready to start is exactly the friction this app exists to remove.
 */

export const REVISION_BILLING = [
  { id: 'perRound', label: 'A flat fee per extra round' },
  { id: 'hourly', label: 'By the hour' },
  { id: 'flat', label: 'One flat fee, however many rounds' },
]

/** Default when nothing has been agreed. The research's own worked example. */
export const DEFAULT_REVISIONS_INCLUDED = 2

const num = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Where the project stands on revisions.
 *
 * `number` is the round a person would say out loud — an open round 3 is
 * "round 3", and with none open it is the count of what has been done.
 */
export function revisionSummary(rounds = [], included = DEFAULT_REVISIONS_INCLUDED) {
  const list = Array.isArray(rounds) ? rounds : []
  const limit = Math.max(0, Math.round(num(included, DEFAULT_REVISIONS_INCLUDED)))
  const open = list.find((r) => r && !r.closedAt) || null
  const completed = list.filter((r) => r && r.closedAt).length
  const number = open ? completed + 1 : completed

  /* Beyond means this round is past what was agreed. An open round 3 with 2
     included is beyond; a *closed* count of 2 with 2 included is not — it is
     exactly what was sold. */
  const isBeyond = open ? number > limit : completed > limit
  const remaining = Math.max(0, limit - (open ? number : completed))

  return {
    open,
    openId: open?.id || '',
    completed,
    number,
    included: limit,
    isBeyond,
    remaining,
    /* True when the NEXT round would be the first unpaid one — the moment to
       say something, rather than after the work is already done. */
    nextIsBeyond: completed >= limit,
    total: list.length,
  }
}

/**
 * One line of plain language for the current state.
 *
 * No dates, no elapsed time, no "3 days ago". The owner has stated plainly
 * that numbers and time do not register, so this names the round and what it
 * means, and nothing else.
 */
export function revisionLine(rounds = [], included = DEFAULT_REVISIONS_INCLUDED) {
  const s = revisionSummary(rounds, included)
  if (s.open) {
    return s.isBeyond
      ? `Round ${s.number} — past the ${s.included} you agreed`
      : `Round ${s.number} of ${s.included}`
  }
  if (s.completed === 0) return `No rounds yet — ${s.included} agreed`
  if (s.nextIsBeyond) return `${s.completed} done — the next one is extra`
  return `${s.completed} of ${s.included} done`
}

/**
 * What an extra round is worth, given how the studio said it bills them.
 *
 * Returns null when there is nothing to charge — either the round was
 * included, or no rate was ever agreed. Null means "do not put a line on the
 * invoice", which is different from zero, which would put a £0 line on it.
 */
export function roundCharge({ billing, rate, hours = 0, isBeyond = true } = {}) {
  if (!isBeyond) return null
  const r = num(rate, 0)
  if (r <= 0) return null
  if (billing === 'hourly') {
    const h = num(hours, 0)
    if (h <= 0) return null
    return r * h
  }
  if (billing === 'flat') return r
  // perRound is the default reading of "additional changes billed at $X per round"
  return r
}

/** The four columns the style-guide article's feedback log uses. */
export const FEEDBACK_STATUS = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'wontfix', label: 'Not doing' },
]

/**
 * A scope is only agreed if every part of it has an answer. This returns what
 * is still blank, in the order the checklist asks for it.
 *
 * Nothing here blocks anything — it is the same "gaps" shape Review already
 * uses to show what is missing without standing in the way.
 */
export function scopeGaps(project = {}) {
  const d = project?.detective || {}
  const picked = Array.isArray(d.deliverablesPicked) ? d.deliverablesPicked : []
  const gaps = []
  if (!picked.length && !String(d.deliverables || '').trim())
    gaps.push({ id: 'deliverables', label: 'What you are making' })
  if (!num(project.scopeRevisionsIncluded, 0))
    gaps.push({ id: 'revisions', label: 'How many revision rounds' })
  if (!String(d.technical || '').trim())
    gaps.push({ id: 'formats', label: 'File formats' })
  if (!String(project.scopeApprover || '').trim())
    gaps.push({ id: 'approver', label: 'Who signs it off' })
  if (!String(project.scopeOutOf || '').trim())
    gaps.push({ id: 'outOfScope', label: 'What is not included' })
  return gaps
}
