import { JOURNEY_STEPS, labelForStepId } from '../journey/journey'

/**
 * Keyword-based stage tagging for the running to-do list.
 * Guesses which of the 7 workflow stages an item belongs to from its
 * wording; falls back to whatever stage the user was on when they
 * added it if nothing matches.
 */

/**
 * Path stops in journey order, plus the two Tools stages this list also tags.
 *
 * Rendered directly as the group headings in RunningTodo. As a literal it
 * carried BOTH stale labels ("Project overview", "Sketch", "Design",
 * "Deliver") and a stale order — sketch before design, the sequence from
 * before Strategy moved ahead of Research — so the to-do list grouped work
 * under names and in an order the rest of the app had stopped using.
 */
export const RUNNING_TODO_STAGES = [
  ...JOURNEY_STEPS.map((s) => ({ id: s.id, label: s.label })),
  { id: 'ideate', label: labelForStepId('ideate') },
  { id: 'review', label: labelForStepId('review') },
]

const KEYWORDS = {
  define: ['goal', 'brief', 'audience', 'deadline', 'scope', 'who is this for', 'define'],
  research: ['research', 'reference', 'mood board', 'moodboard', 'inspiration', 'pin', 'competitor', 'study', 'link'],
  ideate: ['idea', 'ideate', 'brainstorm', 'concept', 'direction', 'spark', 'options'],
  sketch: ['sketch', 'draft', 'wireframe', 'rough', 'layout'],
  design: ['design', 'logo', 'color', 'colour', 'palette', 'font', 'typography', 'ui', 'visual', 'icon'],
  review: ['review', 'feedback', 'critique', 'proof', 'check', 'test', 'revise'],
  deliver: ['deliver', 'export', 'ship', 'handoff', 'hand off', 'client', 'send', 'final', 'package', 'invoice'],
}

/**
 * @param {string} text Item text.
 * @param {string} fallbackStage Stage id to use when no keyword matches
 *   (normally whichever stage the user is currently viewing).
 * @returns {string} A stage id from RUNNING_TODO_STAGES.
 */
export function guessRunningTodoStage(text, fallbackStage = 'define') {
  const lower = String(text || '').toLowerCase()
  for (const stage of RUNNING_TODO_STAGES) {
    const words = KEYWORDS[stage.id] || []
    if (words.some((w) => lower.includes(w))) return stage.id
  }
  const validFallback = RUNNING_TODO_STAGES.some((s) => s.id === fallbackStage)
  return validFallback ? fallbackStage : 'define'
}
