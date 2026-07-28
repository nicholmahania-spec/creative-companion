/**
 * Primary path — five stops (redesign brief).
 * Project → Work → Board → System → Pack
 *
 * Ideate (spark) and Review are Tools, not path siblings.
 * Step ids (define/research/sketch/design/deliver) stay stable for
 * pathStepHasContent + detective history; labels are user-facing.
 */

export const JOURNEY_STEPS = [
  {
    id: 'define',
    view: 'project',
    num: '1',
    label: 'Project',
    plain: 'Who is this for? How should it feel? Write one clear goal.',
    nextView: 'flow',
    nextLabel: 'Go to Work',
  },
  {
    id: 'sketch',
    view: 'flow',
    num: '2',
    label: 'Work',
    plain: 'One current step. Complete it, or capture the next small job.',
    nextView: 'studio',
    nextLabel: 'Go to Board',
  },
  {
    id: 'research',
    view: 'studio',
    num: '3',
    label: 'Board',
    plain: 'Save pictures and notes. Star up to 6 for the pack.',
    nextView: 'brand',
    nextLabel: 'Go to System',
  },
  {
    id: 'design',
    view: 'brand',
    num: '4',
    label: 'System',
    plain: 'Fonts, colors, voice, logo. Bump version before big edits.',
    nextView: 'finish',
    nextLabel: 'Go to Pack',
  },
  {
    id: 'deliver',
    view: 'finish',
    num: '5',
    label: 'Pack',
    plain: 'Preview the brand book. Download PDF. Note what you learned.',
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
    // Off-path Tools (not path siblings)
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
