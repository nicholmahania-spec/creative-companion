import { describe, expect, it } from 'vitest'
import { contrastTargetFor, wantsHighContrast } from './contrastMatrix'
import { roleContrastPairs, suggestRoleAaFixes, paletteHealthScore } from '../color'

/**
 * The client's accessibility answer used to reach the exports and the brand
 * book — printed for the client to read back — and nothing that checks
 * anything. A client could write "high contrast, our readers have low vision",
 * see it in their brand book, and get a palette signed off at the ordinary AA
 * bar.
 *
 * Two properties matter and both are easy to break:
 *   1. The detector is quiet unless somebody actually asked.
 *   2. Everything held to the bar is held to the SAME bar. A Fix button that
 *      aims lower than the meter it feeds is a named defect in color.js.
 */

describe('wantsHighContrast', () => {
  it('says no to nothing', () => {
    expect(wantsHighContrast('')).toBe(false)
    expect(wantsHighContrast(null)).toBe(false)
    expect(wantsHighContrast('   ')).toBe(false)
  })

  it('hears the ways a client actually says it', () => {
    for (const said of [
      'High contrast please',
      'we need higher contrast',
      'Our readers have low vision',
      'a lot of our customers are colourblind',
      'some are color blind',
      'large print where possible',
      'WCAG AAA',
      'people find it hard to read',
    ]) {
      expect(wantsHighContrast(said), said).toBe(true)
    }
  })

  /**
   * The one direction this must not fail in. A missed phrase leaves the app
   * where it already was; a false positive silently raises the bar on a
   * project nobody asked it of, which reads as the checker being broken.
   */
  it('does not fire on an answer that merely mentions accessibility', () => {
    for (const said of [
      'No accessibility needs',
      'Nothing specific',
      'Accessible to everyone, no particular requirements',
      'None that we know of',
      'Just make it look good',
    ]) {
      expect(wantsHighContrast(said), said).toBe(false)
    }
  })
})

describe('contrastTargetFor', () => {
  it('is not strict when the brief is silent', () => {
    const t = contrastTargetFor({})
    expect(t.strict).toBe(false)
    expect(t.note).toBe('')
  })

  it('is strict, and says why, when the brief asked', () => {
    const t = contrastTargetFor({ accessibilityNeeds: 'High contrast, please' })
    expect(t.strict).toBe(true)
    expect(t.note).toMatch(/client asked/i)
    // Named for the client's request, not for the standard alone.
    expect(t.note).toMatch(/AAA/)
  })

  it('writes its note in American English', () => {
    const t = contrastTargetFor({ accessibilityNeeds: 'low vision' })
    expect(t.note.toLowerCase()).not.toMatch(/colour|centre|behaviour/)
  })
})

const ROLES = {
  cover: '#1C1917',
  text: '#57534E',
  accent: '#0F766E',
  quiet: '#FAFAF9',
}

describe('the raised bar reaches every consumer', () => {
  it('raises body copy to AAA and the large pairings to AAA large', () => {
    const aa = roleContrastPairs(ROLES)
    const aaa = roleContrastPairs(ROLES, { strict: true })
    const need = (rows, id) => rows.find((r) => r.id === id).need

    expect(need(aa, 'text-on-quiet')).toBe(4.5)
    expect(need(aaa, 'text-on-quiet')).toBe(7)
    expect(need(aa, 'accent-on-quiet')).toBe(3)
    expect(need(aaa, 'accent-on-quiet')).toBe(4.5)
  })

  it('leaves the default bar exactly where it was', () => {
    // Nothing about this change may move an ordinary project's verdicts.
    const before = roleContrastPairs(ROLES)
    expect(before.map((p) => p.need)).toEqual([4.5, 3, 3, 3])
  })

  it('lets the health score be held to the raised bar', () => {
    const args = { palette: Object.values(ROLES), colorRoles: ROLES, colorRoleWhy: {} }
    const lenient = paletteHealthScore(args)
    const strict = paletteHealthScore({ ...args, strict: true })
    expect(lenient.score).not.toBeNull()
    expect(strict.score).not.toBeNull()
    // Same roles, stricter bar — the score can only stay level or fall.
    expect(strict.score).toBeLessThanOrEqual(lenient.score)
  })

  /**
   * THE ONE THAT MATTERS. `color.js` records that scoring against a higher
   * bar than the Fix button aims at means "the Fix button could never clear
   * the meter it feeds". Raising the meter without raising the button would
   * reintroduce exactly that, only for accessibility-conscious clients.
   */
  it('Fix contrast clears the meter it feeds, at the raised bar too', () => {
    const palette = Object.values(ROLES)
    const { roles: fixed } = suggestRoleAaFixes(palette, ROLES, { strict: true })
    const after = roleContrastPairs(fixed, { strict: true })
    const failing = after.filter((p) => !p.ok)
    expect(
      failing.map((p) => `${p.id} ${p.ratio.toFixed(2)}/${p.need}`)
    ).toEqual([])
  })

  it('still clears the meter at the ordinary bar', () => {
    const palette = Object.values(ROLES)
    const { roles: fixed } = suggestRoleAaFixes(palette, ROLES)
    const failing = roleContrastPairs(fixed).filter((p) => !p.ok)
    expect(failing).toEqual([])
  })

  it('asks for more work under the raised bar than under the ordinary one', () => {
    const palette = Object.values(ROLES)
    const lenient = suggestRoleAaFixes(palette, ROLES).changes.length
    const strict = suggestRoleAaFixes(palette, ROLES, { strict: true }).changes
      .length
    expect(strict).toBeGreaterThanOrEqual(lenient)
  })
})
