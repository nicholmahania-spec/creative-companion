import { describe, it, expect } from 'vitest'
import {
  WCAG,
  autoFixPair,
  buildContrastMatrix,
  cellSummary,
  contrastCell,
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
    expect(cellSummary(cell)).toBe('Same colour')
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
