import { describe, expect, it } from 'vitest'
import {
  DESIGN_SYSTEM_PROMPT,
  HELPER_SYSTEM_PROMPT,
  PROCESS_SPINE,
} from './helperPersona'
import { JOURNEY_STEPS } from '../journey'
import { DESIGN_SYSTEM_PROMPT as fromBuddy } from './buddy'

/**
 * This file used to assert the spine literally:
 *
 *   expect(HELPER_SYSTEM_PROMPT).toMatch(/Define → Research → Ideate/)
 *
 * which pinned a seven-stop path with retired labels against a journey that
 * has five. It was named "uses 7-step spine not legacy 4-step" — written
 * during an earlier rename to stop a regression, and it became the thing
 * holding the next one in place. When the spine was finally derived from
 * `journey.js`, this test failed and the correct change looked like the
 * break.
 *
 * That is the failure mode CLAUDE.md names directly: tests must derive too,
 * or an intentional rename reads as a regression. Asserting the RELATIONSHIP
 * (prompt matches journey) rather than the VALUE (prompt says "Ideate") is
 * what makes the difference — the relationship stays true across renames,
 * the value does not.
 */
describe('helper persona single source', () => {
  it('takes its spine from the journey rather than restating one', () => {
    expect(PROCESS_SPINE).toBe(JOURNEY_STEPS.map((s) => s.label).join(' → '))
    expect(HELPER_SYSTEM_PROMPT).toContain(PROCESS_SPINE)
  })

  it('keeps the short voice for one-press intents', () => {
    expect(HELPER_SYSTEM_PROMPT).toMatch(/Max ~50 words|≤2 sentences|short/i)
  })

  it('carries no retired process vocabulary', () => {
    expect(HELPER_SYSTEM_PROMPT).not.toMatch(/Wireframing|4-step/i)
  })

  it('is one persona, shared by every consumer', () => {
    expect(DESIGN_SYSTEM_PROMPT).toBe(HELPER_SYSTEM_PROMPT)
    expect(fromBuddy).toBe(HELPER_SYSTEM_PROMPT)
  })
})
