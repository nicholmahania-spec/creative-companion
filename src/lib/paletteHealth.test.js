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
  BRAND_ROLE_KEYS,
  BRAND_ROLE_LABELS,
  DEFAULT_PALETTE,
  healthLabel,
  healthScopeLabels,
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

  it('does not grade a palette nobody has given a job to', () => {
    /* This test used to be called "scores as soon as there is a color,
       without a palette role" and asserted the opposite. The NAME was the
       bug: scoring early is not the goal, scoring fairly is.

       What it protected was unreachable in the running app anyway. `App.jsx`
       substitutes DEFAULT_PALETTE whenever a project has no palette, so
       `palette.length` is never 0 and the "—" state could not render.
       Measured on a fresh project: 33%, red, "Tighten roles" — a failing
       grade for work not yet begun, at the exact moment (task initiation)
       where it does the most damage. The comment above the panel claimed
       this had been fixed. It had moved from 20% to 33%. */
    const fresh = paletteHealthScore({ palette: DEFAULT_PALETTE })
    expect(fresh.started, 'a palette alone is not something to measure').toBe(
      false
    )
    expect(fresh.score, 'a fresh project must open on "—", not a grade').toBeNull()
    expect(healthLabel(fresh).word).toBe('—')
    expect(healthLabel(fresh).band).toBe('is-idle')
  })

  it('starts scoring once a colour has been given a job', () => {
    const h = paletteHealthScore({
      palette: DEFAULT_PALETTE,
      colorRoles: { cover: '#1C1917' },
    })
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

describe('applying a contrast fix does not silently drop it', () => {
  /* The defect, measured: on a full 8-colour palette, `suggestRoleAaFixes`
     returned three fixes, the view wrote all three roles, and
     `mergeRolesIntoPalette` returned an array IDENTICAL to its input — while
     the toast reported success. The roles then pointed at hexes present
     nowhere in the palette, and since a role can only be re-picked by clicking
     a palette swatch, the designer could not see or recover the colour their
     brand had just been changed to. It began failing at SIX distinct colours,
     not eight. */
  it('keeps every role hex even when the palette is already full', async () => {
    const { mergeRolesIntoPalette } = await import('./color.js')
    const full = [
      '#1C1917', '#0F766E', '#A8A29E', '#FAFAF9',
      '#B91C1C', '#7C3AED', '#2563EB', '#CA8A04',
    ]
    const fixed = { text: '#2F4553', accent: '#416163', cover: '#E2E6F3' }
    const merged = mergeRolesIntoPalette(full, fixed, 8)
    for (const hex of Object.values(fixed)) {
      expect(
        merged.map((c) => c.toLowerCase()),
        `${hex} was evicted — the fix was applied and then thrown away`
      ).toContain(hex.toLowerCase())
    }
  })

  it('drops an unassigned palette member rather than a role colour', async () => {
    /* When something has to go, the correct thing to lose is a colour holding
       no job — not the one the brand just committed to. Written properly on
       the second attempt: the first version of this test was
       `expect(true).toBe(true)`, which is the exact vacuous shape the commit
       above it complains about. */
    const { mergeRolesIntoPalette } = await import('./color.js')
    const full = [
      '#1C1917', '#0F766E', '#A8A29E', '#FAFAF9',
      '#B91C1C', '#7C3AED', '#2563EB', '#CA8A04',
    ]
    const roles = { cover: '#E2E6F3' }
    const merged = mergeRolesIntoPalette(full, roles, 8)
    expect(merged).toHaveLength(8)
    expect(merged.map((c) => c.toLowerCase())).toContain('#e2e6f3')
    // Something had to go, and it was a plain palette member, not the role.
    const lost = full.filter(
      (c) => !merged.map((m) => m.toLowerCase()).includes(c.toLowerCase())
    )
    expect(lost.length).toBeGreaterThan(0)
    expect(lost.map((c) => c.toLowerCase())).not.toContain('#e2e6f3')
  })
})

describe('the meter discloses what it reads', () => {
  /* The palette offers NINE jobs and the score reads four. Keeping the
     denominator narrow is deliberate — widening it is how "measurement that
     punished use" got in last time, and `brandRoles.test.js:115` pins it. The
     defect was disclosure: assign Secondary, both extra accents and both
     neutrals, write a reason for every one, and the number does not move,
     with nothing on screen to say why. A meter that ignores your work
     without saying so reads as broken. */
  const PAIR = ['#1C1917', '#FAFAF9']
  const score = (roles, why) =>
    paletteHealthScore({
      palette: PAIR,
      colorRoles: roles,
      colorRoleWhy: why,
    }).score

  it('names exactly the jobs that can move the number', () => {
    /* The real check: the sentence is not compared to the constant it is
       derived from — it is compared to BEHAVIOUR, one role at a time. Naming
       a job it does not read, or reading a job it does not name, fails here.
       Mutating HEALTH_ROLE_KEYS moves both sides together and this test
       stays green, which is why the literal pin below exists as well. */
    const named = new Set(healthScopeLabels())
    const base = score({}, {})
    for (const key of BRAND_ROLE_KEYS) {
      const moved =
        score({ [key]: '#0F766E' }, { [key]: 'warm, and the client owns it' }) !==
        base
      expect(
        moved,
        `${BRAND_ROLE_LABELS[key]} (${key}) — ${
          moved ? 'moves the score but is not named' : 'is named but changes nothing'
        }`
      ).toBe(named.has(BRAND_ROLE_LABELS[key]))
    }
  })

  it('says it in the words a designer uses, not the stored keys', () => {
    // `cover` and `quiet` are storage. Nobody has ever called a background
    // "quiet" out loud, and the panel must not be the first place they read it.
    expect(healthScopeLabels()).toEqual([
      'Primary',
      'Text',
      'Accent',
      'Background',
    ])
    expect(BRAND_ROLE_KEYS).toHaveLength(9)
  })
})

describe('the low band names the thing that is actually wrong', () => {
  /* "Tighten roles" was the label for EVERY score under 50, and it had
     never checked whether roles were the problem. Measured before the fix:

       state                                              score  label
       fresh project, nothing assigned                       33  Tighten roles
       all five UNSCORED jobs assigned + justified           33  Tighten roles
       four roles assigned AND justified, contrast failing   48  Tighten roles
       four roles assigned, ZERO rationales, all else fine   60  Getting there

     Read the last two together. Writing every rationale could land you in
     "Tighten roles"; writing none of them could not — roles carry 0.4 and
     the other two terms carry 0.6 between them, so a rationale gap alone
     can never reach the low band. The label spent the user's scarcest
     resource, initiation energy, on the one thing already done. */

  it('does not blame roles when the roles are done and contrast is not', () => {
    const health = paletteHealthScore({
      palette: ['#B3AF8F', '#66999B', '#FFC482', '#2B3A67'],
      colorRoles: {
        cover: '#B3AF8F',
        text: '#C9C5A8',
        accent: '#BFC8A0',
        quiet: '#C4C0A2',
      },
      colorRoleWhy: { cover: 'w', text: 'w', accent: 'w', quiet: 'w' },
    })
    expect(health.score).toBeLessThan(50)
    expect(health.justifiedCount, 'every role is justified in this fixture').toBe(
      4
    )
    expect(health.weakest).toBe('contrast')
    expect(healthLabel(health).word).toBe('Contrast to fix')
  })

  it('never names a term the scorer did not measure', () => {
    /* The trap that made this easy to get wrong: the returned
       `contrastScore` used to be flattened `?? 0`, so a WITHHELD contrast
       term looked like a failing one to anything reading the result — and
       the fix for a mislabel is not a second mislabel. With one role
       assigned there are no pairs at all, so contrast must not be named. */
    const health = paletteHealthScore({
      palette: DEFAULT_PALETTE,
      colorRoles: { cover: '#1C1917' },
    })
    expect(health.pairs).toHaveLength(0)
    expect(health.contrastScore, 'not measured is not zero').toBeNull()
    expect(health.weakest).not.toBe('contrast')
    expect(healthLabel(health).word).not.toBe('Contrast to fix')
  })

  it('names the term losing the most points, not a fixed favourite', () => {
    // Clashing hues lose 0.2 × 0.6 = 0.12; one missing rationale loses
    // 0.4 × 0.25 = 0.10. Harmony is the bigger hole, so harmony is named —
    // a fixed priority order with roles above harmony would say "roles"
    // here, and roles are three-quarters done.
    const health = paletteHealthScore({
      palette: ['#0F766E', '#B91C1C', '#CA8A04'],
      colorRoles: {
        cover: '#1C1917',
        text: '#FFFFFF',
        accent: '#CA8A04',
        quiet: '#1C1917',
      },
      colorRoleWhy: { cover: 'w', text: 'w', accent: 'w' },
    })
    expect(health.harmony.ok).toBe(false)
    expect(health.contrastScore, 'no contrast failure in this fixture').toBe(1)
    expect(health.justifiedCount).toBe(3)
    expect(health.weakest).toBe('harmony')
  })

  it('puts an unreadable pair ahead of a matter of taste', () => {
    /* Measured, and the reason `weakest` is not pure arithmetic: hues that
       are merely "unevenly spaced" lose 0.12, while a real AA failure at
       1.86:1 loses 0.10. On points alone the meter sent a designer to look
       at their hues while a text pair was unreadable. Harmony is taste;
       contrast is a page the client cannot read. */
    const health = paletteHealthScore({
      palette: ['#0F766E', '#B91C1C', '#CA8A04'],
      colorRoles: {
        cover: '#0F766E',
        text: '#FFFFFF',
        accent: '#CA8A04',
        quiet: '#1C1917',
      },
      colorRoleWhy: { cover: 'w', text: 'w', accent: 'w' },
    })
    const failing = health.pairs.filter((p) => !p.ok)
    expect(failing.map((p) => p.id)).toEqual(['accent-on-cover'])
    expect(health.harmony.ok, 'hues also clash in this fixture').toBe(false)
    // Harmony loses more points here, and still does not get named.
    expect(health.weakest).toBe('contrast')
  })

  it('gives the top bands the same words as before', () => {
    // The rename is the LOW band only. Solid and Getting there are what
    // every existing screenshot, test and habit already expects.
    expect(healthLabel({ score: 92 }).word).toBe('Solid')
    expect(healthLabel({ score: 80 }).word).toBe('Solid')
    expect(healthLabel({ score: 50 }).word).toBe('Getting there')
    expect(healthLabel({ score: null }).word).toBe('—')
    expect(healthLabel(null).word).toBe('—')
  })

  it('reads as a state, not an order', () => {
    /* "Tighten roles" is an imperative sitting between "Solid" and "Getting
       there", which are states — so the low band read as a telling-off
       rather than a reading. Every band word is a noun phrase now. */
    for (const weakest of ['contrast', 'harmony', 'roles', null]) {
      const { word } = healthLabel({ score: 30, weakest })
      expect(word, `${weakest} label must not start with a verb`).not.toMatch(
        /^(Tighten|Fix|Add|Write|Choose|Check|Pick|Improve)\b/
      )
    }
  })
})
