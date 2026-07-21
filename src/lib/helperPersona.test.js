import { describe, expect, it } from 'vitest'
import {
  DESIGN_SYSTEM_PROMPT,
  HELPER_SYSTEM_PROMPT,
  PROCESS_SPINE,
} from './helperPersona'
import { DESIGN_SYSTEM_PROMPT as fromBuddy } from './buddy'

describe('helper persona single source', () => {
  it('uses 7-step spine not legacy 4-step', () => {
    expect(PROCESS_SPINE).toMatch(/Define/)
    expect(PROCESS_SPINE).toMatch(/Deliver/)
    expect(HELPER_SYSTEM_PROMPT).toMatch(/Define → Research → Ideate/)
    expect(HELPER_SYSTEM_PROMPT).toMatch(/Max ~50 words|≤2 sentences|short/i)
    expect(HELPER_SYSTEM_PROMPT).not.toMatch(/Wireframing|4-step/i)
    expect(DESIGN_SYSTEM_PROMPT).toBe(HELPER_SYSTEM_PROMPT)
    expect(fromBuddy).toBe(HELPER_SYSTEM_PROMPT)
  })
})
