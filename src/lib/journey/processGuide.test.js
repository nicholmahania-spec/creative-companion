import { describe, expect, it } from 'vitest'
import {
  PROCESS_PHASES,
  REVIEW_QUESTIONS,
  getProcessPhase,
  processPhaseForView,
} from './processGuide'
import { JOURNEY_STEPS, journeyIdForView } from './journey'

describe('processGuide — 5 path steps + Tools coaching', () => {
  /* The frozen list that used to live here duplicated the derived assertion
     below, and went stale the moment the path was reordered — failing on a
     product change that was entirely intentional. A test that hard-codes what
     another module declares tests the copy, not the thing. */

  it('PROCESS_PHASES spine matches JOURNEY_STEPS ids/views', () => {
    expect(PROCESS_PHASES.map((p) => p.id)).toEqual(
      JOURNEY_STEPS.map((s) => s.id)
    )
    expect(PROCESS_PHASES.map((p) => p.view)).toEqual(
      JOURNEY_STEPS.map((s) => s.view)
    )
  })

  it('resolves each path phase', () => {
    /* Reads the label from the journey rather than restating it: `short` IS
       `s.label` (processGuide.js), so spelling it out here only asserts that
       nobody renamed a stop. */
    const defineStep = JOURNEY_STEPS.find((s) => s.id === 'define')
    expect(getProcessPhase('define').short).toBe(defineStep.label)
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

describe('journey — path stops are distinct and well-formed', () => {
  it('every stop has a unique id, a view and a label', () => {
    /* Deliberately NOT a count. Order and length are both product decisions
       that have now changed twice — Strategy moved ahead of Research in
       v1.53.7, and Directions and Brand book joined the path on 2026-08-09 —
       and this file's job is the shape of a stop, not the size of the set.
       journey.test.js owns the exact sequence, in one place. */
    const ids = JOURNEY_STEPS.map((s) => s.id)
    expect(new Set(ids).size).toBe(JOURNEY_STEPS.length)
    expect(ids.every((id) => typeof id === 'string' && id)).toBe(true)
    expect(JOURNEY_STEPS.every((s) => s.view && s.label)).toBe(true)
  })

  it('maps path views; Review and the utilities stay off-path', () => {
    expect(journeyIdForView('project')).toBe('define')
    /* `spark` is on the path now — it is Directions. */
    expect(journeyIdForView('spark')).toBe('ideate')
    expect(journeyIdForView('review')).toBe(null)
    expect(journeyIdForView('insights')).toBeNull()
  })
})
