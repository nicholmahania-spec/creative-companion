import { describe, expect, it } from 'vitest'
import {
  PROCESS_PHASES,
  REVIEW_QUESTIONS,
  getProcessPhase,
  processPhaseForView,
} from './processGuide'
import { JOURNEY_STEPS, journeyIdForView } from './journey'

describe('processGuide — 5 path steps + Tools coaching', () => {
  it('has five path phases matching journey order', () => {
    expect(PROCESS_PHASES.map((p) => p.id)).toEqual([
      'define',
      'sketch',
      'research',
      'design',
      'deliver',
    ])
  })

  it('PROCESS_PHASES spine matches JOURNEY_STEPS ids/views', () => {
    expect(PROCESS_PHASES.map((p) => p.id)).toEqual(
      JOURNEY_STEPS.map((s) => s.id)
    )
    expect(PROCESS_PHASES.map((p) => p.view)).toEqual(
      JOURNEY_STEPS.map((s) => s.view)
    )
  })

  it('resolves each path phase', () => {
    expect(getProcessPhase('define').short).toMatch(/Project/i)
    expect(getProcessPhase('deliver').view).toBe('finish')
  })

  it('maps path views to process phases', () => {
    expect(processPhaseForView('project')?.id).toBe('define')
    expect(processPhaseForView('flow')?.id).toBe('sketch')
    expect(processPhaseForView('studio')?.id).toBe('research')
    expect(processPhaseForView('brand')?.id).toBe('design')
    expect(processPhaseForView('finish')?.id).toBe('deliver')
  })

  it('still coaches Ideate and Review as Tools views', () => {
    expect(processPhaseForView('spark')?.id).toBe('ideate')
    expect(processPhaseForView('review')?.id).toBe('review')
    expect(getProcessPhase('ideate')?.prompt).toMatch(/messy|idea/i)
  })

  it('has review questions that avoid “do you like it?”', () => {
    expect(REVIEW_QUESTIONS.length).toBeGreaterThanOrEqual(3)
    expect(REVIEW_QUESTIONS.join(' ')).not.toMatch(/do you like it/i)
    expect(REVIEW_QUESTIONS.some((q) => /feel|confus|hierarchy/i.test(q))).toBe(
      true
    )
  })

  it('define prompt points at goal sheet', () => {
    expect(getProcessPhase('define').prompt).toMatch(/goal|who|sentence/i)
  })
})

describe('journey — five path stops', () => {
  it('has five path stops', () => {
    expect(JOURNEY_STEPS).toHaveLength(5)
    expect(JOURNEY_STEPS.map((s) => s.id)).toEqual([
      'define',
      'sketch',
      'research',
      'design',
      'deliver',
    ])
  })

  it('maps path views; Ideate/Review are off-path', () => {
    expect(journeyIdForView('project')).toBe('define')
    expect(journeyIdForView('spark')).toBe(null)
    expect(journeyIdForView('review')).toBe(null)
    expect(journeyIdForView('insights')).toBeNull()
  })
})
