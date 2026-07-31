/**
 * Palette health has to be a signal you can act on, not a grade.
 *
 * Three defects it shipped with, each encoded below:
 *
 * 1. **Doing more work lowered it.** `justified / assigned` meant one
 *    justified role scored 100% and four justified roles scored 87%. A
 *    number that falls as the work improves teaches you to stop working.
 *
 * 2. **A blank project opened on 20%, in red.** A failure grade for not
 *    having started — the precise shape of feedback this app exists to
 *    remove, and the one most likely to end a session before it begins.
 *
 * 3. **"Fix AA" did not fix it.** It reported three changes and moved the
 *    score 58 -> 61, still failing, because the passes overwrote each
 *    other: the cover pass reassigned `text`, breaking text-on-quiet that
 *    an earlier pass had already settled. A button that says it fixed
 *    something and didn't spends trust as well as a click.
 *
 * The contrast term also used to compare EVERY palette color against the
 * background, so a good palette scored badly and each added color made it
 * worse. It now measures only the pairs a reader actually sees.
 */

import { describe, it, expect } from 'vitest'
import {
  HEALTH_ROLE_KEYS,
  checkPaletteHarmony,
  mergeRolesIntoPalette,
  paletteHealthScore,
  roleContrastPairs,
  suggestRoleAaFixes,
} from './color.js'

const PALETTE = ['#123456', '#abcdef', '#0F766E', '#FFFFFF']
const ROLES = {
  cover: '#123456',
  text: '#000000',
  accent: '#0F766E',
  quiet: '#FFFFFF',
}

describe('palette health', () => {
  it('has no score at all before anything is picked', () => {
    const h = paletteHealthScore({})
    expect(h.score).toBeNull()
    expect(h.started).toBe(false)
  })

  it('scores as soon as there is a color, without a palette role', () => {
    const h = paletteHealthScore({ palette: ['#123456'] })
    expect(h.started).toBe(true)
    expect(typeof h.score).toBe('number')
  })

  it('never drops as more roles are justified', () => {
    let previous = -1
    const why = {}
    for (const key of HEALTH_ROLE_KEYS) {
      why[key] = 'because'
      const { score } = paletteHealthScore({
        palette: PALETTE,
        colorRoles: ROLES,
        colorRoleWhy: { ...why },
      })
      expect(score, `justifying ${key} lowered the score`).toBeGreaterThanOrEqual(
        previous
      )
      previous = score
    }
  })

  it('does not punish a larger palette on contrast', () => {
    // The defect was the contrast term: it compared every palette color to
    // the background, so each added color brought another failing pair and
    // the number fell as the palette grew. Contrast now depends only on the
    // assigned roles, so adding colors cannot move it.
    //
    // Harmony is deliberately NOT asserted here — it is a real property of
    // which hues are present, so it may legitimately change.
    const small = paletteHealthScore({
      palette: ['#123456', '#FFFFFF'],
      colorRoles: ROLES,
      colorRoleWhy: {},
    })
    const large = paletteHealthScore({
      palette: [...PALETTE, '#884400', '#225577', '#AA3366'],
      colorRoles: ROLES,
      colorRoleWhy: {},
    })
    expect(large.contrastScore).toBe(small.contrastScore)
    expect(large.pairs.length).toBe(small.pairs.length)
  })

  it('only measures pairs where both roles are assigned', () => {
    expect(roleContrastPairs({}).length).toBe(0)
    expect(roleContrastPairs({ text: '#000000' }).length).toBe(0)
    const pairs = roleContrastPairs(ROLES)
    expect(pairs.length).toBeGreaterThan(0)
    for (const p of pairs) expect(p.fg).not.toBe(p.bg)
  })

  it('says nothing about the harmony of an empty palette', () => {
    const h = checkPaletteHarmony([])
    expect(h.ok).toBeNull()
    expect(h.note).not.toMatch(/neutral/i)
  })
})

describe('Fix AA actually fixes the palette', () => {
  // The real-world case that exposed it: a mid-tone tan quiet surface, where
  // the cover pass reassigned text to light and broke the body surface.
  const pal = ['#2B3A67', '#496A81', '#66999B', '#B3AF8F', '#FFC482']
  const roles = {
    cover: '#2B3A67',
    text: '#496A81',
    accent: '#66999B',
    quiet: '#B3AF8F',
  }
  const why = { cover: 'w', text: 'w', accent: 'w', quiet: 'w' }

  it('leaves no scored pair failing', () => {
    const { roles: fixed } = suggestRoleAaFixes(pal, roles)
    const after = paletteHealthScore({
      palette: mergeRolesIntoPalette(pal, fixed, 8),
      colorRoles: fixed,
      colorRoleWhy: why,
    })
    const failing = after.pairs.filter((p) => !p.ok)
    expect(
      failing,
      `still failing: ${failing.map((p) => p.id).join(', ')}`
    ).toHaveLength(0)
    expect(after.contrastScore).toBe(1)
  })

  it('raises the score it feeds', () => {
    const before = paletteHealthScore({
      palette: pal,
      colorRoles: roles,
      colorRoleWhy: why,
    })
    const { roles: fixed } = suggestRoleAaFixes(pal, roles)
    const after = paletteHealthScore({
      palette: mergeRolesIntoPalette(pal, fixed, 8),
      colorRoles: fixed,
      colorRoleWhy: why,
    })
    expect(after.score).toBeGreaterThan(before.score)
  })

  it('is idempotent — running it again changes nothing', () => {
    const { roles: once } = suggestRoleAaFixes(pal, roles)
    const { changes: twice } = suggestRoleAaFixes(
      mergeRolesIntoPalette(pal, once, 8),
      once
    )
    expect(twice).toHaveLength(0)
  })
})
