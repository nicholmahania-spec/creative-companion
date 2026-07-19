/**
 * Primary path — five stops only.
 * Project → Work → Board → System → Pack
 * Tools (Timer, Spark, Calendar, Settings) are off-path.
 */

export const JOURNEY_STEPS = [
  {
    id: 'project',
    view: 'project',
    num: '1',
    label: 'Project',
    plain: 'Name the work. Who is it for?',
    nextView: 'flow',
    nextLabel: 'Go to Work',
  },
  {
    id: 'work',
    view: 'flow',
    num: '2',
    label: 'Work',
    plain: 'One step only. Complete it. Next rises.',
    nextView: 'studio',
    nextLabel: 'Go to Board',
  },
  {
    id: 'board',
    view: 'studio',
    num: '3',
    label: 'Board',
    plain: 'Upload refs. Star up to 6 for the pack.',
    nextView: 'brand',
    nextLabel: 'Go to System',
  },
  {
    id: 'system',
    view: 'brand',
    num: '4',
    label: 'System',
    plain: 'Colors, voice, type, do / don’t — live artboard.',
    nextView: 'finish',
    nextLabel: 'Go to Pack',
  },
  {
    id: 'pack',
    view: 'finish',
    num: '5',
    label: 'Pack',
    plain: 'Preview and download your brand pack.',
    nextView: null,
    nextLabel: null,
  },
]

/** Map path views to journey step id. Tools return null (do not fake Work active). */
export function journeyIdForView(view) {
  switch (view) {
    case 'project':
      return 'project'
    case 'flow':
      return 'work'
    case 'studio':
      return 'board'
    case 'brand':
      return 'system'
    case 'finish':
      return 'pack'
    default:
      return null
  }
}

/** Label for off-path Tools pages (path bar truth) */
export function toolsLabelForView(view) {
  switch (view) {
    case 'insights':
      return 'Timer'
    case 'calendar':
      return 'Calendar'
    case 'spark':
      return 'Spark'
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
