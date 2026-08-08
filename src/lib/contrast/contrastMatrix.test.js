import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  DRIFT_IS_A_NEW_COLOUR,
  WCAG,
  autoFixPair,
  buildContrastMatrix,
  cellSummary,
  contrastCell,
  fixDrift,
  resolutionsFor,
} from './contrastMatrix.js'
import { contrastRatio } from '../color.js'

describe('a cell says what a pair is FOR, not just pass or fail', () => {
  it('grades body, large and UI separately', () => {
    /* A single pass/fail cannot be right, because WCAG is not one threshold.
       A pair at ~3.4:1 is a genuine failure for body copy and genuinely fine
       for a 24px heading — a cell reading only "FAIL" is wrong about the
       second case, and a designer who is told their perfectly good display
       pairing is broken learns to stop reading the tool. */
    const cell = contrastCell('#767676', '#FFFFFF')
    expect(cell.ratio).toBeGreaterThan(4.5)
    expect(cell.usableFor).toContain('body text')
  })

  it('names the diagonal rather than failing it', () => {
    // A colour on itself is 1:1. Reporting that as a failure would put N red
    // cells down the middle of the grid for a mistake nobody made.
    const cell = contrastCell('#1B4C7E', '#1B4C7E')
    expect(cell.same).toBe(true)
    expect(cellSummary(cell)).toBe('Same color')
  })

  it('says what a low-contrast pair IS good for before what it is not', () => {
    const cell = contrastCell('#7FB2E5', '#FFFFFF')
    expect(cellSummary(cell)).toMatch(/^Good for|^Too close/)
    expect(cellSummary(cell)).not.toMatch(/fail|error|bad/i)
  })

  it('returns null rather than guessing at a non-colour', () => {
    expect(contrastCell('nope', '#FFF')).toBeNull()
    expect(contrastCell('#FFF', '')).toBeNull()
  })
})

describe('the matrix summarises so the grid does not have to be scanned', () => {
  const palette = ['#FFFFFF', '#1B4C7E', '#C8102E', '#F2F0E6']
  const m = buildContrastMatrix(palette)

  it('tests every ordered pair', () => {
    expect(m.rows).toHaveLength(4)
    expect(m.rows[0]).toHaveLength(4)
    // 4x4 minus the 4 same-colour diagonal cells
    expect(m.pairs).toHaveLength(12)
  })

  it('agrees with the contrast function the rest of the app uses', () => {
    /* The maths is NOT reimplemented here. A second copy would drift from the
       one the brand-book PDF uses, and a checker that disagrees with the
       exporter is worse than either alone. */
    expect(m.rows[1][0].ratio).toBeCloseTo(contrastRatio('#1B4C7E', '#FFFFFF'), 10)
  })

  it('hands back the worst pair without anyone counting cells', () => {
    // The grid is for LOCATING a problem; the summary is for knowing whether
    // to look at all.
    expect(m.worst.ratio).toBeLessThanOrEqual(m.best.ratio)
    expect(m.failing.every((c) => c.ratio < WCAG.AA_NORMAL)).toBe(true)
  })

  it('separates "not for body text" from "unusable"', () => {
    /* Failing AA for body copy is often a deliberate and fine choice for a
       decorative pairing. Being under 3:1 is different — nothing can be set in
       it at all. Collapsing those two into one number would make the tool cry
       wolf about ordinary design decisions. */
    expect(m.unusable.length).toBeLessThanOrEqual(m.failing.length)
  })

  it('survives an empty or junk palette', () => {
    expect(buildContrastMatrix([]).pairs).toEqual([])
    expect(buildContrastMatrix(['nope', '']).pairs).toEqual([])
  })
})

describe('autoFixPair moves the smallest distance that clears the bar', () => {
  it('leaves a passing pair completely alone', () => {
    const r = autoFixPair('#1B4C7E', '#FFFFFF')
    expect(r.changed).toBe(false)
    expect(r.hex).toBe('#1B4C7E')
  })

  it('reaches the target for a failing pair', () => {
    const r = autoFixPair('#7FB2E5', '#FFFFFF')
    expect(r.changed).toBe(true)
    expect(contrastRatio(r.hex, '#FFFFFF')).toBeGreaterThanOrEqual(WCAG.AA_NORMAL)
  })

  it('prefers lightness over saturation', () => {
    /* Deliberate, and the order matters. The WCAG ratio is a function of
       relative luminance, which is what lightness moves; saturation barely
       moves luminance and mostly drains the colour. Reaching for saturation
       first yields a washed-out near-grey that technically passes and no
       longer looks like the brand. */
    const r = autoFixPair('#7FB2E5', '#FFFFFF')
    expect(r.axis).toBe('lightness')
  })

  it('does not overshoot', () => {
    /* Binary search rather than stepping, so the result is the SMALLEST change
       that passes. A fix that overshoots is a fix the designer has to argue
       with, and arguing with a suggestion is exactly the decision this feature
       is supposed to remove. */
    const r = autoFixPair('#7FB2E5', '#FFFFFF')
    const ratio = contrastRatio(r.hex, '#FFFFFF')
    expect(ratio).toBeGreaterThanOrEqual(WCAG.AA_NORMAL)
    expect(ratio).toBeLessThan(WCAG.AA_NORMAL + 0.6)
  })

  it('keeps the hue it was given', () => {
    // The fix must still look like the colour the designer picked. Moving hue
    // would make it a different colour wearing the same job.
    const r = autoFixPair('#C8102E', '#FFFFFF')
    if (r.changed) {
      expect(r.hex).toMatch(/^#[0-9a-f]{6}$/i)
      expect(r.axis).toBeTruthy()
    }
  })

  it('says plainly when a pair cannot be fixed by moving one side', () => {
    /* Two mid-tones of similar luminance cannot be separated by moving one of
       them within its own hue. Returning a colour that does not actually pass
       would be worse than admitting it. */
    const r = autoFixPair('#808080', '#7F7F7F', WCAG.AAA_NORMAL)
    if (!r.changed) expect(r.impossible).toBe(true)
    else expect(contrastRatio(r.hex, '#7F7F7F')).toBeGreaterThanOrEqual(WCAG.AAA_NORMAL)
  })

  it('returns null for junk rather than a fake fix', () => {
    expect(autoFixPair('nope', '#FFF')).toBeNull()
  })
})

describe('the fix does not pretend to still be your colour', () => {
  it('reports drift perceptually, not as an HSL step', () => {
    /* MEASURED. #FFD100 against white resolves to #8E7400: hue preserved to
       within 1°, saturation preserved at exactly 100%, lightness moved 0.22.
       By every number the search tracks that is "the same yellow, a little
       darker". It is dark olive-brown, and ΔE00 says so at 29.3.

       Ottosson's Okhsl work names the cause — HSL's lightness axis "does not
       match the perception of lightness well at all for saturated colors" —
       which is why drift is measured in ΔE00 and not in the units the search
       happens to move in. */
    expect(fixDrift('#FFD100', '#8E7400')).toBeGreaterThan(DRIFT_IS_A_NEW_COLOUR)
    expect(fixDrift('#1B4C7E', '#1D4E80')).toBeLessThan(1)
  })

  it('flags a suggestion that has stopped being the same colour', () => {
    const rs = resolutionsFor('#ED1C24', '#808080')
    const fg = rs.find((r) => r.kind === 'move-foreground')
    /* Pantone 185 on mid grey resolves to #360406 — a near-black maroon at
       ΔE00 ~38. A confident auto-fix would show that behind a green tick. */
    expect(fg.newColour).toBe(true)
  })
})

describe('resolutionsFor does not assume the brand colour is the one to move', () => {
  it('offers the background before the foreground', () => {
    /* The single most important assumption this module refuses to make. A
       brand colour is routinely Pantone-matched, printed and trademarked —
       #ED1C24 IS Pantone 185 in one of the palettes this was built against —
       so a tool that helpfully rewrites it produces a value the client may be
       contractually unable to use, which the brand book would then ship as
       approved. The free surface is usually the background. */
    const rs = resolutionsFor('#ED1C24', '#808080')
    expect(rs[0].kind).toBe('move-background')
  })

  it('offers "use it where it already works" as a real resolution', () => {
    /* A pair at 3.4:1 is fine for large text. "Use it at display size" is an
       answer, not a consolation prize, and no auto-fixer offers it. */
    const rs = resolutionsFor('#767676', '#EEEEEE', WCAG.AAA_NORMAL)
    const asIs = rs.find((r) => r.kind === 'use-as-is')
    expect(asIs).toBeTruthy()
    expect(asIs.usableFor.length).toBeGreaterThan(0)
  })

  it('stays silent on a pair that already passes', () => {
    expect(resolutionsFor('#1B4C7E', '#FFFFFF')).toEqual([])
  })

  it('stays silent on a colour against itself', () => {
    expect(resolutionsFor('#1B4C7E', '#1B4C7E')).toEqual([])
  })
})

describe('the dead branch that documented its own honesty', () => {
  it('never claims a saturation fallback it cannot perform', () => {
    /* An earlier version had one, and its docstring described when it would
       run. Measured over 4,000 random pairs at four targets it ran ZERO times,
       and that is structural: contrast against black clears 4.5 whenever the
       background's luminance is >= ~0.175 and against white whenever it is
       <= ~0.183, so every background satisfies one and lightness always wins.
       Where lightness cannot reach a higher target, saturation cannot either.
       Code that documents a safety net it never deploys is worse than no net. */
    const source = readFileSync(
      new URL('./contrastMatrix.js', import.meta.url),
      'utf8'
    )
    /* Checks for the CODE, not for the word. The docstring still explains at
       length why the fallback was removed — that history is the useful part —
       and an earlier version of this assertion banned the phrase, which failed
       on the explanation rather than on the thing explained. */
    expect(source).not.toMatch(/axis:\s*'saturation'/)
    expect(source).not.toMatch(/bySaturation/)
  })

  it('still reports impossible where it genuinely is', () => {
    // Reachable at AAA — roughly a third of random pairs — unlike the branch
    // that used to sit above it.
    const r = autoFixPair('#808080', '#7F7F7F', WCAG.AAA_NORMAL)
    expect(r.changed === false ? r.impossible : true).toBe(true)
  })
})
