/**
 * The reading a designer is shown about their own mark.
 *
 * Every fixture here is a hand-built colour list rather than a real image,
 * because the thing under test is the JUDGEMENT, not the sampling. The
 * sampling has its own failure modes and its own honest "I could not read
 * this" path; the two are separated so neither can hide the other.
 */

import { describe, it, expect } from 'vitest'
import {
  markColourLine,
  markColourReading,
  WORN_MIN_COVERAGE,
} from './markColourCheck.js'

const PALETTE = ['#1B4C7E', '#0F766E', '#CA8A04']
/* The four palette jobs the extractor discards as substrate by design. Kept
   as a named fixture because they are the trap this module exists to avoid. */
const NEUTRALS = ['#A8A29E', '#57534E', '#1C1917', '#FAFAF9']
const readable = (colours) => ({ colours, readable: true, substrateShare: 0.6 })

describe('a mark that cannot be read', () => {
  it('says so instead of reporting a clean result', () => {
    /* The single most important behaviour in this file. A flat black-on-white
       mark has NO brand colours by design — near-white is paper and near-black
       is ink, both deliberately discarded. If that came back as "clean" the
       tool would be silently vouching for artwork it never measured. */
    const r = markColourReading({
      sample: { colours: [], readable: false, reason: 'no-brand-colours' },
      palette: PALETTE,
    })
    expect(r.state).toBe('unreadable')
    expect(r.reason).toBe('no-brand-colours')
    expect(r.present).toHaveLength(0)
    expect(r.intruders).toHaveLength(0)
  })

  it('keeps the reason it failed for, so the wording can differ', () => {
    // "I could not decode this file" and "this mark is black and white" are
    // different sentences and must not collapse into one.
    for (const reason of ['decode-failed', 'no-dimensions', 'cannot-read-pixels']) {
      const r = markColourReading({
        sample: { colours: [], readable: false, reason },
        palette: PALETTE,
      })
      expect(r.reason).toBe(reason)
    }
  })
})

describe('with no palette to check against', () => {
  it('makes no findings about the mark at all', () => {
    const r = markColourReading({
      sample: readable([{ hex: '#1B4C7E', coverage: 0.4 }]),
      palette: [],
    })
    expect(r.state).toBe('no-palette')
    expect(r.present).toHaveLength(0)
    expect(r.intruders).toHaveLength(0)
  })

  it('still hands back what it saw', () => {
    // So the caller can offer them as a starting palette rather than asking
    // the designer to re-enter colours the app has already measured.
    const r = markColourReading({
      sample: readable([{ hex: '#1B4C7E', coverage: 0.4 }]),
      palette: [],
    })
    expect(r.found.map((c) => c.hex)).toEqual(['#1B4C7E'])
  })
})

describe('what the mark actually wears', () => {
  it('reports an approved colour the mark is built from', () => {
    const r = markColourReading({
      sample: readable([{ hex: '#1B4C7E', coverage: 0.55 }]),
      palette: PALETTE,
    })
    expect(r.present.map((p) => p.hex)).toEqual(['#1B4C7E'])
    expect(r.state).toBe('clean')
    /* No "your Secondary and Accent are missing". A mark does not have to wear
       every brand colour, and most wear one or two on purpose. */
    expect(r.absent).toBeUndefined()
  })

  it('does not count a colour the mark merely grazes', () => {
    /* paletteCoverage answers "is it anywhere in the asset", which is right
       for a business card and wrong for a mark: one anti-aliased pixel of the
       brand navy would otherwise report the navy as used, and the designer
       would be told their monochrome logo carries a colour it does not. */
    const trace = WORN_MIN_COVERAGE / 2
    const r = markColourReading({
      sample: readable([
        { hex: '#1B4C7E', coverage: 0.5 },
        { hex: '#0F766E', coverage: trace },
      ]),
      palette: PALETTE,
    })
    expect(r.present.map((p) => p.hex)).toEqual(['#1B4C7E'])
  })

  it('names a colour the mark leans on that is nowhere in the palette', () => {
    // The check PRODUCT.md §23 actually asks for.
    const r = markColourReading({
      sample: readable([
        { hex: '#1B4C7E', coverage: 0.3 },
        { hex: '#B91C1C', coverage: 0.35 },
      ]),
      palette: PALETTE,
    })
    expect(r.intruders.map((i) => i.hex)).toEqual(['#B91C1C'])
    expect(r.state).toBe('findings')
  })

  it('stays quiet about a stray colour the mark barely uses', () => {
    /* A gradient midpoint, an illustration detail, a scanned texture. These
       are individually tiny; a wrong brand colour is not. Firing on them is
       what produced nine findings across two entirely correct client files
       when this rule was binary. */
    const r = markColourReading({
      sample: readable([
        { hex: '#1B4C7E', coverage: 0.6 },
        { hex: '#B91C1C', coverage: 0.03 },
      ]),
      palette: PALETTE,
    })
    expect(r.intruders).toHaveLength(0)
    expect(r.state).toBe('clean')
  })

  it('does not report a near miss, because the sampler cannot see one', () => {
    /* #245586 is ΔE00 3.02 from the approved #1B4C7E — inside what
       paletteCoverage calls "drifted", and reporting it looked obviously
       right until it was measured. Bucket means are averaged in gamma-encoded
       sRGB over 24-unit buckets, so ordinary JPEG noise moves a PERFECTLY
       CORRECT colour 2.23, and heavy noise moves it 4.17 (measured; the table
       is in markColourCheck.js). A finding in that band fires on good work.

       So the mark is simply reported as wearing its Primary, with no
       complaint attached. */
    const r = markColourReading({
      sample: readable([{ hex: '#245586', coverage: 0.5 }]),
      palette: PALETTE,
    })
    expect(r.present.map((p) => p.hex)).toEqual(['#1B4C7E'])
    expect(r.state).toBe('clean')
  })

  it('says nothing in the gap between a near miss and an intruder', () => {
    /* The honest cost of the above, pinned so nobody "fixes" it by accident.
       #2E5C8A vs #1B4C7E is ΔE00 5.40 — past the close band, short of the
       intruder band. It is also the exact example PRODUCT.md §23 gives. It
       produces NOTHING, and it produces nothing on purpose: the alternative
       is reporting compression artefacts as brand errors. */
    const r = markColourReading({
      sample: readable([{ hex: '#2E5C8A', coverage: 0.6 }]),
      palette: PALETTE,
    })
    expect(r.state).toBe('clean')
    expect(r.intruders).toHaveLength(0)
    expect(r.present).toHaveLength(0)
  })

  it('calls a colour the designer has named by its name', () => {
    const r = markColourReading({
      sample: readable([{ hex: '#1B4C7E', coverage: 0.5 }]),
      palette: PALETTE,
      labelFor: (hex) => (hex === '#1B4C7E' ? 'Primary' : null),
    })
    expect(r.present[0].label).toBe('Primary')
  })
})

describe('the neutrals trap', () => {
  /* Both advisors found this independently, and it is settled by construction
     rather than by opinion: `isSubstrate` discards L* >= 92, L* <= 12 and
     CIELAB chroma < 8 BEFORE anything reaches the comparison. Measured on the
     real role defaults — Neutral #A8A29E (chroma 3.2), Neutral 2 #57534E
     (3.6), Text #1C1917 (2.2), Background #FAFAF9 (0.5) — every one is
     substrate. A checker that compared against them would report them absent
     on every mark ever uploaded. */

  it('does not let a neutral excuse a colour that is nowhere near the brand', () => {
    /* The filter's teeth. #9C9080 is 21.2 from every chromatic brand colour
       but only 7.9 from Neutral #A8A29E — so with neutrals left in the
       comparison set it would be silently excused as "close enough to your
       Neutral", and the one honest finding this feature makes would vanish. */
    const r = markColourReading({
      sample: readable([
        { hex: '#1B4C7E', coverage: 0.4 },
        { hex: '#9C9080', coverage: 0.35 },
      ]),
      palette: [...PALETTE, ...NEUTRALS],
    })
    expect(r.intruders.map((i) => i.hex)).toEqual(['#9C9080'])
  })

  it('says there is nothing to compare when the palette is all neutrals', () => {
    // Not "your mark is missing all four" — there is genuinely nothing here
    // this pipeline can measure, and that is a different sentence.
    const r = markColourReading({
      sample: readable([{ hex: '#1B4C7E', coverage: 0.5 }]),
      palette: NEUTRALS,
    })
    expect(r.state).toBe('no-chromatic')
    expect(r.present).toHaveLength(0)
    expect(r.intruders).toHaveLength(0)
  })
})

describe('the sentence the designer actually reads', () => {
  /* The wording IS this feature — the maths only picks which of six sentences
     is true. It lives in the lib rather than in JSX precisely so it can be
     checked here; copy that only exists in a view is copy nothing verifies,
     which is how five of nine role labels reached the client wrong. */

  it('reports what it saw, and never vouches for the artwork', () => {
    /* The check is heavily miss-prone BY DESIGN: under 10% coverage is
       ignored, every near-white/near-black/near-neutral pixel is discarded,
       and at most five colours are read. So a quiet "all good" would be the
       app vouching for a check that largely did not run — and a designer
       offloading vigilance is exactly who this product is for. Naming what
       was found is the honest form of the same sentence. */
    const { line } = markColourLine({
      state: 'clean',
      present: [
        { hex: '#1B4C7E', label: 'Primary' },
        { hex: '#CA8A04', label: 'Accent' },
      ],
    })
    expect(line).toBe('Uses your Primary and Accent.')
    for (const vouch of [/all good/i, /looks good/i, /pass/i, /✓/, /correct/i]) {
      expect(line, `must not vouch: ${vouch}`).not.toMatch(vouch)
    }
  })

  it('falls back to the hex when a colour has no job yet', () => {
    const { line } = markColourLine({
      state: 'clean',
      present: [{ hex: '#1B4C7E', label: null }],
    })
    expect(line).toBe('Uses your #1B4C7E.')
  })

  it('describes a mono mark as artwork, not as a failure', () => {
    /* Fires on any flat black-and-white logo, which is common and often
       deliberate. The subject has to be the artwork: a sentence beginning
       "couldn't" makes the reader supply a reason, and the two available
       reasons are "my logo is wrong" and "this is broken". */
    const { line, action } = markColourLine({
      state: 'unreadable',
      reason: 'no-brand-colours',
    })
    expect(line).toBe('Black and white — nothing to compare against your palette.')
    expect(action).toBeUndefined()
    expect(line).not.toMatch(/couldn't|could not|unable|failed|error/i)
  })

  it('says plainly when the file itself would not open', () => {
    // A real tool failure is a different sentence from a mono logo, and the
    // two must never collapse into one — that is the whole reason `reason`
    // is carried through the reading.
    const { line } = markColourLine({
      state: 'unreadable',
      reason: 'decode-failed',
    })
    expect(line).toBe("This image didn't open for a color check.")
  })

  it('offers the mark colours as a starting palette when there is none', () => {
    /* The one branch that REMOVES work. Without it, getting these two hexes
       into the palette costs an eyedropper trip outside the app, holding both
       strings in working memory, and typing them into another screen. */
    const { line, action } = markColourLine({
      state: 'no-palette',
      found: [{ hex: '#8C6B4F' }, { hex: '#2E5C8A' }],
    })
    expect(line).toBe('Found #8C6B4F and #2E5C8A in this mark.')
    expect(action).toBe('use-palette')
  })

  it('points an odd colour at the palette, not at the artwork', () => {
    /* At the Mark stage the logo is usually the finished, approved thing and
       the palette is the incomplete one, so "yet" and an ADD action are the
       honest direction. "Doesn't match your brand" would send the designer
       to redo work they just finished. */
    const { line, action } = markColourLine({
      state: 'findings',
      intruders: [{ hex: '#9C9080' }],
      present: [],
    })
    expect(line).toBe("Leans on #9C9080, which isn't in your palette yet.")
    expect(action).toBe('add-colour')
    expect(line).not.toMatch(/wrong|mismatch|doesn't match|off-brand|should/i)
  })

  it('offers no add button when the palette has no room', () => {
    // The store caps the palette at 8 and silently refuses beyond it. A
    // button that does nothing is worse than no button.
    const { action } = markColourLine(
      { state: 'findings', intruders: [{ hex: '#9C9080' }], present: [] },
      { paletteFull: true }
    )
    expect(action).toBeUndefined()
  })

  it('reads as one sentence in every state', () => {
    // One slot, one sentence — an unusual sentence then reads as a different
    // fact rather than as the panel malfunctioning.
    const states = [
      { state: 'clean', present: [{ hex: '#1B4C7E', label: 'Primary' }] },
      { state: 'clean', present: [] },
      { state: 'findings', intruders: [{ hex: '#9C9080' }], present: [] },
      { state: 'unreadable', reason: 'no-brand-colours' },
      { state: 'unreadable', reason: 'decode-failed' },
      { state: 'no-palette', found: [{ hex: '#8C6B4F' }] },
      { state: 'no-chromatic' },
      null,
    ]
    for (const s of states) {
      const { line } = markColourLine(s)
      expect(line, JSON.stringify(s)).toBeTruthy()
      expect(line.trim(), JSON.stringify(s)).toMatch(/\.$/)
      // No exclamation marks, no red-flag punctuation, nothing shouted.
      expect(line, JSON.stringify(s)).not.toMatch(/[!⚠✗×]/)
      const sentences = line.split(/(?<=\.)\s+/).filter(Boolean)
      expect(sentences.length, `${line} is more than one sentence`).toBe(1)
    }
  })
})
