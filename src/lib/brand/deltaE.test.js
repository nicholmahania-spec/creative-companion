import { describe, it, expect } from 'vitest'
import {
  CLOSE_MAX,
  MATCH_MAX,
  compareToBrandColour,
  deltaE00,
  deltaE00Hex,
  hexToLab,
  hexToRgb,
  nearestBrandColour,
} from './deltaE.js'

const lab = (L, a, b) => ({ L, a, b })

/**
 * CIEDE2000 is easy to implement subtly wrong.
 *
 * The usual casualties are the hue-difference quadrant handling and the 275°
 * rotation term, and an implementation broken in only those places is wrong
 * almost exclusively in BLUES — which is where brand palettes spend much of
 * their time, and which no casual eyeball check would catch. That is why the
 * CIE published a reference set at all, and why this file leads with it rather
 * than with a hand-picked "looks about right" case.
 */
describe('CIEDE2000 matches the published reference pairs', () => {
  const REFERENCE = [
    [lab(50, 2.6772, -79.7751), lab(50, 0, -82.7485), 2.0425],
    [lab(50, 3.1571, -77.2803), lab(50, 0, -82.7485), 2.8615],
    [lab(50, 2.8361, -74.02), lab(50, 0, -82.7485), 3.4412],
    [lab(50, -1.3802, -84.2814), lab(50, 0, -82.7485), 1.0],
    [lab(50, -1.1848, -84.8006), lab(50, 0, -82.7485), 1.0],
    [lab(50, -0.9009, -85.5211), lab(50, 0, -82.7485), 1.0],
    [lab(50, 0, 0), lab(50, -1, 2), 2.3669],
    [lab(50, -1, 2), lab(50, 0, 0), 2.3669],
    [lab(50, 2.5, 0), lab(50, 0, -2.5), 4.3065],
    [lab(60.2574, -34.0099, 36.2677), lab(60.4626, -34.1751, 39.4387), 1.2644],
    [lab(63.0109, -31.0961, -5.8663), lab(62.8187, -29.7946, -4.0864), 1.263],
    [lab(2.0776, 0.0795, -1.135), lab(0.9033, -0.0636, -0.5514), 0.9082],
  ]

  for (const [a, b, expected] of REFERENCE) {
    it(`ΔE00 = ${expected}`, () => {
      expect(deltaE00(a, b)).toBeCloseTo(expected, 4)
    })
  }

  it('is symmetric', () => {
    // Pairs 7 and 8 of the reference set are the same colours in both orders,
    // which is the set's own way of pinning this.
    expect(deltaE00(lab(50, 0, 0), lab(50, -1, 2))).toBeCloseTo(
      deltaE00(lab(50, -1, 2), lab(50, 0, 0)),
      10
    )
  })

  it('is zero for a colour against itself', () => {
    expect(deltaE00(lab(32, 14, -40), lab(32, 14, -40))).toBe(0)
  })
})

describe('the discontinuity, demonstrated — and why we do not quote a number above 5', () => {
  /* These two pairs differ ONLY in the last decimal of b2: 0.0009 against
     0.0011. If CIEDE2000 were continuous they would agree. They do not, and
     that is the point — Sharma, Wu & Dalal put them in the reference set to
     show it, and it is the reason the standard recommends restricting the
     formula to small colour differences.

     This test is not defending our code; the code is the same either side. It
     is defending the DECISION above it: past the close band we report "these
     are different colours" and no number, because a number there would be
     false precision dressed as rigour. If someone later wants to print
     "ΔE00 = 41.2" on a banner, this is the test that should stop them. */
  const A = lab(50, 2.49, -0.001)
  const lo = deltaE00(A, lab(50, -2.49, 0.0009))
  const hi = deltaE00(A, lab(50, -2.49, 0.0011))

  it('a 0.0002 change in input moves the output', () => {
    expect(lo).toBeCloseTo(7.1792, 4)
    expect(hi).toBeCloseTo(7.2195, 4)
    expect(hi).not.toBeCloseTo(lo, 3)
  })

  it('so the API refuses to report a value past the close band', () => {
    const r = compareToBrandColour('#000000', '#ffffff')
    expect(r.band).toBe('different')
    expect(r.value).toBeNull()
  })
})

describe('sRGB conversion', () => {
  it('parses hex, long and short', () => {
    expect(hexToRgb('#1B4C7E')).toEqual({ r: 27, g: 76, b: 126 })
    expect(hexToRgb('1b4c7e')).toEqual({ r: 27, g: 76, b: 126 })
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('returns null rather than guessing at a non-colour', () => {
    // "Cannot tell" must never be confused with a real reading — a checker
    // that invents a colour for an unreadable input is worse than silent.
    expect(hexToRgb('rebeccapurple')).toBeNull()
    expect(hexToRgb('')).toBeNull()
    expect(hexToRgb(null)).toBeNull()
    expect(deltaE00Hex('#fff', 'nope')).toBeNull()
  })

  it('puts white at L=100 and black at L=0', () => {
    expect(hexToLab('#ffffff').L).toBeCloseTo(100, 2)
    expect(hexToLab('#000000').L).toBeCloseTo(0, 4)
  })

  it('puts mid grey near a*=b*=0', () => {
    const g = hexToLab('#808080')
    expect(Math.abs(g.a)).toBeLessThan(0.02)
    expect(Math.abs(g.b)).toBeLessThan(0.02)
  })
})

describe('the bands say what a designer needs, and no more', () => {
  it('calls a hex against itself a match at zero', () => {
    expect(compareToBrandColour('#1B4C7E', '#1B4C7E')).toEqual({
      band: 'match',
      value: 0,
    })
  })

  it('the product spec\'s own example lands just OUTSIDE close, at 5.395', () => {
    /* Worth recording rather than smoothing over. PRODUCT.md illustrates this
       feature with an uploaded card using #2E5C8A against an approved primary
       of #1B4C7E, and words it "Close, but not a match." Measured, that pair
       is ΔE00 = 5.395 — just past the close band's ceiling of 5, so the
       maths says "different" where the prose says "close".

       The bands are kept as specified, and the example is what moved:
       ISO 12647-7 puts brand spot-colour tolerance near 2.5, so `< 2 = match`
       is if anything conservative, and 5 is also where CIEDE2000 leaves the
       range the CIE validated it for — the boundary is doing double duty and
       is not ours to move casually. The spec's hex values were plainly chosen
       to illustrate a sentence, not computed.

       Flagged for the owner: if real assets keep landing at 5–7 and reading
       as "different" when your eye says "close", the close ceiling is the
       thing to revisit — but with measurements in hand, not by adjusting it
       until one example fits. */
    const r = compareToBrandColour('#2E5C8A', '#1B4C7E')
    expect(deltaE00Hex('#2E5C8A', '#1B4C7E')).toBeCloseTo(5.395, 2)
    expect(r.band).toBe('different')
  })

  it('a genuinely close pair reads as close', () => {
    const r = compareToBrandColour('#20527F', '#1B4C7E')
    expect(r.band).toBe('close')
    expect(r.value).toBeGreaterThan(MATCH_MAX)
    expect(r.value).toBeLessThanOrEqual(CLOSE_MAX)
  })

  it('a hair off reads as a match', () => {
    // #1D4E80 against #1B4C7E is ΔE00 0.67 — the kind of drift an export
    // pipeline introduces, and not worth a banner.
    expect(compareToBrandColour('#1D4E80', '#1B4C7E').band).toBe('match')
  })

  it('reports unknown rather than different when it cannot read a colour', () => {
    // Silence must not read as "clean", and neither must a wrong verdict.
    expect(compareToBrandColour('not-a-colour', '#1B4C7E')).toEqual({
      band: 'unknown',
      value: null,
    })
  })

  it('is not fooled into calling distant blues a match', () => {
    /* The specific failure RGB distance produces. These two are far apart to
       the eye but close in naive RGB terms, and a checker that called them a
       match would be silently useless in exactly the hue brand work uses
       most. */
    const r = compareToBrandColour('#0000ff', '#1B4C7E')
    expect(r.band).toBe('different')
  })
})

describe('nearestBrandColour picks the closest, not the first', () => {
  const palette = ['#1B4C7E', '#C8102E', '#F2F0E6']

  it('finds the nearest by ΔE00', () => {
    const r = nearestBrandColour('#20527F', palette)
    expect(r.hex).toBe('#1B4C7E')
    expect(r.band).toBe('close')
  })

  it('withholds the number when the nearest is still different', () => {
    const r = nearestBrandColour('#00FF00', palette)
    expect(r.band).toBe('different')
    expect(r.value).toBeNull()
  })

  it('returns null for an empty palette rather than a fake verdict', () => {
    expect(nearestBrandColour('#2E5C8A', [])).toBeNull()
    expect(nearestBrandColour('#2E5C8A', ['nope'])).toBeNull()
  })
})
