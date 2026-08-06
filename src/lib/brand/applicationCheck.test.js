import { describe, it, expect } from 'vitest'
import {
  applicationColourLine,
  applicationColourReading,
} from './applicationCheck.js'
import { mergePageSamples } from './checkFile.js'

/**
 * The application check, tested at the two places it can lie.
 *
 * These are written to FAIL WHEN MUTATED, which is not automatic — the frozen
 * acceptance run in this folder stayed green through six deliberate mutations
 * of the sampling constants, and that is recorded in PHASES.md as a hole. So
 * each assertion here names the specific wrong behaviour it rules out.
 */

const NAVY = '#1B4C7E'
const RUST = '#B4551F'
/** Neutrals: every one of these is discarded by `isSubstrate`, on purpose. */
const NEUTRALS = ['#FAFAF9', '#1C1917', '#A8A29E']

const sample = (colours) => ({ colours, readable: true, substrateShare: 0.7 })

const roleLabel = (hex) =>
  ({ [NAVY.toLowerCase()]: 'Primary', [RUST.toLowerCase()]: 'Accent' })[
    String(hex).toLowerCase()
  ] || null

describe('applicationColourReading', () => {
  it('reports a palette colour present at well under the mark screen 2% floor', () => {
    /* THE WHOLE REASON THIS MODULE EXISTS SEPARATELY. `markColourReading`
       requires 2% coverage before a colour counts as used, because a mark is
       small and deliberate. A business card is mostly paper and its brand
       navy can legitimately be a 1% rule-and-logo. If someone "unifies" these
       two by routing applications through the mark reading, this fails. */
    const reading = applicationColourReading({
      sample: sample([
        { hex: '#3F7A44', coverage: 0.985 },
        { hex: NAVY, coverage: 0.015 },
      ]),
      palette: [NAVY, RUST],
      labelFor: roleLabel,
    })
    expect(reading.present.map((p) => p.hex)).toContain(NAVY)
  })

  it('carries the nearest approved colour with every finding', () => {
    /* PRODUCT.md §23 asks for "this asset uses X — your approved primary is
       Y". Without the neighbour the designer has a bare hex and nine roles to
       eyeball. Drop the nearestBrandColour call and this fails. */
    const reading = applicationColourReading({
      // Far from both palette entries: a green, ~40 ΔE00 from the navy.
      sample: sample([{ hex: '#1E9E4A', coverage: 0.6 }]),
      palette: [NAVY, RUST],
      labelFor: roleLabel,
    })
    expect(reading.state).toBe('findings')
    expect(reading.intruders[0].nearestHex).toBe(NAVY)
    expect(reading.intruders[0].nearestLabel).toBe('Primary')
  })

  it('never compares against neutral roles', () => {
    /* Neutral, Text and Background are ALL substrate — `dominantColours`
       throws those pixels away before this ever sees them, so no asset can
       contain them, ever. A neutrals-only palette therefore has NOTHING to
       compare, and must say so.

       This is the assertion that catches the mistake, and the first version
       of this test did not. Checking that a navy asset against
       [navy, ...neutrals] stays 'clean' passes with or without the filter,
       because the navy matches itself either way — measured, by mutating
       `filterBrandColours(raw)` to `raw` and watching all sixteen tests stay
       green. Drop the filter here and this case degrades to the always-true
       "None of your palette colours turn up in this one", printed under
       every deliverable forever. */
    const reading = applicationColourReading({
      sample: sample([{ hex: NAVY, coverage: 0.5 }]),
      palette: NEUTRALS,
      labelFor: roleLabel,
    })
    expect(reading.state).toBe('no-chromatic')
    expect(applicationColourLine(reading).line).toMatch(/neutrals only/i)
  })

  it('says no-palette rather than clean when nothing was chosen', () => {
    const reading = applicationColourReading({
      sample: sample([{ hex: NAVY, coverage: 0.5 }]),
      palette: [],
    })
    expect(reading.state).toBe('no-palette')
  })

  it('an unreadable file is never a clean result', () => {
    const reading = applicationColourReading({
      sample: { readable: false, reason: 'decode-failed', colours: [] },
      palette: [NAVY],
    })
    expect(reading.state).toBe('unreadable')
    expect(reading.state).not.toBe('clean')
  })
})

describe('applicationColourLine', () => {
  const lineFor = (args) => applicationColourLine(applicationColourReading(args)).line

  it('names the nearest approved colour in the finding sentence', () => {
    const line = lineFor({
      sample: sample([{ hex: '#1E9E4A', coverage: 0.6 }]),
      palette: [NAVY, RUST],
      labelFor: roleLabel,
    })
    expect(line).toContain('#1E9E4A')
    expect(line).toContain('Primary')
    expect(line).toContain(NAVY)
  })

  it('does NOT offer to widen the palette, unlike the mark screen', () => {
    /* On the Mark screen a finding means "the palette is behind the logo",
       and it offers Add to palette. On a finished deliverable the palette was
       approved weeks ago; offering to add every stray colour would let the
       brand drift a little wider each time someone checked their own work.
       The application line therefore carries NO action at all. */
    const out = applicationColourLine(
      applicationColourReading({
        sample: sample([{ hex: '#1E9E4A', coverage: 0.6 }]),
        palette: [NAVY],
      })
    )
    expect(out.action).toBeUndefined()
    expect(out.line).not.toMatch(/yet/i)
  })

  it('reports what it saw rather than vouching for the artwork', () => {
    /* No "looks good", no "passes", no tick. This check ignores anything
       under 10% coverage, discards every near-neutral pixel and only fires
       past ΔE00 15 — a designer who reads "all good" here is trusting a
       check that largely did not run. */
    const line = lineFor({
      sample: sample([{ hex: NAVY, coverage: 0.5 }]),
      palette: [NAVY, RUST],
      labelFor: roleLabel,
    })
    expect(line).toBe('Uses your Primary.')
    expect(line).not.toMatch(/good|pass|✓|correct|great/i)
  })

  it('says so when none of the palette turns up', () => {
    const line = lineFor({
      // Present but tiny: under the 10% intruder floor, so no finding fires
      // and no palette colour is found either.
      sample: sample([{ hex: '#1E9E4A', coverage: 0.05 }]),
      palette: [NAVY, RUST],
      labelFor: roleLabel,
    })
    expect(line).toBe('None of your palette colours turn up in this one.')
  })

  it('distinguishes a mono piece from a broken file', () => {
    /* Phase 6 puts this in scope by name: "say plainly when a file could not
       be read... silence must not read as clean". Collapse these two into one
       sentence and this fails. */
    const mono = applicationColourLine({ state: 'unreadable', reason: 'no-brand-colours' }).line
    const broken = applicationColourLine({ state: 'unreadable', reason: 'decode-failed' }).line
    expect(mono).toMatch(/black and white/i)
    expect(broken).not.toBe(mono)
    expect(broken).toMatch(/didn't open/i)
  })

  it('an unsupported file names what would work', () => {
    const line = applicationColourLine({
      state: 'unreadable',
      reason: 'unsupported-type',
    }).line
    expect(line).toMatch(/PDF/)
  })

  it('never uses alarm words', () => {
    /* The audience has executive-function difficulty and the phase brief is
       explicit: never a gate, never red. "Error", "invalid", "failed",
       "wrong" and "must" all reframe a finished piece of work as a defect. */
    const states = [
      { sample: sample([{ hex: '#1E9E4A', coverage: 0.6 }]), palette: [NAVY] },
      { sample: sample([{ hex: NAVY, coverage: 0.5 }]), palette: [NAVY] },
      { sample: sample([{ hex: NAVY, coverage: 0.5 }]), palette: [] },
      { sample: sample([{ hex: NAVY, coverage: 0.5 }]), palette: NEUTRALS },
      { sample: { readable: false, reason: 'decode-failed' }, palette: [NAVY] },
      { sample: { readable: false, reason: 'unsupported-type' }, palette: [NAVY] },
    ]
    for (const args of states) {
      expect(lineFor(args)).not.toMatch(
        /error|invalid|failed|wrong|must|should not|warning/i
      )
    }
  })
})

describe('mergePageSamples', () => {
  it('keeps a colour that only appears on the back of the card', () => {
    /* A business card is two pages. If only page 1 were read, a back printed
       entirely in an unapproved colour would be invisible — the exact miss
       this whole feature is supposed to close. */
    const merged = mergePageSamples([
      sample([{ hex: NAVY, coverage: 1 }]),
      sample([{ hex: '#1E9E4A', coverage: 1 }]),
    ])
    expect(merged.colours.map((c) => c.hex)).toEqual(
      expect.arrayContaining([NAVY, '#1E9E4A'])
    )
    // Averaged over pages, so each is half the piece — not double-counted.
    expect(merged.colours[0].coverage).toBeCloseTo(0.5, 5)
  })

  it('a blank page does not dilute the colours of the printed one', () => {
    /* Averaging over ALL pages instead of readable ones would halve every
       share here, and a colour at 0.5 would land at 0.25 — still above the
       0.1 intruder floor, but a stationery set with four bleed sheets would
       push a real finding under it. Change the divisor to samples.length and
       this fails. */
    const merged = mergePageSamples([
      sample([{ hex: '#1E9E4A', coverage: 1 }]),
      { colours: [], readable: false, reason: 'no-brand-colours' },
    ])
    expect(merged.colours[0].coverage).toBeCloseTo(1, 5)
  })

  it('merges the same ink re-quantised differently on two pages', () => {
    /* The renderer quantises each page independently, so one navy comes back
       as two hexes ~1 ΔE00 apart. Reported separately they would each carry
       half the share and could both fall under the 10% floor — the one
       colour that mattered, suppressed by arithmetic. */
    const merged = mergePageSamples([
      sample([{ hex: '#024aaa', coverage: 1 }]),
      sample([{ hex: '#0349ab', coverage: 1 }]),
    ])
    expect(merged.colours).toHaveLength(1)
    expect(merged.colours[0].coverage).toBeCloseTo(1, 5)
  })

  it('every page unreadable is reported, not returned as clean', () => {
    const merged = mergePageSamples([
      { colours: [], readable: false, reason: 'page-failed' },
      { colours: [], readable: false, reason: 'page-failed' },
    ])
    expect(merged.readable).toBe(false)
    expect(merged.reason).toBe('page-failed')
  })
})
