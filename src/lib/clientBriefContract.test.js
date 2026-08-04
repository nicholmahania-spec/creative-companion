import { describe, expect, it } from 'vitest'

/**
 * Client-facing contract tests - these encode real constraints (word caps, hidden-field lists).
 * A new field must be checked against these, not just added and left to fail CI.
 */
describe('client-facing field tip text caps at 6 words', () => {
  const read = (rel) =>
    new TextDecoder().decode(
      Deno.readFileSync(new URL(`../${rel}`, import.meta.url).pathname)
    )

  it('ClientBriefFields.jsx tip text does not exceed 6 words', () => {
    const src = read('features/brief/ClientBriefFields.jsx')
    // Find all tip strings - they appear as tip="..." or tip={`...`}
    const tipMatches = src.matchAll(/(?:tip=|tip={`)([^`"]+)(?:`|")/g)
    for (const match of tipMatches) {
      const tipText = match[1]
      const wordCount = tipText.trim().split(/\s+/).filter(Boolean).length
      expect(
        wordCount,
        `Tip text exceeds 6 words: "${tipText}" (${wordCount} words)`
      ).toBeLessThanOrEqual(6)
    }
  })
})