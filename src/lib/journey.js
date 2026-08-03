/**
 * Primary path — five stops using brand-identity process language
 * (Wheeler / Logo Design Love), ordered for ADHD: brief first, then research.
 *
 *   Strategy → Research → Identity → Touchpoints → Assets
 *
 * Step ids (define/research/sketch/design/deliver) stay stable for
 * pathStepHasContent + detective history; labels are user-facing.
 * Ideate (spark) and Review are Tools, not path siblings.
 */

export const JOURNEY_STEPS = [
  {
    id: 'define',
    view: 'project',
    num: '1',
    label: 'Strategy',
    process: 'Clarifying strategy',
    plain:
      'Positioning and brief. Who is this for? How should it feel? One clear goal.',
    nextView: 'studio',
    nextLabel: 'Go to Research',
  },
  {
    id: 'research',
    view: 'studio',
    num: '2',
    label: 'Research',
    process: 'Conducting research',
    plain:
      'Gather refs, notes, and existing brand cues. Star up to 6 for the pack.',
    nextView: 'brand',
    nextLabel: 'Go to Identity',
  },
  {
    id: 'design',
    view: 'brand',
    num: '3',
    label: 'Identity',
    process: 'Designing identity',
    plain: 'Mark, words, colour, type, then preview. One screen at a time.',
    nextView: 'flow',
    nextLabel: 'Go to Touchpoints',
  },
  {
    id: 'sketch',
    view: 'flow',
    num: '4',
    label: 'Touchpoints',
    process: 'Creating touchpoints',
    plain:
      'Apply the system — desk steps, drafts, and real-world applications.',
    nextView: 'finish',
    nextLabel: 'Go to Assets',
  },
  {
    id: 'deliver',
    view: 'finish',
    num: '5',
    label: 'Assets',
    process: 'Managing assets',
    plain:
      'Brand book, PDF, tokens, handoff. Preview and download the leave-behind.',
    nextView: null,
    nextLabel: null,
  },
]

/** Path view ids only (for work clock, keyboard 1–5, etc.) */
export const PATH_VIEWS = JOURNEY_STEPS.map((s) => s.view)

/**
 * Map a path view to its journey step id. Tools return null.
 *
 * Derived from JOURNEY_STEPS rather than a switch listing the same pairs
 * again. The switch that used to live here was a second copy of the
 * view/id mapping declared above, and copies of a declared list are the
 * dominant defect in this codebase — they fail on correct changes (a
 * reorder) and stay silent on wrong ones (a stop that never got added).
 */
const VIEW_TO_ID = Object.fromEntries(JOURNEY_STEPS.map((s) => [s.view, s.id]))

export function journeyIdForView(view) {
  return VIEW_TO_ID[view] ?? null
}

/** Label for off-path Tools pages */
export function toolsLabelForView(view) {
  switch (view) {
    case 'home':
      return 'Home'
    case 'spark':
      return 'Ideate'
    case 'review':
      return 'Review'
    case 'insights':
      return 'Timer'
    case 'calendar':
      return 'Calendar'
    case 'clients':
      return 'Clients'
    case 'book':
      return 'Brand book'
    case 'settings':
      return 'Settings'
    case 'concept':
      return 'Sketches (frozen)'
    default:
      return 'Tools'
  }
}

export function getJourneyStep(view) {
  const id = journeyIdForView(view)
  return JOURNEY_STEPS.find((s) => s.id === id) || null
}

export function getNextJourney(view) {
  const step = getJourneyStep(view)
  if (!step?.nextView) return null
  return JOURNEY_STEPS.find((s) => s.view === step.nextView) || null
}

/**
 * The stop before this view on the path, or null on the first stop and on
 * Tools views. Derived from array order, not a `prevView` field — a second
 * hand-written chain would be one more copy to forget when a stop moves.
 * Used by the header's back affordance.
 */
export function getPrevJourney(view) {
  const idx = JOURNEY_STEPS.findIndex((s) => s.view === view)
  if (idx <= 0) return null
  return JOURNEY_STEPS[idx - 1]
}

/**
 * How many stops the path has.
 *
 * Exported so nothing has to restate it. The completion gates and the "N/M"
 * readouts each hard-coded 7 — the count from before Ideate and Review moved
 * under Tools — while the rows they counted came from JOURNEY_STEPS, which
 * has five. `doneCount` could therefore never reach the threshold: a fully
 * finished project reported 5/7, "Path full" and "Ready" were unreachable
 * states, and the app could only ever tell you what was still missing.
 */
export const PATH_STEP_COUNT = JOURNEY_STEPS.length

/**
 * The label to show for any view — path stop or Tools page.
 *
 * This is the single place a view becomes a word. Six separate modules
 * (the Helper status line, the resume banner, the to-do stage headings,
 * the client inbox, the badge list, the work log) each kept their own
 * copy of this mapping, and the v1.53.6 rename updated exactly one of
 * them. Everything else went on saying Sketch, Design, Deliver and
 * Project overview — names the app no longer uses anywhere else.
 */
export function labelForView(view) {
  const step = JOURNEY_STEPS.find((s) => s.view === view)
  if (step) return step.label
  return toolsLabelForView(view)
}

/**
 * The label for a journey step id (`design` -> `Identity`), falling back to
 * the id itself so an unknown or off-path id degrades to something readable
 * rather than to a specific stop's name.
 */
export function labelForStepId(id) {
  const step = JOURNEY_STEPS.find((s) => s.id === id)
  if (step) return step.label
  const TOOL_IDS = { ideate: 'Ideate', review: 'Review' }
  return TOOL_IDS[id] || id || 'Work'
}
