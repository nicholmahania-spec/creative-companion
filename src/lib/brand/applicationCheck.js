/**
 * "Does this finished piece use the brand's colours?"
 *
 * The same maths as `markColourCheck.js`, pointed the other way round.
 *
 * WHY THIS IS A SEPARATE MODULE AND NOT A FLAG. On the Mark screen the logo
 * is the finished, approved thing and the palette is usually the incomplete
 * one, so `markColourLine` phrases every finding as a gap in the PALETTE
 * ("isn't in your palette yet") and offers **Add to palette**. On a business
 * card that reasoning runs backwards: the palette was approved weeks ago and
 * the card is the new work. Offering "add this to your palette" there would
 * quietly widen the brand every time a designer checked a deliverable, which
 * is the opposite of a consistency check. Same numbers, different sentence,
 * different action — and the sentence IS the feature.
 *
 * IT IS STILL NOT A VERDICT. No score, no pass/fail, no red, and it never
 * blocks anything. `intruderColours` fires only past ΔE00 15 with ≥10%
 * coverage (see its header for why those numbers), so this is a LARGE-error
 * detector: a card printed in a slightly wrong navy produces nothing at all.
 * That miss-prone bias is deliberate and measured, and it is why the clean
 * sentence reports what was SEEN rather than vouching for the artwork.
 */

import { nearestBrandColour } from './deltaE.js'
import {
  filterBrandColours,
  intruderColours,
  paletteCoverage,
} from './dominantColour.js'

/**
 * Read a sampled application against the palette.
 *
 * NO "WORN" FLOOR, unlike the mark. `markColourReading` requires a palette
 * colour to cover ≥2% before it counts as used, because a mark is small and
 * deliberate. A business card is mostly paper: the brand navy may be a rule
 * and a logo and legitimately cover 1%. `dominantColour.js` says this in its
 * own words — `paletteCoverage` "answers 'is this colour anywhere in the
 * asset', which is the right question for a business card". So this reading
 * takes it at face value.
 *
 * @param {object} args
 * @param {{colours: Array<{hex:string,coverage:number}>, readable: boolean,
 *          reason?: string}} args.sample from sampleImageColours / checkFile
 * @param {string[]} args.palette approved palette hexes
 * @param {(hex: string) => string|null} [args.labelFor] hex → role name
 */
export function applicationColourReading({ sample, palette = [], labelFor } = {}) {
  const empty = { present: [], intruders: [] }
  const label = (hex) => (labelFor ? labelFor(hex) || null : null)

  if (!sample || !sample.readable) {
    return {
      state: 'unreadable',
      reason: sample?.reason || 'no-file',
      ...empty,
    }
  }

  const raw = (palette || []).filter(Boolean)
  /* Chromatic entries only — the same non-negotiable the mark check makes.
     `dominantColours` discards near-white, near-black and near-neutral pixels
     as substrate, so a palette's Neutral, Text and Background roles can never
     be found in any asset. Comparing against them would report them absent on
     every deliverable forever: findings that are always true and never
     actionable. */
  const hexes = filterBrandColours(raw)

  if (!hexes.length) {
    return {
      state: raw.length ? 'no-chromatic' : 'no-palette',
      ...empty,
      found: sample.colours || [],
    }
  }

  const { found } = paletteCoverage(sample.colours, hexes)
  const present = found.map((f) => ({
    hex: f.brandHex,
    label: label(f.brandHex),
    coverage: f.coverage ?? 0,
    drifted: !!f.drifted,
  }))

  /* The nearest approved colour travels WITH each finding. This is the
     specific sentence PRODUCT.md §23 asks for — "this asset uses #2E5C8A,
     your approved primary is #1B4C7E" — and without the neighbour the
     designer has to eyeball a hex against nine roles to find out which one
     they missed. Computing it here rather than in the component keeps it
     testable; nothing in this suite renders a view. */
  const intruders = intruderColours(sample.colours, hexes).map((i) => {
    const near = nearestBrandColour(i.hex, hexes)
    return {
      ...i,
      nearestHex: near?.hex || null,
      nearestLabel: near?.hex ? label(near.hex) : null,
    }
  })

  return { state: intruders.length ? 'findings' : 'clean', present, intruders }
}

const list = (items) =>
  items.length > 1
    ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
    : items[0] || ''

/**
 * The one sentence the designer reads about a finished piece.
 *
 * Wording lives here, not in JSX, for the reason the whole `brand/` folder
 * is built this way: nothing in the unit suite renders a view, so copy in a
 * component is copy nothing can check — which is exactly how five of nine
 * role labels once reached the client wrong.
 *
 * @param {ReturnType<typeof applicationColourReading>} reading
 * @returns {{ line: string, tone?: 'note' }}
 */
/**
 * What this check can and cannot see, said on the panel rather than left in
 * a commit message.
 *
 * MEASURED ON REAL CLIENT WORK, which is why the wording is this blunt.
 * Sparrow's Promise's own brand sheet, checked against the two colours
 * printed in their own guide, returned "Uses your #32c1d6" — and said
 * nothing at all about the red, which is 59% of the page. Their red renders
 * ΔE00 6.14 from the specified #ED1C24: past the band that confirms a match
 * (5) and far short of the band that reports a stranger (15). Neither
 * confirmed nor flagged. Silent.
 *
 * That gap is deliberate and is not closable at this fidelity — below 15 the
 * sampler's own noise floor on a JPEG is 4.17, so a slightly-wrong colour and
 * a correctly-printed one are genuinely indistinguishable here. What is NOT
 * acceptable is letting a clean sentence read as approval when the check
 * cannot see the most common professional error. So the panel says so.
 */
export const CHECK_SCOPE_NOTE =
  'Only catches a colour well away from yours — a near-miss reads the same as a match here.'

export function applicationColourLine(reading) {
  const state = reading?.state

  if (!reading || state === 'unreadable') {
    const reason = reading?.reason
    if (reason === 'no-brand-colours') {
      /* A one-colour piece — black type on white stock — is a correct and
         common deliverable. This is a fact about the artwork, said the way a
         designer would say it about their own work, not a complaint. */
      return { line: 'Black and white — nothing here to compare against your palette.' }
    }
    if (reason === 'unsupported-type') {
      /* Names what WOULD work. "Unsupported file" tells the designer they did
         something wrong and leaves them to guess the fix. */
      return { line: 'Colour check reads PNG, JPEG, WebP, SVG and PDF.' }
    }
    if (reason === 'no-pages') {
      return { line: "That PDF has no pages to read." }
    }
    return { line: "This file didn't open for a colour check." }
  }

  if (state === 'no-palette') {
    return { line: 'No palette yet, so there is nothing to check this against.' }
  }

  if (state === 'no-chromatic') {
    return { line: 'Your palette is neutrals only, so there is nothing here to compare.' }
  }

  if (state === 'findings') {
    const first = reading.intruders[0]
    const hexes = reading.intruders.map((i) => i.hex)
    /* THE NEIGHBOUR IS THE POINT. "Leans on #2E5C8A" makes the designer go
       and look it up; "your Primary is #1B4C7E" is the whole finding in one
       read. Only the first is named — a list of four hexes with four
       neighbours is a table, and a table is a task. */
    if (hexes.length === 1 && first.nearestHex) {
      const near = first.nearestLabel
        ? `${first.nearestLabel} (${first.nearestHex})`
        : first.nearestHex
      return {
        line: `Leans on ${first.hex}, which is not in your palette — your nearest is ${near}.`,
      }
    }
    return {
      line: `Leans on ${list(hexes)}, which ${
        hexes.length > 1 ? 'are' : 'is'
      } not in your palette.`,
    }
  }

  const worn = (reading.present || []).map((p) => p.label || p.hex)
  if (!worn.length) {
    /* Worth saying on an application, where it is NOT said on a mark. A logo
       with none of the palette in it is often a mono lockup. A business card
       with none of the brand's colours anywhere on it is the thing the
       designer wants to catch. Still a description, still not an alarm. */
    return { line: 'None of your palette colours turn up in this one.' }
  }
  return { line: `Uses your ${list(worn)}.` }
}
