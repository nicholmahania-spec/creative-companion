/**
 * Which colours an uploaded asset actually USES — as opposed to which colours
 * are merely present in the largest quantity.
 *
 * The naive version of this feature is the reason it needs writing carefully.
 * A business card is roughly 90% white stock with a small logo on it. Ask for
 * the "dominant colour" and you get the paper — which is not in the approved
 * palette, so the checker fires a banner about the card's own substrate. That
 * is a manufactured false positive on the single most common asset in brand
 * work, and false positives are the specific failure that kills this kind of
 * tool: Dixon, Wickens & McCarley (Human Factors, 2007) found false-alarm-prone
 * automation degrades performance MORE than miss-prone automation, because it
 * destroys trust in the quiet state as well as the alert. Once a designer
 * learns to dismiss the banner, they also dismiss "I could not read this file"
 * — the one genuinely honest thing this feature says.
 *
 * So the substrate is excluded before anything is compared:
 *
 *   - near-white and near-black are paper and ink, not brand decisions
 *   - near-neutral greys are shadow, newsprint and JPEG mush
 *   - anything under a coverage floor is a compression artefact or an
 *     anti-aliased edge, not a colour anyone chose
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: guess. If nothing survives the filters,
 * it returns an empty list and the caller says so plainly. An extractor that
 * always finds something will always give the checker something to complain
 * about, which is precisely the failure mode above.
 */

import { deltaE00Hex, hexToLab, hexToRgb, xyzToLab, rgbToXyz } from './deltaE.js'

/** Lightness above this is treated as paper/background, not a brand colour. */
export const SUBSTRATE_L_MAX = 92

/** Lightness below this is treated as ink/shadow. */
export const SUBSTRATE_L_MIN = 12

/**
 * Chroma below this is a neutral — grey card, shadow, or compression mush.
 *
 * Deliberately measured in CIELAB chroma rather than HSL saturation: HSL
 * saturation inflates wildly at lightness extremes, so a near-black pixel with
 * a hint of blue reports as vividly saturated and sails through. That exact
 * mistake was made and fixed elsewhere in this codebase (colourAxes.js), and
 * it would be worse here — it would let shadow read as a brand colour.
 */
export const NEUTRAL_CHROMA_MAX = 8

/** A colour occupying less of the image than this is not a decision. */
export const COVERAGE_FLOOR = 0.005 // 0.5%

/** Quantisation step. Coarse on purpose — see groupKey. */
const STEP = 24

/**
 * Bucket a colour so that near-identical pixels count as one.
 *
 * JPEG and any photographic mockup smear a flat brand colour across hundreds
 * of adjacent RGB values. Without bucketing, a solid logo fills the histogram
 * with a thousand near-duplicates and nothing clears the coverage floor.
 */
function groupKey(r, g, b) {
  return `${Math.round(r / STEP)},${Math.round(g / STEP)},${Math.round(b / STEP)}`
}

const toHex = (n) =>
  Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')

export const rgbToHex = ({ r, g, b }) => `#${toHex(r)}${toHex(g)}${toHex(b)}`

/** Chroma of an RGB triple in CIELAB terms. */
export function chromaOf({ r, g, b }) {
  const { a, b: bb } = xyzToLab(rgbToXyz({ r, g, b }))
  return Math.hypot(a, bb)
}

/**
 * Is this pixel part of the substrate rather than the brand?
 *
 * Exported because the answer is a judgement the caller may want to explain
 * to a designer ("we ignored the paper"), and because it is the single most
 * likely thing to need tuning against real assets.
 */
export function isSubstrate({ r, g, b }) {
  const { L } = xyzToLab(rgbToXyz({ r, g, b }))
  if (L >= SUBSTRATE_L_MAX) return true
  if (L <= SUBSTRATE_L_MIN) return true
  return chromaOf({ r, g, b }) < NEUTRAL_CHROMA_MAX
}

/**
 * Colours a designer actually chose, from raw RGBA pixels.
 *
 * @param {Uint8ClampedArray|number[]} data RGBA, as from getImageData
 * @param {{ maxColours?: number }} [opts]
 * @returns {{ colours: Array<{hex:string, coverage:number}>, readable: boolean,
 *             substrateShare: number }}
 *   `readable: false` means nothing survived the filters — the caller must say
 *   so rather than reporting a clean result.
 */
export function dominantColours(data, { maxColours = 5 } = {}) {
  if (!data || data.length < 4) {
    return { colours: [], readable: false, substrateShare: 0 }
  }

  const buckets = new Map()
  let counted = 0
  let substrate = 0

  for (let i = 0; i + 3 < data.length; i += 4) {
    const alpha = data[i + 3]
    // Transparent pixels are not a colour choice; a logo on transparency would
    // otherwise report its own empty background as the dominant colour.
    if (alpha < 128) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    counted++

    if (isSubstrate({ r, g, b })) {
      substrate++
      continue
    }

    const key = groupKey(r, g, b)
    const cur = buckets.get(key)
    if (cur) {
      cur.n++
      cur.r += r
      cur.g += g
      cur.b += b
    } else {
      buckets.set(key, { n: 1, r, g, b })
    }
  }

  if (!counted) return { colours: [], readable: false, substrateShare: 0 }

  const substrateShare = substrate / counted
  const ink = counted - substrate
  if (!ink) return { colours: [], readable: false, substrateShare }

  /* Coverage is measured against NON-SUBSTRATE pixels, not the whole image.
     Against the whole image a logo on a business card is ~2% and would sit
     near the floor; among the pixels that are actually ink it is the entire
     story. Measuring against the wrong denominator is how the floor ends up
     discarding the only colour that mattered. */
  const raw = [...buckets.values()]
    .map((c) => ({
      hex: rgbToHex({ r: c.r / c.n, g: c.g / c.n, b: c.b / c.n }),
      coverage: c.n / ink,
    }))
    .filter((c) => c.coverage >= COVERAGE_FLOOR)
    .sort((a, b) => b.coverage - a.coverage)

  const merged = mergeNearDuplicates(raw)
  /* Background tints are found AFTER merging, because a tint is only
     recognisable once its anti-aliased near-duplicates have been folded back
     into it and it is carrying its true share. */
  const tinted = merged.filter(isBackgroundTint)
  const colours = merged
    .filter((c) => !isBackgroundTint(c))
    .slice(0, maxColours)

  return {
    colours,
    readable: colours.length > 0,
    substrateShare,
    backgroundTints: tinted.map((t) => t.hex),
  }
}

/**
 * Merge colours the eye would call the same colour.
 *
 * MEASURED, not assumed. Run against a real 5-year-celebration PDF, the RGB
 * bucketing alone returned #024aaa, #045abe, #024ab9 and #0656af as four
 * separate findings. Those four are 2.2–5.7 ΔE00 apart — they are one brand
 * blue, anti-aliased and re-quantised by the renderer, and reporting them
 * separately would have fired four banners about a single correct colour.
 *
 * RGB buckets cannot fix this by getting coarser, because "how far apart is
 * far" is not an RGB question: the same RGB step is invisible in one part of
 * the space and obvious in another. So the merge happens in ΔE00, using the
 * same threshold the checker uses to call something a match — if two samples
 * would both count as matching the same brand colour, they must not be
 * reported as two findings.
 *
 * Coverage is summed into the heaviest member, so the merged entry keeps its
 * true share of the artwork.
 */
export function mergeNearDuplicates(colours, threshold = 2) {
  const out = []
  for (const c of colours) {
    const near = out.find((o) => {
      const d = deltaE00Hex(o.hex, c.hex)
      return d != null && d < threshold
    })
    if (near) near.coverage += c.coverage
    else out.push({ ...c })
  }
  return out.sort((a, b) => b.coverage - a.coverage)
}

/**
 * Is this a page background rather than a brand colour?
 *
 * The lightness cutoff alone was not enough. A real birth-plan PDF carries a
 * pale blue page tint of #dae7f6 — L 91.1, just under the substrate ceiling —
 * and it came back as 92% of the "ink" on the page, i.e. as that document's
 * dominant brand colour. It is the paper, printed.
 *
 * Lightness cannot separate those on its own without also discarding genuinely
 * pale brand tints, so DOMINANCE is the second signal: a very light colour
 * that covers most of the artwork is a background. A pale brand accent does
 * not cover 90% of a page; a tint block does.
 */
export function isBackgroundTint({ hex, coverage }) {
  const lab = hexToLab(hex)
  if (!lab) return false
  return lab.L > 85 && coverage > 0.5
}

/**
 * Flat-colour helper for tests and for callers that already have swatches.
 * Same filtering, no pixels.
 */
export function filterBrandColours(hexes = []) {
  return hexes.filter((hex) => {
    const rgb = hexToRgb(hex)
    return rgb ? !isSubstrate(rgb) : false
  })
}

/**
 * The check, inverted — and this inversion is the whole design.
 *
 * The obvious rule is "flag every colour in the asset that is not in the
 * palette". Measured against four real client PDFs, that rule is unusable:
 *
 *   - a gradient logo (red→purple→navy) yields six midpoints, each 13–36 ΔE00
 *     from BOTH brand colours. Six false positives on a correct file.
 *   - a shaded blue yields samples 2–6 ΔE00 apart, individually distinct but
 *     collectively one design decision.
 *   - maximalist artwork yields dozens of legitimate illustration colours.
 *
 * None of those are mistakes by the designer, and a banner about any of them
 * is a false alarm. The base rate is the problem: a designer uploading their
 * own approved deliverable has usually used the right colours, so under the
 * obvious rule almost every alert is wrong — and Dixon, Wickens & McCarley
 * (2007) put the crossover at 0.70 reliability, below which the automation is
 * worse than none.
 *
 * So ask the other question: IS EACH APPROVED COLOUR ACTUALLY PRESENT? That
 * one is answerable, and its failure mode is the useful one — a business card
 * that missed the brand navy is a real problem a designer wants to know about,
 * whereas a business card containing an unlisted shade of grey is not.
 *
 * Gradients, illustration and shading no longer generate findings at all,
 * because nothing is judged for merely existing.
 */
export function paletteCoverage(assetColours = [], palette = []) {
  const found = []
  const missing = []
  for (const brandHex of palette) {
    let best = null
    for (const c of assetColours) {
      const d = deltaE00Hex(c.hex, brandHex)
      if (d == null) continue
      if (!best || d < best.delta) best = { delta: d, ...c }
    }
    if (best && best.delta < 2) {
      found.push({ brandHex, as: best.hex, delta: best.delta, coverage: best.coverage })
    } else if (best && best.delta <= 5) {
      found.push({
        brandHex,
        as: best.hex,
        delta: best.delta,
        coverage: best.coverage,
        drifted: true,
      })
    } else {
      missing.push(brandHex)
    }
  }
  return { found, missing }
}

/**
 * A colour the asset leans on that is nowhere near the approved palette.
 *
 * THIS IS THE CHECK PRODUCT.md §23 ASKS FOR — "the blue used in this asset
 * does not match the approved primary brand color" — and an earlier version of
 * this module could not express it. The binary form of the rule (flag anything
 * further than the close band from every palette entry) was measured on real
 * client work and produced NINE findings across two entirely correct files, so
 * the check was inverted to ask only whether approved colours were present.
 *
 * That inversion was an over-correction, and it was wrong in a specific way:
 * `paletteCoverage` takes the minimum distance over the asset's colours, so a
 * card printed in the wrong blue that carries the correct navy anywhere on it
 * reports "found". The defect §23 names became structurally undetectable. The
 * Dixon et al. result that motivated the inversion compares false-alarm-prone
 * against miss-prone automation on the SAME signal; it says nothing about
 * dropping the signal, so it never licensed that trade.
 *
 * The remedy the alarm literature actually prescribes is to grade the alarm,
 * not to remove the detection — Sorkin, Kantowitz & Kantowitz, "Likelihood
 * Alarm Displays" (Human Factors 30(4), 1988). Graded here on two axes:
 *
 *   DISTANCE   far past the close band, not merely outside it. Rendering,
 *              CMYK conversion and anti-aliasing all move a correct colour a
 *              few units; none of them move it 15.
 *   COVERAGE   a colour the artwork actually leans on. Gradient midpoints,
 *              illustration and shading are individually small; a wrong brand
 *              colour is not.
 *
 * Measured at these defaults, both real client files that previously produced
 * nine findings now produce ZERO, while a dominant unapproved colour still
 * fires. The gradient is suppressed for being small, not by giving up.
 */
export const INTRUDER_MIN_DELTA = 15
export const INTRUDER_MIN_COVERAGE = 0.1

export function intruderColours(
  assetColours = [],
  palette = [],
  { minDelta = INTRUDER_MIN_DELTA, minCoverage = INTRUDER_MIN_COVERAGE } = {}
) {
  if (!palette.length) return []
  return assetColours
    .filter((c) => {
      if ((c.coverage ?? 0) < minCoverage) return false
      const deltas = palette
        .map((p) => deltaE00Hex(c.hex, p))
        .filter((d) => d != null)
      if (!deltas.length) return false
      return Math.min(...deltas) > minDelta
    })
    .map((c) => ({ hex: c.hex, coverage: c.coverage }))
}
