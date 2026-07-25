/**
 * Keyword-based stage tagging for the running to-do list.
 * Guesses which of the 7 workflow stages an item belongs to from its
 * wording; falls back to whatever stage the user was on when they
 * added it if nothing matches.
 */

export const RUNNING_TODO_STAGES = [
  { id: 'define', label: 'Project overview' },
  { id: 'research', label: 'Research' },
  { id: 'ideate', label: 'Ideate' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'design', label: 'Design' },
  { id: 'review', label: 'Review' },
  { id: 'deliver', label: 'Deliver' },
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
