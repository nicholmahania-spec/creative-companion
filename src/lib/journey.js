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
    nextView: 'concept',
    nextLabel: 'Go to Ideas',
  },
  {
    id: 'ideas',
    view: 'concept',
    num: '3',
    label: 'Ideas',
    plain: 'Sketch, lock favorites, fill the concept pack',
    nextView: 'brand',
    nextLabel: 'Go to Brand',
  },
  {
    id: 'brand',
    view: 'brand',
    num: '4',
    label: 'Brand',
    plain: 'Colors, voice, type, do / don’t',
    nextView: 'finish',
    nextLabel: 'Go to Finish',
  },
  {
    id: 'finish',
    view: 'finish',
    num: '5',
    label: 'Finish',
    plain: 'Export your brand pack. Then rest or start the next step.',
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
