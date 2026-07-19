/**
 * One clear path through the product — no jargon.
 * Login → Project → Work → Ideas → Brand → Finish → Logout
 */

export const JOURNEY_STEPS = [
  {
    id: 'project',
    view: 'project',
    num: '1',
    label: 'Project',
    plain: 'Pick or name your project',
    nextView: 'flow',
    nextLabel: 'Go to Work',
  },
  {
    id: 'work',
    view: 'flow',
    num: '2',
    label: 'Work',
    plain: 'Write tasks. Do one step at a time',
    nextView: 'concept',
    nextLabel: 'Go to Ideas',
  },
  {
    id: 'ideas',
    view: 'concept',
    num: '3',
    label: 'Ideas',
    plain: 'Upload sketches. Lock your favorites. Fill the plan',
    nextView: 'brand',
    nextLabel: 'Go to Brand',
  },
  {
    id: 'brand',
    view: 'brand',
    num: '4',
    label: 'Brand',
    plain: 'Colors, words, and look of your project',
    nextView: 'finish',
    nextLabel: 'Go to Finish',
  },
  {
    id: 'finish',
    view: 'finish',
    num: '5',
    label: 'Finish',
    plain: 'Save a pack. Sign out when done',
    nextView: null,
    nextLabel: null,
  },
]

/** Map any app view to the journey step id */
export function journeyIdForView(view) {
  switch (view) {
    case 'project':
      return 'project'
    case 'flow':
    case 'insights':
    case 'calendar':
      return 'work'
    case 'concept':
    case 'studio':
    case 'spark':
      return 'ideas'
    case 'brand':
      return 'brand'
    case 'finish':
      return 'finish'
    default:
      return null
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
