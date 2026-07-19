import { describe, expect, it } from 'vitest'
import { PROCESS_PHASES, getProcessPhase } from './processGuide'

describe('processGuide', () => {
  it('exposes four design process phases in order', () => {
    expect(PROCESS_PHASES.map((p) => p.id)).toEqual([
      'clarify',
      'structure',
      'visual',
      'refine',
    ])
  })

  it('returns phase metadata with checklist', () => {
    const clarify = getProcessPhase('clarify')
    expect(clarify?.title).toMatch(/Clarify/i)
    expect(clarify.checks.length).toBeGreaterThanOrEqual(3)
    expect(getProcessPhase('nope')).toBeNull()
  })
})
