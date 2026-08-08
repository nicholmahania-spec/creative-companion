/**
 * Loose ends — the one question worth answering at the end of a work session.
 *
 * “Am I caught up?” is normally unanswerable without opening six screens,
 * which means it never gets answered and the worry stays on instead. This
 * checks the five places something can actually be waiting and reports the
 * only two states that matter: you are clear, or here is what is open.
 *
 * TWO RULES
 *
 * 1. It only counts things that are genuinely WAITING ON SOMEBODY — an unread
 *    client message, a revision round still open, feedback with no verdict.
 *    Ordinary unfinished work is not a loose end. The brand check already
 *    says what is undocumented, and doubling that up here would make
 *    “you’re clear” unreachable on any live project, which turns the whole
 *    thing into noise.
 *
 *    TWO THINGS WERE REMOVED FROM THIS LIST ON 2026-08-08, both for the same
 *    reason: they were not waiting on anyone, so counting them made "loose
 *    ends" a second name for "work you have not finished".
 *
 *    - **Open tasks.** Your own to-do list, which already has a panel on this
 *      screen and a queue on Touchpoints. Reporting its length here as a
 *      loose end meant a designer with a healthy plan read "6 loose ends" and
 *      the number went UP as they broke work into steps — a count that
 *      punishes planning.
 *
 *    - **Unanswered brief questions.** These became rows reading "Write the
 *      goal in the brief", "Name the audience in the brief" — the CLIENT's
 *      answers, restated as the designer's chores, on the designer's
 *      workspace. The brief is the client's intake surface and Strategy
 *      already shows what is blank there, without the framing. (Owner,
 *      2026-08-08: "Do not turn client brief answers into designer tasks.")
 *
 * 2. “Clear” means clear of what it checked, and it says what it checked.
 *    A green light that quietly skipped something teaches you not to trust
 *    the next one.
 */

import { getRequiredEmpty } from '../brief/detectiveBrief'
import { sameProjectId } from '../journey/journeyProgress'

const text = (v) => String(v ?? '').trim()

/**
 * @param {{
 *   project?: object,
 *   clientRows?: array,   // clientInbox rows (already the full set)
 *   // `tasks` was a parameter until 2026-08-08. Callers may still pass it;
 *   // it is ignored. Your own to-do list is not something waiting on you.
 * }} input
 * @returns {{
 *   ends: Array<{ id: string, label: string, count: number, view: string }>,
 *   clear: boolean,
 *   checked: string[],
 *   headline: string,
 * }}
 */
export function looseEnds({ project = null, clientRows = [] } = {}) {
  const p = project || {}
  const ends = []

  const unread = (Array.isArray(clientRows) ? clientRows : []).filter(
    (r) => r?.unread && sameProjectId(r.projectLocalId, p.id)
  )
  if (unread.length) {
    ends.push({
      id: 'client',
      label: `${unread.length} thing${unread.length === 1 ? '' : 's'} from the client to look at`,
      count: unread.length,
      view: 'desk',
    })
  }

  const openRounds = (p.revisionRounds || []).filter((r) => r && !r.closedAt)
  if (openRounds.length) {
    ends.push({
      id: 'revisions',
      label: `${openRounds.length} revision round${openRounds.length === 1 ? '' : 's'} still open`,
      count: openRounds.length,
      view: 'review',
    })
  }

  const undecided = (p.feedbackLog || []).filter(
    (f) => f && text(f.issue) && !text(f.decision)
  )
  if (undecided.length) {
    ends.push({
      id: 'feedback',
      label: `${undecided.length} piece${undecided.length === 1 ? '' : 's'} of feedback with no decision`,
      count: undecided.length,
      view: 'review',
    })
  }

  /* Waiting ON THE CLIENT is a real loose end; a blank brief on a project
     that was never sent is not — it is just work that has not started, and
     naming it here made the client's questions read as the designer's
     chores. Reported only once the brief has actually gone out, and worded
     as what it is: somebody else's turn. */
  const sentToClient = !!(p.discoveryShareId || p.clientPortalId)
  const awaitingClient =
    sentToClient && p.discoveryShareStatus !== 'submitted'
      ? getRequiredEmpty(p.detective || {}, p.deadline || '')
      : []
  if (awaitingClient.length) {
    ends.push({
      id: 'brief',
      label: `Waiting on the client for ${awaitingClient.length} brief answer${
        awaitingClient.length === 1 ? '' : 's'
      }`,
      count: awaitingClient.length,
      view: 'project',
    })
  }

  const checked = [
    'client messages',
    'revision rounds',
    'feedback decisions',
    'answers the client still owes',
  ]

  /* Count THINGS, not kinds of thing.
     The headline counted `ends.length` — the number of categories — while
     each row below it counted the items inside one category. On a fresh
     project that rendered as "1 loose end" stacked directly above
     "5 brief answers…", two numbers in the same box, both true, neither
     reconcilable by the reader: is there one problem here or five?
     Summing the rows makes the headline the total of what is listed under
     it, which is the only reading anyone attempts. */
  const openCount = ends.reduce((n, e) => n + (e.count || 0), 0)

  return {
    ends,
    clear: ends.length === 0,
    checked,
    headline: ends.length
      ? `${openCount} loose end${openCount === 1 ? '' : 's'}`
      : 'You’re clear',
  }
}

/**
 * The sentence under “You’re clear”.
 *
 * Names what was looked at rather than making an unqualified promise, so the
 * green state stays true and stays trusted. Nothing is congratulatory: this
 * is a status, and dressing a status up as praise is what makes the next one
 * easy to ignore.
 */
export function clearLine(result) {
  if (!result?.clear) return ''
  return `Nothing waiting on you — ${result.checked.join(', ')} all clear.`
}
