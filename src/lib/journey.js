/**
 * Primary path — 7 design-process steps. Nothing more, nothing less.
 * Define → Research → Ideate → Sketch → Design → Review → Deliver
 * Tools (Timer, Calendar, Settings) stay off-path.
 */

export const JOURNEY_STEPS = [
  {
    id: 'define',
    view: 'project',
    num: '1',
    label: 'Define',
    plain: 'What are we making? Who is it for? One clear goal.',
    nextView: 'studio',
    nextLabel: 'Go to Research',
  },
  {
    id: 'research',
    view: 'studio',
    num: '2',
    label: 'Research',
    plain: 'Collect refs. Star up to 6 for the pack. 20-minute timer optional.',
    nextView: 'spark',
    nextLabel: 'Go to Ideate',
  },
  {
    id: 'ideate',
    view: 'spark',
    num: '3',
    label: 'Ideate',
    plain: 'Throw many directions fast. No judging. Pin sparks to Research.',
    nextView: 'flow',
    nextLabel: 'Go to Sketch',
  },
  {
    id: 'sketch',
    view: 'flow',
    num: '4',
    label: 'Sketch',
    plain: 'One draft step on screen. Complete it. Next rises.',
    nextView: 'brand',
    nextLabel: 'Go to Design',
  },
  {
    id: 'design',
    view: 'brand',
    num: '5',
    label: 'Design',
    plain: 'Type, color, voice, layout — live artboard. Polish with rules.',
    nextView: 'review',
    nextLabel: 'Go to Review',
  },
  {
    id: 'review',
    view: 'review',
    num: '6',
    label: 'Review',
    plain: 'Does it feel right? Confusing? Fix from real feedback.',
    nextView: 'finish',
    nextLabel: 'Go to Deliver',
  },
  {
    id: 'deliver',
    view: 'finish',
    num: '7',
    label: 'Deliver',
    plain: 'Print or download vector PDF. Hand off. Note what you learned.',
    nextView: null,
    nextLabel: null,
  },
]

/** Map path views to journey step id. Tools return null. */
export function journeyIdForView(view) {
  switch (view) {
    case 'project':
      return 'define'
    case 'studio':
      return 'research'
    case 'spark':
      return 'ideate'
    case 'flow':
      return 'sketch'
    case 'brand':
      return 'design'
    case 'review':
      return 'review'
    case 'finish':
      return 'deliver'
    default:
      return null
  }
}

/** Label for off-path Tools pages */
export function toolsLabelForView(view) {
  switch (view) {
    case 'insights':
      return 'Timer'
    case 'calendar':
      return 'Calendar'
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
