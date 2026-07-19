/**
 * Design process — 7 steps. Nothing more, nothing less.
 * Matches the professional graphic design process used as product spine.
 *
 * 1 Define → 2 Research → 3 Ideate → 4 Sketch → 5 Design → 6 Review → 7 Deliver
 */

export const PROCESS_PHASES = [
  {
    id: 'define',
    label: '1 Define',
    short: 'Define',
    title: 'Define & discover',
    prompt:
      'What are we making? Who is it for? What should they feel? Goal in one sentence.',
    checks: [
      'Client / project goal written in one clear sentence',
      'Who it is for (audience in plain words)',
      'What they should feel or do',
      'Must-haves vs nice-to-haves listed',
      'Deadline / format / constraint noted',
    ],
    view: 'project',
  },
  {
    id: 'research',
    label: '2 Research',
    short: 'Research',
    title: 'Research & discovery',
    prompt:
      'Be a curious spy: refs, competitors, audience cues. Mood board — not decoration yet.',
    checks: [
      'Client / past materials glanced at',
      '2–6 reference pins on the board',
      'Colors / words that feel right saved',
      'Timer used so research does not swallow the day',
      'At least one pin starred ★ for the pack',
    ],
    view: 'studio',
  },
  {
    id: 'ideate',
    label: '3 Ideate',
    short: 'Ideate',
    title: 'Ideate & brainstorm',
    prompt:
      'Throw many directions fast. No erasing. Best idea often hides in sketch 6–7.',
    checks: [
      'At least 5–8 directions tried (messy is correct)',
      'Opposite ideas tested (calm vs bold)',
      'Sparks pinned if useful',
      'Not married to the first idea',
      'One direction chosen to sketch next',
    ],
    view: 'spark',
  },
  {
    id: 'sketch',
    label: '4 Sketch',
    short: 'Sketch',
    title: 'Sketch & draft',
    prompt:
      '2–3 cleaner drafts only. Low detail so changes stay cheap. Show options.',
    checks: [
      '2–3 options sketched (not 20 polished)',
      'Each option has a one-line “why it fits the goal”',
      'Time-boxed (under ~2 hours for drafts)',
      'Current desk step is a draft decision, not polish',
      'Ready to pick one direction for Design',
    ],
    view: 'flow',
  },
  {
    id: 'design',
    label: '5 Design',
    short: 'Design',
    title: 'Design & refine',
    prompt:
      'Layout, type, color, hierarchy. Rules over vibes. Save versions.',
    checks: [
      'Palette roles set (cover / text / accent / quiet)',
      'Type pair chosen; body contrast readable',
      'One primary action in the composition',
      'Whitespace intentional',
      'Version named (v1 → v2) before big changes',
    ],
    view: 'brand',
  },
  {
    id: 'review',
    label: '6 Review',
    short: 'Review',
    title: 'Review, revise & test',
    prompt:
      'Show it. Ask: Does this feel hopeful / clear / confusing? Fix what serves the goal.',
    checks: [
      'Work shown as if to a client (not only yourself)',
      'Specific questions asked (not “do you like it?”)',
      'Feedback sorted: helps goal vs taste noise',
      'One revision pass scheduled',
      'Real audience glance if possible (one person is enough)',
    ],
    view: 'review',
  },
  {
    id: 'deliver',
    label: '7 Deliver',
    short: 'Deliver',
    title: 'Finalize, deliver & evaluate',
    prompt:
      'Print-ready or vector PDF. Organized handoff. One paragraph: what worked?',
    checks: [
      'Files ready (print and/or vector PDF)',
      'Watermark choice intentional for client',
      'Pack not thin (tagline, palette, pins)',
      'Handoff note or brief copied if needed',
      'One-line eval: what felt like “me”? what next?',
    ],
    view: 'finish',
  },
]

export function getProcessPhase(id) {
  return PROCESS_PHASES.find((p) => p.id === id) || null
}

/** Process phase for current path view */
export function processPhaseForView(view) {
  return PROCESS_PHASES.find((p) => p.view === view) || null
}
