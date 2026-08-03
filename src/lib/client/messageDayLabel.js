/**
 * Day labels for the studio<->client conversation, on the OWNER's side only.
 *
 * The client's own view keeps a conventional timestamp — a client is an
 * ordinary person judging whether their designer is responsive, and that is
 * what every other messaging surface they use shows. This module is for the
 * other side of the same thread.
 *
 * The owner has stated "I have no concept of time and numbers mean nothing".
 * Time blindness is not an inability to read a clock; it is the failure of a
 * number to convert into a felt sense of elapsed. So a clock time here is not
 * information — it is an input to a subtraction performed against a "now" that
 * has to be fetched from somewhere, billed on every message.
 *
 * Four categories, closed list: Today / Yesterday / the weekday name / Earlier.
 *
 * Why absolute day names and never an elapsed count: an absolute day states a
 * fact about the MESSAGE; "3 days unanswered" states a fact about the PERSON,
 * and the only edit that fixes it is the reply being avoided. Same data, and
 * only one of the two can be responded to.
 *
 * Why it collapses to a flat "Earlier" past the current week: the label must
 * stop growing once it is out of the actionable window, so an old thread does
 * not turn into a quietly bigger accusation every time it is opened.
 *
 * Why day-level and not per-message: one label per group rather than one per
 * message cuts decode events on a long thread from N to a handful, and the
 * grouping is what answers "is this still warm" on return from an interruption
 * — which the unread divider does not, since it marks what you have not seen
 * rather than how long it has sat.
 */

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

/** Local midnight for a Date — day boundaries, not 24-hour spans. */
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

const DAY_MS = 86400000

/**
 * @param {string} iso - a message's created_at
 * @param {Date} [now] - injectable so the label is testable without freezing
 *   the clock; callers pass nothing.
 * @returns {string} '' when the stamp is missing or unparseable — a message
 *   with no usable time gets no divider rather than a wrong one.
 */
export function messageDayLabel(iso, now = new Date()) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''

  const then = new Date(t)
  const days = Math.round((startOfDay(now) - startOfDay(then)) / DAY_MS)

  // A message stamped later than today (clock skew between the client's
  // device and this one) reads as Today rather than as a future weekday.
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return WEEKDAYS[then.getDay()]
  return 'Earlier'
}

/**
 * Group messages into consecutive runs sharing a day label, for rendering one
 * divider above each run.
 *
 * Returns runs in the order given — messages arrive oldest-first from the
 * query, and re-sorting here would silently disagree with the thread.
 *
 * @param {{created_at?: string}[]} messages
 * @param {Date} [now]
 * @returns {{label: string, messages: object[]}[]}
 */
export function groupMessagesByDay(messages, now = new Date()) {
  const runs = []
  for (const m of messages || []) {
    const label = messageDayLabel(m?.created_at, now)
    const last = runs[runs.length - 1]
    if (last && last.label === label) last.messages.push(m)
    else runs.push({ label, messages: [m] })
  }
  return runs
}
