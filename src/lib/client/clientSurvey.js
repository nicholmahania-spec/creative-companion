/**
 * Client survey question sets.
 *
 * The research's rules, and why each one is enforced here rather than left to
 * whoever writes the questions:
 *
 *  - **Goal first, then timing.** Mid-project surveys catch things that can
 *    still be fixed; post-project gets reflective answers; retainers get a
 *    quarterly round. Different moments want different questions, so the
 *    moment IS the question set — there is no blank survey builder.
 *  - **Five to ten questions, five minutes.** Enforced by a test, not by
 *    hoping.
 *  - **No catch-alls.** "How satisfied are you overall?" points to no fix.
 *    "Did the review process feel clear?" does. Every question here names one
 *    specific part of the process, so an answer is actionable on its own.
 *
 * There is no survey builder UI on purpose. A blank question list is exactly
 * the blank-canvas paralysis the app's other features were scoped down to
 * avoid, and a badly-worded survey is worse than no survey — it produces
 * answers you cannot act on and a client who feels surveyed.
 */

export const SURVEY_KINDS = [
  {
    id: 'mid',
    label: 'Partway through',
    blurb: 'Catches things that can still be fixed.',
  },
  {
    id: 'post',
    label: 'After handover',
    blurb: 'Reflective — what the work was actually like.',
  },
  {
    id: 'retainer',
    label: 'Quarterly check-in',
    blurb: 'For ongoing work.',
  },
]

/** Scale answers. Five points, worded — not numbered, per the no-numbers rule. */
export const SURVEY_SCALE = [
  'Not at all',
  'A little',
  'Somewhat',
  'Mostly',
  'Completely',
]

const MID = [
  { id: 'brief_understood', text: 'Does it look like we understood what you asked for?', type: 'scale' },
  { id: 'review_clear', text: 'Has the review process felt clear?', type: 'scale' },
  { id: 'response_speed', text: 'When you have asked something, have you heard back quickly enough?', type: 'scale' },
  { id: 'confidence', text: 'Do you feel confident about where this is heading?', type: 'scale' },
  { id: 'missing', text: 'Is there anything you expected to see by now that you have not?', type: 'text' },
  { id: 'change_now', text: 'If we changed one thing about how this is running, what would it be?', type: 'text' },
]

const POST = [
  { id: 'brief_met', text: 'Did the finished work do what you originally asked for?', type: 'scale' },
  { id: 'review_clear', text: 'Was the review process clear and collaborative?', type: 'scale' },
  { id: 'handover_usable', text: 'Did you need help using the files or guidelines?', type: 'scale' },
  { id: 'timeline', text: 'Did the timings match what you were told at the start?', type: 'scale' },
  { id: 'best_part', text: 'What part of working together went best?', type: 'text' },
  { id: 'friction', text: 'Where did it feel like hard work for you?', type: 'text' },
  { id: 'refer', text: 'What would you tell someone who asked whether to work with us?', type: 'text' },
]

const RETAINER = [
  { id: 'priorities_right', text: 'Are we spending the time on the right things?', type: 'scale' },
  { id: 'review_clear', text: 'Has the review process felt clear this quarter?', type: 'scale' },
  { id: 'response_speed', text: 'Have you heard back quickly enough when you needed to?', type: 'scale' },
  { id: 'value', text: 'Does the arrangement still feel worth it to you?', type: 'scale' },
  { id: 'next_quarter', text: 'What should we do more of next quarter?', type: 'text' },
  { id: 'stop', text: 'What should we stop doing?', type: 'text' },
]

const SETS = { mid: MID, post: POST, retainer: RETAINER }

/** Questions for a moment. Unknown kinds get the post-project set. */
export function surveyQuestions(kind) {
  return SETS[kind] || POST
}

export function surveyKindLabel(kind) {
  return SURVEY_KINDS.find((k) => k.id === kind)?.label || 'Survey'
}

/**
 * One line for the studio, naming its own next action. Three states, never a
 * date — "sent 3 days ago" is exactly the shape the work clock ruled out.
 */
export function surveyLine(status) {
  if (status === 'submitted') return 'Client answered the survey'
  if (status === 'sent') return 'Survey sent — waiting for the client'
  return 'Survey not sent'
}

/**
 * Group answers by the theme their question belongs to.
 *
 * The article's rule for reading results: one complaint is a preference,
 * several is a process gap. That only becomes visible if answers are grouped
 * by what they are about rather than listed in question order — `review_clear`
 * appears in all three sets precisely so it can be compared across them.
 */
export const SURVEY_THEMES = {
  brief_understood: 'The brief',
  brief_met: 'The brief',
  review_clear: 'Reviews',
  change_now: 'Reviews',
  response_speed: 'Communication',
  confidence: 'Communication',
  missing: 'Communication',
  timeline: 'Timings',
  handover_usable: 'Handover',
  best_part: 'Open',
  friction: 'Open',
  refer: 'Open',
  priorities_right: 'The brief',
  value: 'Open',
  next_quarter: 'Open',
  stop: 'Open',
}

export function themeFor(questionId) {
  return SURVEY_THEMES[questionId] || 'Open'
}

/**
 * Answered questions grouped by theme, for reading a returned survey.
 * Unanswered questions are dropped — a blank row says nothing.
 */
export function groupAnswers(kind, answers = {}) {
  const out = new Map()
  for (const q of surveyQuestions(kind)) {
    const a = answers?.[q.id]
    if (a === undefined || a === null || String(a).trim() === '') continue
    const theme = themeFor(q.id)
    if (!out.has(theme)) out.set(theme, [])
    out.get(theme).push({ ...q, answer: a })
  }
  return [...out.entries()].map(([theme, items]) => ({ theme, items }))
}
