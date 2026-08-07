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
 * 1. It only counts things that are genuinely WAITING — an unread client
 *    message, a revision round still open, a required brief answer nobody
 *    gave. Ordinary unfinished work is not a loose end. The brand check
 *    already says what is undocumented, and doubling that up here would
 *    make “you’re clear” unreachable on any live project, which turns the
 *    whole thing into noise.
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
 *   tasks?: array,
 *   clientRows?: array,   // clientInbox rows (already the full set)
 * }} input
 * @returns {{
 *   ends: Array<{ id: string, label: string, count: number, view: string }>,
 *   clear: boolean,
 *   checked: string[],
 *   headline: string,
 * }}
 */
export function looseEnds({ project = null, tasks = [], clientRows = [] } = {}) {
  const p = project || {}
  const ends = []

  const openTasks = (Array.isArray(tasks) ? tasks : []).filter(
    (t) => t && !t.completed
  )
  if (openTasks.length) {
    ends.push({
      id: 'tasks',
      label: `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}`,
      count: openTasks.length,
      view: 'desk',
    })
  }

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

  const missingBrief = getRequiredEmpty(p.detective || {}, p.deadline || '')
  if (missingBrief.length) {
    ends.push({
      id: 'brief',
      /* "nobody has given" was written for a two-party project, but the
         solo designer reading it IS the only person who could have given
         them — so it lands as an accusation from the tool. State the fact. */
      label: `${missingBrief.length} brief answer${missingBrief.length === 1 ? '' : 's'} not filled in yet`,
      count: missingBrief.length,
      view: 'project',
    })
  }

  const checked = [
    'open tasks',
    'client messages',
    'revision rounds',
    'feedback decisions',
    'required brief answers',
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
