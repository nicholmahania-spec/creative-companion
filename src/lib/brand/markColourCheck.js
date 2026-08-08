/**
 * "Does this mark use the colours the brand says it uses?"
 *
 * The reading, separate from both the sampling (sampleImage.js, which needs a
 * browser) and the wording (the component). Keeping it here is what makes the
 * judgement testable at all — nothing in this suite renders a view, and the
 * last two defects in this area were both invisible for exactly that reason.
 *
 * WHAT THIS IS NOT: a verdict. There is no score, no pass, no fail. A logo that
 * uses one brand colour is not worse than one that uses four — plenty of marks
 * are deliberately monochrome. The output is "here is what is in it", and the
 * designer decides whether that is what they meant.
 */

import {
  filterBrandColours,
  intruderColours,
  paletteCoverage,
} from './dominantColour.js'

/**
 * A palette colour counts as WORN BY the mark if the mark carries it at more
 * than a trace. Below this it is an anti-aliased edge or a stray pixel of a
 * neighbouring shape, not the mark "using" the colour.
 */
export const WORN_MIN_COVERAGE = 0.02

/**
 * @param {object} args
 * @param {{colours: Array<{hex:string,coverage:number}>, readable: boolean,
 *          reason?: string}} args.sample  from sampleImageColours
 * @param {string[]} args.palette          approved palette hexes
 * @param {(hex: string) => string|null} [args.labelFor]  hex → role name
 * @returns {{state: string, reason?: string,
 *            present: Array<{hex:string,label:string|null,coverage:number}>,
 *            intruders: Array<{hex:string,coverage:number}>}}
 */
export function markColourReading({ sample, palette = [], labelFor } = {}) {
  const empty = { present: [], intruders: [] }
  const label = (hex) => (labelFor ? labelFor(hex) || null : null)

  if (!sample || !sample.readable) {
    return { state: 'unreadable', reason: sample?.reason || 'no-image', ...empty }
  }

  const raw = (palette || []).filter(Boolean)
  /* ONLY THE CHROMATIC COLOURS, and this is not a refinement — it is the
     difference between a working feature and a permanent false chore.
     `dominantColours` discards near-white, near-black and near-neutral pixels
     as substrate, by design (isSubstrate). Verified against real role values:
     Neutral #A8A29E, Neutral 2 #57534E, Text #1C1917 and Background #FAFAF9
     are ALL substrate. So checking a mark against them would report every one
     of them missing, on every mark anyone ever uploads, forever — findings
     that are always true and never actionable. That is the noise this
     module's own header cites Dixon et al. about, and it would teach the
     designer to ignore the panel, including the one honest thing it says. */
  const hexes = filterBrandColours(raw)

  if (!hexes.length) {
    /* Nothing to check against is not a finding about the mark. The mark's own
       colours are still worth handing back — the caller may offer them as a
       starting palette, which is the one version of this feature that removes
       work instead of adding it. */
    return {
      state: raw.length ? 'no-chromatic' : 'no-palette',
      ...empty,
      found: sample.colours || [],
    }
  }

  const { found } = paletteCoverage(sample.colours, hexes)

  /* paletteCoverage answers "is this colour anywhere in the asset", which is
     the right question for a business card and the wrong one for a mark: a
     single anti-aliased pixel of the brand navy would report the navy as used.
     A mark is small and deliberate, so require the colour to actually be worn. */
  const present = found
    .filter((f) => (f.coverage ?? 0) >= WORN_MIN_COVERAGE)
    .map((f) => ({
      hex: f.brandHex,
      label: label(f.brandHex),
      coverage: f.coverage ?? 0,
    }))

  /* THERE IS DELIBERATELY NO "MISSING COLOURS" LIST. A mark does not have to
     wear every brand colour — most are one or two colours on purpose — so
     naming the rest as absent hands the designer a list of things not done at
     the moment they just finished something, with no correct answer to any of
     it. The finding worth keeping is the one that removes a step, not the one
     that describes a gap. */
  /* A NEAR MISS IS NOT REPORTED, AND THAT IS A MEASUREMENT, NOT A SHRUG.
     `paletteCoverage` marks ΔE00 2–5 as "drifted", and reporting that felt
     obviously right until it was measured. Bucket means are averaged in
     GAMMA-ENCODED sRGB over buckets 24 units wide, so ordinary JPEG noise
     moves a PERFECTLY CORRECT colour by more than that band is wide:

       pixel jitter   worst drift measured on a correct colour
       none                0.00
       ±3  (light JPEG)    0.70
       ±8  (moderate)      2.23   <- already inside the "drifted" band
       ±15 (heavy)         4.17

     So at 2–5 the pipeline cannot tell "the designer used a slightly wrong
     blue" from "this was saved as a JPEG", and a finding there would fire on
     good work. The intruder threshold of 15 sits far outside that noise,
     which is why that half of the check is trustworthy and this half is not.

     The cost is honest and worth naming: a mark leaning on a colour 5–15 away
     from its nearest brand colour produces NOTHING. That includes the example
     PRODUCT.md §23 gives — #2E5C8A against an approved #1B4C7E is ΔE00 5.40.
     Reporting it would mean reporting compression artefacts too. */
  const intruders = intruderColours(sample.colours, hexes)

  return { state: intruders.length ? 'findings' : 'clean', present, intruders }
}

const list = (items) =>
  items.length > 1
    ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
    : items[0] || ''

/**
 * The sentence the designer reads, and any action attached to it.
 *
 * Deliberately here rather than in the component. The wording IS the feature
 * — the maths only decides which of six sentences is true — and nothing in
 * this suite renders a view, so copy living in JSX is copy nothing can check.
 * That is precisely how five of nine role labels reached the client wrong.
 *
 * @param {ReturnType<typeof markColourReading>} reading
 * @param {{ paletteFull?: boolean }} [opts]
 * @returns {{ line: string, action?: 'use-palette' | 'add-colour' }}
 */
export function markColourLine(reading, { paletteFull = false } = {}) {
  const state = reading?.state

  if (!reading || state === 'unreadable') {
    /* A flat black-and-white mark is a correct, common and often deliberate
       choice, so this sentence is ABOUT THE ARTWORK and reads as a fact a
       designer would say approvingly of their own mono logo. Any phrasing
       starting "couldn't" invites the reader to supply a reason, and the two
       available reasons are "my logo is wrong" or "this is broken". */
    if (reading?.reason === 'no-brand-colours') {
      return { line: 'Black and white — nothing to compare against your palette.' }
    }
    // A genuine tool failure, said as a fact about the file, not the design.
    return { line: "This image didn't open for a color check." }
  }

  if (state === 'no-palette') {
    /* THE ONE THAT REMOVES WORK. Getting these colours into the palette
       otherwise costs an eyedropper trip outside the app, holding two hex
       strings in working memory, and typing them into another screen. */
    const hexes = (reading.found || []).map((c) => c.hex)
    if (!hexes.length) return { line: 'No palette yet.' }
    return { line: `Found ${list(hexes)} in this mark.`, action: 'use-palette' }
  }

  if (state === 'no-chromatic') {
    return {
      line: 'Your palette is neutrals only, so there is nothing here to compare.',
    }
  }

  if (state === 'findings') {
    /* "Yet", and the action adds to the PALETTE rather than pointing at the
       artwork. At the Mark stage the logo is usually the finished, approved
       thing and the palette is the incomplete one, so the likely correction
       runs that way. "Doesn\'t match" would point the designer at redoing
       work they just finished. */
    const hexes = reading.intruders.map((i) => i.hex)
    return {
      line: `Leans on ${list(hexes)}, which ${
        hexes.length > 1 ? "aren't" : "isn't"
      } in your palette yet.`,
      action: paletteFull || hexes.length > 1 ? undefined : 'add-colour',
    }
  }

  const worn = (reading.present || []).map((p) => p.label || p.hex)
  if (!worn.length) {
    return { line: 'None of your palette colors turn up in this mark.' }
  }
  return { line: `Uses your ${list(worn)}.` }
}
