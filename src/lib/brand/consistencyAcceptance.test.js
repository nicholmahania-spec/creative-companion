/**
 * PHASE 6'S ACCEPTANCE BAR, AS A TEST.
 *
 * The plan gates this phase on real work rather than on synthetic fixtures:
 * *"twenty real assets — including one CMYK print PDF, one photographic
 * mockup and one outlined logo — run through it, and the false-positive rate
 * is judged acceptable against your own eye."*
 *
 * That was run: six real client files, 22 renderings, sampled through the
 * production path. The numbers are in `acceptanceFixture.js` and the four
 * tests below are the run itself, so a threshold change cannot quietly undo
 * the result. The client files are gone — they existed only in an ephemeral
 * sandbox — but colour is all this check ever read.
 *
 * BOTH HALVES ARE TESTED, and the second matters as much as the first: a
 * checker that never speaks scores a perfect false-positive rate. So test D
 * requires it to keep firing on genuinely foreign colour, and its numbers
 * would fail if someone "fixed" a false alarm by raising the threshold until
 * nothing fires at all.
 */

import { describe, it, expect } from 'vitest'
import { ACCEPTANCE_RENDERINGS } from './acceptanceFixture.js'
import { markColourReading } from './markColourCheck.js'
import { deltaE00Hex } from './deltaE.js'
import { filterBrandColours } from './dominantColour.js'

const readable = ACCEPTANCE_RENDERINGS.filter((r) => r.readable)
const identity = readable.filter((r) => r.piece === 'identity')

const sampleOf = (r) => ({ colours: r.colours, readable: true })
const findings = (r, palette) =>
  markColourReading({ sample: sampleOf(r), palette }).intruders

/** The two colours printed in that brand's own guide, as a designer would type
 *  them into the palette: C0 M100 Y100 K0 and C65 M0 Y15 K0. */
const AS_SPECIFIED = ['#ED1C24', '#32C1D6']
/** The same two inks as this renderer produces them. */
const AS_RENDERED = ['#ff2e17', '#45cbdb']

describe('Phase 6 acceptance: it must not cry wolf on real work', () => {
  it('has real renderings to judge, and admits which it could not read', () => {
    expect(ACCEPTANCE_RENDERINGS.length).toBe(22)
    expect(readable.length).toBe(19)
    // The three it cannot read are blank artboards. Calling them "clean"
    // would be the tool vouching for something it never measured.
    expect(ACCEPTANCE_RENDERINGS.length - readable.length).toBe(3)
  })

  it('A — fires nothing on artwork checked against its own brand guide', () => {
    const flagged = identity.filter((r) => findings(r, AS_SPECIFIED).length)
    expect(
      flagged.map((r) => `${r.kind} p${r.page}`),
      'every one of these would be a false alarm on correct client work'
    ).toEqual([])
    expect(identity.length).toBe(9)
  })

  it('A — survives the CMYK gap it is measured across', () => {
    /* This is why test A is the interesting one. The brand guide prints
       #ED1C24; the same ink renders as #ff2e17. Test A compares across that
       gap and still fires nothing, because the intruder threshold is 15 and
       the divergence is 6. The colour-management problem that looked like it
       would sink this feature is simply smaller than the alarm band. */
    expect(deltaE00Hex('#ED1C24', '#ff2e17')).toBeCloseTo(6.14, 1)
    expect(deltaE00Hex('#32C1D6', '#45cbdb')).toBeCloseTo(3.07, 1)
    expect(deltaE00Hex('#ED1C24', '#ff2e17')).toBeLessThan(15)
  })

  it('B — fires nothing when the palette is calibrated instead', () => {
    const flagged = identity.filter((r) => findings(r, AS_RENDERED).length)
    expect(flagged.map((r) => `${r.kind} p${r.page}`)).toEqual([])
  })

  it('C — fires nothing across pages of one internally consistent piece', () => {
    /* Palette = the whole document's leading colours, which is what a
       designer would hold. Deriving it from page 1 alone was a flaw in the
       original harness and produced the only findings in the entire run:
       artboard 1 of the logo is blank and artboard 2 carries only the red,
       so the cyan was reported as an intruder on six later artboards. */
    const byPiece = new Map()
    for (const r of readable) {
      if (!byPiece.has(r.piece)) byPiece.set(r.piece, [])
      byPiece.get(r.piece).push(r)
    }
    let checked = 0
    const flagged = []
    for (const [piece, pages] of byPiece) {
      if (pages.length < 2) continue
      const seen = []
      for (const p of pages) {
        for (const c of p.colours) {
          if (c.coverage < 0.1) continue
          if (!seen.some((h) => deltaE00Hex(h, c.hex) < 5)) seen.push(c.hex)
        }
      }
      const palette = filterBrandColours(seen)
      if (!palette.length) continue
      for (const p of pages) {
        checked++
        if (findings(p, palette).length) flagged.push(`${piece} p${p.page}`)
      }
    }
    expect(checked).toBeGreaterThanOrEqual(16)
    expect(flagged).toEqual([])
  })
})

describe('Phase 6 acceptance: it must still speak up', () => {
  /* Zero false positives is trivially achieved by never firing. These
     numbers are the guard against "fixing" a false alarm by raising the
     threshold until the feature is silent. */
  const PALETTES = {
    identity: AS_SPECIFIED,
    plan: ['#018081', '#b2cdbc'],
    anniv: ['#024aa8', '#165ea8'],
    cards: ['#292961', '#b92234'],
    info: ['#24275c', '#429592'],
  }

  it('D — catches foreign colour in the large majority of cases', () => {
    let total = 0
    let fired = 0
    for (const r of readable) {
      for (const [piece, palette] of Object.entries(PALETTES)) {
        if (piece === r.piece) continue
        total++
        if (findings(r, palette).length) fired++
      }
    }
    expect(total).toBe(76)
    /* Measured 68/76. Pinned as a floor rather than an equality so a genuine
       improvement is not a failure — but it cannot fall. The 8 misses are
       real and expected: this check is deliberately miss-prone (a 10%
       coverage floor, a ΔE00 15 band), and two navy-led brands sit inside
       that band of each other. */
    expect(fired).toBeGreaterThanOrEqual(68)
    expect(fired / total).toBeGreaterThan(0.85)
  })

  it('D — a wholly foreign brand is caught, not merely usually caught', () => {
    // The clearest case in the set: teal-and-sage artwork against a red and
    // cyan identity. If this ever goes quiet, the feature is decorative.
    const plan = readable.filter((r) => r.piece === 'plan' && r.page > 1)
    expect(plan.length).toBeGreaterThan(0)
    for (const r of plan) {
      expect(findings(r, AS_SPECIFIED).length, `plan p${r.page}`).toBeGreaterThan(
        0
      )
    }
  })
})
