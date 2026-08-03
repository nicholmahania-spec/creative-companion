import { describe, expect, it } from 'vitest'
import {
  JOURNEY_STEPS,
  PATH_VIEWS,
  journeyIdForView,
  getNextJourney,
  toolsLabelForView,
  isToolsMenuView,
} from './journey'

describe('JOURNEY_STEPS five-stop path', () => {
  it('has exactly five path steps', () => {
    expect(JOURNEY_STEPS).toHaveLength(5)
    expect(PATH_VIEWS).toEqual([
      'project',
      'studio',
      'brand',
      'flow',
      'finish',
    ])
  })

  it('orders Strategy → Research → Identity → Touchpoints → Assets', () => {
    expect(JOURNEY_STEPS.map((s) => s.label)).toEqual([
      'Strategy',
      'Research',
      'Identity',
      'Touchpoints',
      'Assets',
    ])
  })

  it('carries process phase names (brief first, then research)', () => {
    expect(JOURNEY_STEPS.map((s) => s.process)).toEqual([
      'Clarifying strategy',
      'Conducting research',
      'Designing identity',
      'Creating touchpoints',
      'Managing assets',
    ])
  })

  it('chains nextView without Ideate or Review', () => {
    let v = 'project'
    const views = [v]
    for (let i = 0; i < 10; i += 1) {
      const next = getNextJourney(v)
      if (!next) break
      v = next.view
      views.push(v)
    }
    expect(views).toEqual([
      'project',
      'studio',
      'brand',
      'flow',
      'finish',
    ])
  })

  it('maps path views and treats Ideate/Review as tools', () => {
    expect(journeyIdForView('project')).toBe('define')
    expect(journeyIdForView('flow')).toBe('sketch')
    expect(journeyIdForView('studio')).toBe('research')
    expect(journeyIdForView('brand')).toBe('design')
    expect(journeyIdForView('finish')).toBe('deliver')
    expect(journeyIdForView('spark')).toBe(null)
    expect(journeyIdForView('review')).toBe(null)
    expect(toolsLabelForView('spark')).toBe('Ideate')
    expect(toolsLabelForView('review')).toBe('Review')
    expect(isToolsMenuView('spark')).toBe(true)
    expect(isToolsMenuView('home')).toBe(false)
    expect(isToolsMenuView('project')).toBe(false)
  })
})
