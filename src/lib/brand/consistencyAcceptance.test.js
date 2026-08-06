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
import { intruderColours } from './dominantColour.js'

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

  it('C — WAS TAUTOLOGICAL, and is kept only as the record of that', () => {
    /* This used to assert "0 findings across 16 checks" and it was counted
       toward the headline. An adversarial pass showed it cannot fail: the
       palette is built from the document's own colours, deduped at ΔE00 < 5,
       and then those same colours are checked at > 15. Swept across every
       threshold, C fires ZERO at anything above 3 — so at the real threshold
       of 15 it was 16 of the 34 "checks" contributing no information at all.

       It is not deleted, because the honest headline depends on knowing the
       denominator was inflated. The false-positive evidence is tests A and B:
       nine renderings of ONE brand. Not thirty-four. */
    const identityFindings = identity.filter(
      (r) => findings(r, AS_SPECIFIED).length
    )
    expect(identityFindings).toEqual([])
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

  it('D — catches foreign colour in every check that CAN fire', () => {
    /* Originally reported as "68 of 76, an 11% miss rate", and that framing
       was wrong in a way worth keeping on the record. The 8 "misses" are not
       eight independent failures: they are TWO renderings, each checked
       against four foreign palettes. Both are structurally mute — their
       strongest colour covers 2.3% and 7.7%, under the 10% floor — so they
       cannot fire against any palette at any threshold. Counting them as
       detection failures blamed the checker for artwork with no dominant
       colour in it. */
    const mute = readable.filter(
      (r) => Math.max(...r.colours.map((c) => c.coverage)) < 0.1
    )
    expect(mute.map((r) => `${r.piece} p${r.page}`)).toEqual([
      'plan p1',
      'anniv p3',
    ])

    let total = 0
    let fired = 0
    let couldFire = 0
    for (const r of readable) {
      for (const [piece, palette] of Object.entries(PALETTES)) {
        if (piece === r.piece) continue
        total++
        if (mute.includes(r)) continue
        couldFire++
        if (findings(r, palette).length) fired++
      }
    }
    expect(total).toBe(76)
    expect(couldFire).toBe(68)
    // Every check that could fire, did.
    expect(fired).toBe(68)
  })

  it('D — the threshold is validated as a BAND, not as the value 15', () => {
    /* Swept over the fixture, every threshold from 12 to 15 gives an
       identical result: no false alarms on correct work, all 68 detections.
       Below 12 false alarms appear; at 16 detection starts falling. So this
       run supports "somewhere in 12–15", and picking 15 out of that band is
       a judgement the data does not make for us — it buys headroom against
       colour-management drift at the cost of a wider blind spot.

       Recording the band rather than the point is the difference between
       evidence and a number that merely happens to be in the code. */
    const sweep = (t) => {
      let fp = 0
      for (const r of identity) {
        if (intruderColours(r.colours, AS_SPECIFIED, { minDelta: t }).length) fp++
      }
      let fired = 0
      for (const r of readable) {
        for (const [piece, palette] of Object.entries(PALETTES)) {
          if (piece === r.piece) continue
          if (intruderColours(r.colours, palette, { minDelta: t }).length) fired++
        }
      }
      return { fp, fired }
    }
    for (const t of [12, 13, 14, 15]) {
      expect(sweep(t), `threshold ${t}`).toEqual({ fp: 0, fired: 68 })
    }
    // Outside the band it degrades, in both directions.
    expect(sweep(10).fp, 'below the band, correct work gets flagged').toBeGreaterThan(0)
    expect(sweep(18).fired, 'above the band, detection falls').toBeLessThan(68)
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
