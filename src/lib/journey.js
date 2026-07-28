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
    plain: 'Logo, color, type, voice. Bump version before big edits.',
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

/** Map path views to journey step id. Tools return null. */
export function journeyIdForView(view) {
  switch (view) {
    case 'project':
      return 'define'
    case 'flow':
      return 'sketch'
    case 'studio':
      return 'research'
    case 'brand':
      return 'design'
    case 'finish':
      return 'deliver'
    case 'spark':
    case 'review':
    case 'home':
    case 'insights':
    case 'calendar':
    case 'clients':
    case 'settings':
    case 'concept':
      return null
    default:
      return null
  }
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
