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
    plain: 'Who is this for? How should it feel? Write one clear goal.',
    nextView: 'studio',
    nextLabel: 'Go to Research',
  },
  {
    id: 'research',
    view: 'studio',
    num: '2',
    label: 'Research',
    plain: 'Save pictures and notes. Star up to 6. Use a timer so you stop.',
    nextView: 'spark',
    nextLabel: 'Go to Ideate',
  },
  {
    id: 'ideate',
    view: 'spark',
    num: '3',
    label: 'Ideate',
    plain: 'Many rough ideas first. Keep your best three (A, B, C).',
    nextView: 'flow',
    nextLabel: 'Go to Sketch',
  },
  {
    id: 'sketch',
    view: 'flow',
    num: '4',
    label: 'Sketch',
    plain: '2–3 rough drafts. Write why each fits. Stay under about 2 hours.',
    nextView: 'brand',
    nextLabel: 'Go to Design',
  },
  {
    id: 'design',
    view: 'brand',
    num: '5',
    label: 'Design',
    plain: 'Fonts, colors, voice, logo. Change the version number before big edits.',
    nextView: 'review',
    nextLabel: 'Go to Review',
  },
  {
    id: 'review',
    view: 'review',
    num: '6',
    label: 'Review',
    plain: 'Show the work. Ask a clear question. Fix what helps the goal.',
    nextView: 'finish',
    nextLabel: 'Go to Deliver',
  },
  {
    id: 'deliver',
    view: 'finish',
    num: '7',
    label: 'Deliver',
    plain: 'Download the brand book. Write a short client note. Note what you learned.',
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
