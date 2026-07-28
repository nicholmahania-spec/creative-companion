import { describe, expect, it } from 'vitest'
import {
  JOURNEY_STEPS,
  PATH_VIEWS,
  journeyIdForView,
  getNextJourney,
  toolsLabelForView,
} from './journey'

describe('JOURNEY_STEPS five-stop path', () => {
  it('has exactly five path steps', () => {
    expect(JOURNEY_STEPS).toHaveLength(5)
    expect(PATH_VIEWS).toEqual([
      'studio',
      'project',
      'brand',
      'flow',
      'finish',
    ])
  })

  it('orders Research → Strategy → Identity → Touchpoints → Assets', () => {
    expect(JOURNEY_STEPS.map((s) => s.label)).toEqual([
      'Research',
      'Strategy',
      'Identity',
      'Touchpoints',
      'Assets',
    ])
  })

  it('carries Wheeler process phase names', () => {
    expect(JOURNEY_STEPS.map((s) => s.process)).toEqual([
      'Conducting research',
      'Clarifying strategy',
      'Designing identity',
      'Creating touchpoints',
      'Managing assets',
    ])
  })

  it('chains nextView without Ideate or Review', () => {
    let v = 'studio'
    const views = [v]
    for (let i = 0; i < 10; i += 1) {
      const next = getNextJourney(v)
      if (!next) break
      v = next.view
      views.push(v)
    }
    expect(views).toEqual([
      'studio',
      'project',
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
  })
})
