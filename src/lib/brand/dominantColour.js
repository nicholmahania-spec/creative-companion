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

import { hexToRgb, xyzToLab, rgbToXyz } from './deltaE.js'

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
  const colours = [...buckets.values()]
    .map((c) => ({
      hex: rgbToHex({ r: c.r / c.n, g: c.g / c.n, b: c.b / c.n }),
      coverage: c.n / ink,
    }))
    .filter((c) => c.coverage >= COVERAGE_FLOOR)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, maxColours)

  return { colours, readable: colours.length > 0, substrateShare }
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
