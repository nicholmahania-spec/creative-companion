import { describe, expect, it } from 'vitest'
import {
  PROCESS_PHASES,
  REVIEW_QUESTIONS,
  getProcessPhase,
  processPhaseForView,
} from './processGuide'
import { JOURNEY_STEPS, journeyIdForView } from './journey'

describe('processGuide — 7 design steps', () => {
  it('has exactly seven phases in order', () => {
    expect(PROCESS_PHASES.map((p) => p.id)).toEqual([
      'define',
      'research',
      'ideate',
      'sketch',
      'design',
      'review',
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

  it('resolves each phase', () => {
    expect(getProcessPhase('define').short).toBe('Define')
    expect(getProcessPhase('deliver').view).toBe('finish')
  })

  it('maps views to process phases', () => {
    expect(processPhaseForView('project')?.id).toBe('define')
    expect(processPhaseForView('studio')?.id).toBe('research')
    expect(processPhaseForView('spark')?.id).toBe('ideate')
    expect(processPhaseForView('flow')?.id).toBe('sketch')
    expect(processPhaseForView('brand')?.id).toBe('design')
    expect(processPhaseForView('review')?.id).toBe('review')
    expect(processPhaseForView('finish')?.id).toBe('deliver')
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

describe('journey — aligned to 7 process steps', () => {
  it('has seven path stops', () => {
    expect(JOURNEY_STEPS).toHaveLength(7)
    expect(JOURNEY_STEPS.map((s) => s.id)).toEqual([
      'define',
      'research',
      'ideate',
      'sketch',
      'design',
      'review',
      'deliver',
    ])
  })

  it('maps views correctly', () => {
    expect(journeyIdForView('project')).toBe('define')
    expect(journeyIdForView('spark')).toBe('ideate')
    expect(journeyIdForView('review')).toBe('review')
    expect(journeyIdForView('insights')).toBeNull()
  })
})
