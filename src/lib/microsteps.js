/**
 * ADHD-friendly project → micro-step templates for creative work.
 * Short, concrete, one-action lines. No jargon.
 */

export const BREAKDOWN_DEPTHS = [
  {
    id: 'tiny',
    label: 'Tiny (5 steps)',
    hint: 'Low energy · under an hour of planning',
  },
  {
    id: 'standard',
    label: 'Standard (8 steps)',
    hint: 'Most projects · default',
  },
  {
    id: 'full',
    label: 'Full (12 steps)',
    hint: 'Big client work · when the fog is thick',
  },
]

/**
 * @param {{ goal: string, doneLooksLike: string, depth: string }} opts
 * @returns {string[]}
 */
export function generateProjectMicrosteps({
  goal,
  doneLooksLike,
  depth = 'standard',
}) {
  const g = (goal || 'this project').trim()
  const done = (doneLooksLike || 'a first shareable version').trim()

  const tiny = [
    `Write one sentence: what “${g}” must make someone feel`,
    `Define done: ${done}`,
    'List 3 hard constraints (time, tools, must-include)',
    'Add 5 reference images to the mood board',
    'Do a 15‑min messy first pass — ugly is allowed',
  ]

  const standard = [
    ...tiny.slice(0, 3),
    'Brain-dump every fear / open question (2 min, no editing)',
    'Circle the one question that unblocks everything else',
    'Add 5 reference images that match the feeling (not just style)',
    'Kill 2 directions — keep only one path',
    'Do a 15‑min messy first pass — ugly is allowed',
    `Name the single next visual decision for “${g}”`,
    'When ready: open Brand template or export a direction pack',
  ]

  const full = [
    `Name the project in plain words: “${g}”`,
    `Write the done line: ${done}`,
    'Who is this for? Write one real person (not “everyone”)',
    'List 3 constraints (deadline, tools, non‑negotiables)',
    'List 3 things this is NOT (protects scope)',
    'Brain-dump fears & open questions (timer 3 min)',
    'Pick the one blocker to solve first',
    'Mood board: 5–8 refs that match energy',
    'Write 3 direction options in one line each',
    'Choose one direction — archive the other two',
    '15‑min messy first pass (no polish)',
    'Ship a check-in: export pack or send one WIP to a human',
  ]

  if (depth === 'tiny') return tiny
  if (depth === 'full') return full
  return standard
}
