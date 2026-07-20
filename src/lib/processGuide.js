/**
 * Design process coaching — prompts & checks layered on journey steps.
 * Spine ids/views come from JOURNEY_STEPS (single catalog).
 * Copy stays short and plain for easy reading.
 */

import { JOURNEY_STEPS } from './journey'

/** Coaching overlay per step id (plain/prompt/checks differ from path bar plain). */
const COACHING = {
  define: {
    title: 'Define the work',
    plain:
      'Answer the basics before you design. One goal sentence. What must be in. What is nice later.',
    prompt:
      'What are we making? Who is it for? How should they feel? Write the goal in one sentence. Use the goal sheet.',
    checks: [
      'Goal written in one clear sentence',
      'Who it is for (in simple words)',
      'What they should feel or do',
      'Must-have list and nice-to-have list',
      'Deadline, size, or other limits noted',
    ],
  },
  research: {
    title: 'Research & gather',
    plain: 'Collect pictures and notes. Stop after about 20 minutes so you do not drown.',
    prompt:
      'Look at past work, similar brands, and audience cues. Save refs — not final design yet. Timer is optional.',
    checks: [
      'Looked at past or client materials',
      '2–6 reference pictures on the board',
      'Colors or words that feel right saved',
      'Used a timer so research does not eat the day',
      'At least one picture starred ★ for the client pack',
    ],
  },
  ideate: {
    title: 'Ideas (Ideate)',
    plain: 'Make lots of ideas. Messy is fine. Keep your best three as A, B, C.',
    prompt:
      'Push for many messy directions. Try the opposite button. Do not marry the first idea. Keep A/B/C short.',
    checks: [
      'Tried several idea prompts (messy is fine)',
      'Tried opposite ideas (calm vs bold)',
      'Saved useful prompts',
      'Did not stick only to the first idea',
      'One direction chosen to sketch next',
    ],
  },
  sketch: {
    title: 'Sketch & draft',
    plain: '2–3 cleaner drafts. Low detail. Each needs one line on why it fits.',
    prompt:
      'Only 2–3 drafts. Each has one line: why it fits the goal. About 2 hours total.',
    checks: [
      '2–3 options sketched (not 20 polished ones)',
      'Each option has a one-line “why it fits”',
      'Time-boxed (about 2 hours for drafts)',
      'Current desk step is a draft choice, not polish',
      'Ready to pick one direction for Design',
    ],
  },
  design: {
    title: 'Design & refine',
    plain: 'Fonts, colors, layout. Name the version before big changes.',
    prompt:
      'Layout, type, color, clear order. Rules over vibes. Bump version (v1 → v2).',
    checks: [
      'Color jobs set (cover / text / accent / quiet)',
      'Font pair chosen; body text easy to read',
      'One main action in the design',
      'Space left empty on purpose',
      'Version named (v1 → v2) before big changes',
    ],
  },
  review: {
    title: 'Review & revise',
    plain: 'Show it. Ask specific questions. Fix what helps the goal — not every opinion.',
    prompt:
      'Show as if to a client. Ask “Does this feel hopeful?” not “Do you like it?” Write notes.',
    checks: [
      'Work shown as if to a client (not only yourself)',
      'Specific questions asked (not only “do you like it?”)',
      'Feedback sorted: helps goal vs pure taste',
      'Notes saved for the next pass',
      'One real person looked if possible',
    ],
  },
  deliver: {
    title: 'Deliver & look back',
    plain: 'Send the files. Write a short client note. One paragraph: what worked? what next?',
    prompt:
      'Brand book PDF + short handoff note. One learnings paragraph. Then note what felt like you.',
    checks: [
      'Files ready (print and/or brand book PDF)',
      'Watermark choice intentional for the client',
      'Client pack not empty (tagline, colors, or starred pictures)',
      'Handoff note written',
      'Learnings written: what felt like “me”? what next?',
    ],
  },
}

/**
 * Full process phases = journey spine + coaching.
 * id / view / num / short align with JOURNEY_STEPS.
 */
export const PROCESS_PHASES = JOURNEY_STEPS.map((s) => {
  const c = COACHING[s.id] || {}
  return {
    id: s.id,
    view: s.view,
    num: s.num,
    short: s.label,
    label: `${s.num} ${s.label}`,
    title: c.title || s.label,
    plain: c.plain || s.plain,
    prompt: c.prompt || s.plain,
    checks: c.checks || [],
  }
})

/** Specific feedback questions (Review) — better than “do you like it?” */
export const REVIEW_QUESTIONS = [
  'Does this feel hopeful / safe / clear for the audience?',
  'Is anything confusing in the first three seconds?',
  'What should they notice first — does the layout match that?',
  'Would you change one thing to better serve the goal?',
]

export function getProcessPhase(id) {
  return PROCESS_PHASES.find((p) => p.id === id) || null
}

/** Process phase for current path view */
export function processPhaseForView(view) {
  return PROCESS_PHASES.find((p) => p.view === view) || null
}
