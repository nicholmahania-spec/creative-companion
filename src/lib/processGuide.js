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
    /** Teacher plain: the big “what are we even making?” talk */
    plain:
      'Ask questions before pretty pictures. One-sentence goal. Must-haves vs nice-to-haves.',
    prompt:
      'What are we making? Who is it for? What should they feel? Goal in one sentence. Fill the Design Detective Sheet.',
    checks: [
      'Goal written in one clear sentence (detective sheet)',
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
    plain: 'Be a curious spy. Collect refs. Timebox 20 minutes so you don’t drown.',
    prompt:
      'Client past, competitors, audience cues. Mood board — not decoration yet. Timer optional.',
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
    plain: 'Throw lots of ideas. Messy is correct. Best idea often hides in #6–7.',
    prompt:
      'Force 5–8 messy directions. Try opposites. Don’t marry the first. Shortlist A/B/C.',
    checks: [
      'At least 5–8 sparks or directions tried (messy is correct)',
      'Opposite ideas tested (calm vs bold)',
      'Sparks pinned if useful',
      'Not married to the first idea',
      'One direction chosen (★) to sketch next',
    ],
    view: 'spark',
  },
  {
    id: 'sketch',
    label: '4 Sketch',
    short: 'Sketch',
    title: 'Sketch & draft',
    plain: '2–3 cleaner drafts. Low detail. Show options with a one-line why.',
    prompt:
      '2–3 drafts only. Each needs a one-line “why it fits the goal.” Under ~2 hours total.',
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
    plain: 'Make it strong: type, color, hierarchy. Name versions before big changes.',
    prompt:
      'Layout, type, color, hierarchy. Rules over vibes. Bump design version (v1 → v2).',
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
    plain: 'Show it. Ask specific questions. Fix what serves the goal — not every taste.',
    prompt:
      'Show as if to a client. Ask “Does this feel hopeful?” not “Do you like it?” Capture notes.',
    checks: [
      'Work shown as if to a client (not only yourself)',
      'Specific questions asked (not “do you like it?”)',
      'Feedback sorted: helps goal vs taste noise',
      'Notes captured for the revision pass',
      'Real audience glance if possible (one person is enough)',
    ],
    view: 'review',
  },
  {
    id: 'deliver',
    label: '7 Deliver',
    short: 'Deliver',
    title: 'Finalize, deliver & evaluate',
    plain: 'Ship files. Write a handoff note. One paragraph: what worked? what next?',
    prompt:
      'Brand book PDF + handoff note. One learnings paragraph. Celebrate, then note what felt like you.',
    checks: [
      'Files ready (print and/or brand book PDF)',
      'Watermark choice intentional for client',
      'Leave-behind not thin (tagline, palette, pins)',
      'Handoff note written',
      'Learnings written: what felt like “me”? what next?',
    ],
    view: 'finish',
  },
]

/** Specific feedback questions (Review) — better than “do you like it?” */
export const REVIEW_QUESTIONS = [
  'Does this feel hopeful / safe / clear for the audience?',
  'Is anything confusing in the first three seconds?',
  'Does the hierarchy match the goal (what they should see first)?',
  'Would you change one thing to better serve the brief?',
]

export function getProcessPhase(id) {
  return PROCESS_PHASES.find((p) => p.id === id) || null
}

/** Process phase for current path view */
export function processPhaseForView(view) {
  return PROCESS_PHASES.find((p) => p.view === view) || null
}
