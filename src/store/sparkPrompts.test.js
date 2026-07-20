import { describe, expect, it } from 'vitest'
import { sparkPrompts, oppositeSparks } from './useAppStore'

describe('spark prompt deck (prompt audit)', () => {
  it('has at least 8 main prompts for energy UI', () => {
    expect(sparkPrompts.length).toBeGreaterThanOrEqual(8)
  })

  it('keeps ADHD-friendly length', () => {
    for (const p of sparkPrompts) {
      expect(p.length).toBeGreaterThan(20)
      expect(p.length).toBeLessThan(120)
      expect(p.split(/\s+/).length).toBeLessThan(22)
    }
  })

  it('does not duplicate Opposite day in main list (opposites button owns that)', () => {
    const hits = sparkPrompts.filter((p) =>
      /opposite day|force the opposite/i.test(p)
    )
    expect(hits).toHaveLength(0)
  })

  it('includes UI/UX prompts (empty state / primary action)', () => {
    const joined = sparkPrompts.join(' ')
    expect(joined).toMatch(/empty state|finger go first/i)
  })

  it('opposite list uses Force the opposite template', () => {
    expect(oppositeSparks.length).toBeGreaterThanOrEqual(5)
    for (const p of oppositeSparks) {
      expect(p).toMatch(/^Force the opposite:/i)
    }
  })

  it('leads with six-word shortlist exercise', () => {
    expect(sparkPrompts[0]).toMatch(/six words|three directions/i)
  })
})
