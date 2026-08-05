/**
 * Read a palette's position on the rulers FROM THE COLOURS THEMSELVES.
 *
 * Why this exists: a cold-start test swapped a whole palette to the one
 * colour the client had explicitly forbidden, and the alignment panel kept
 * saying "matches your strategy" — because it was reading axis values the
 * designer had typed, not the colours on screen. Numbers you typed agreeing
 * with other numbers you typed is not a second opinion.
 *
 * WHAT IS AND IS NOT DERIVABLE, stated plainly, because getting this wrong
 * is how the last version went astray:
 *
 *   Warmth  — YES. Hue angle is physical. Red/orange/yellow are warm, blue
 *             and blue-green are cool. This is about as close to objective
 *             as colour gets.
 *   Energy  — YES. Saturation is what "loud" means in a colour. A muted
 *             sage and a fluorescent lime differ here in a way anyone sees.
 *   Weight  — YES, with care. Darkness and depth read as heavy; pale and
 *             airy read as light.
 *
 *   Formality — NO. There is nothing in a hex value that makes it formal.
 *               Navy reads formal in the West because of suits, not physics.
 *   Era       — NO. Avocado green reads 1970s by association alone. The same
 *               hex was not "retro" in 1972.
 *
 * The two that are not derivable stay NULL and render as "not said" rather
 * than being guessed. Inventing a cultural reading and presenting it as a
 * measurement is exactly the failure this module was written to correct —
 * an honest gap is worth more than a confident fabrication.
 */
import { hexToHsl, hexToRgb } from '../color.js'

/** Hue angles that read warmest and coolest. 40° is orange, straight in the
 *  middle of the warm end; 210° is a cold blue. Warmth falls off with
 *  angular distance from the warm pole. */
const WARM_HUE = 40
const COOL_HUE = 210

const clamp01 = (n) => Math.min(1, Math.max(0, n))

/** Shortest distance between two hue angles, 0–180. */
function hueDistance(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360)
  return d > 180 ? 360 - d : d
}

/**
 * One colour's readable axes.
 * @returns {{warmth: number|null, energy: number, weight: number}}
 */
export function axesForColour(hex) {
  const hsl = hexToHsl(hex)
  const rgb0 = hexToRgb(hex)
  if (!hsl || !rgb0) return null

  /* A near-grey has no meaningful hue — the hue channel of #333 is noise,
     not a temperature. Reporting warmth for it would be reading tea leaves,
     so it goes null and the axis says "not said" for that colour.
     Tested on ABSOLUTE chroma, not HSL saturation: saturation is normalised
     by lightness, so it inflates at the extremes. #23261F is a near-black
     whose channels span 7/255 — visually a dark grey — yet HSL calls it 10%
     saturated, which was enough to have it report a confident warmth. */
  const rgbSpan =
    (Math.max(rgb0.r, rgb0.g, rgb0.b) - Math.min(rgb0.r, rgb0.g, rgb0.b)) / 255
  const chromatic = rgbSpan >= 0.06
  const warmth = chromatic
    ? clamp01(1 - hueDistance(hsl.h, WARM_HUE) / hueDistance(COOL_HUE, WARM_HUE))
    : null

  /* Saturation is the loudness of a colour, but a very dark or very pale
     colour cannot be loud whatever its saturation says — #0A0F08 is not
     energetic. Fold lightness in so near-black and near-white land calm. */
  const headroom = 1 - Math.abs(hsl.l - 0.5) * 2
  const energy = clamp01(hsl.s * (0.35 + 0.65 * headroom))

  /* Dark and saturated reads heavy; pale reads light. Lightness carries
     most of it, with saturation adding a little density. */
  const weight = clamp01(1 - hsl.l * 0.85 + hsl.s * 0.1)

  return { warmth, energy, weight }
}

/**
 * The palette's axes, weighted toward the colours that carry it.
 *
 * Not a flat average: a palette is usually one or two colours doing the
 * talking plus neutrals holding the page. Averaging an oat white into a
 * loden green drags every reading toward the middle and describes a palette
 * nobody chose. Chromatic colours therefore weigh more than near-greys.
 *
 * @param {string[]} palette hex strings
 * @returns {{formality: null, energy: number|null, warmth: number|null,
 *   weight: number|null, era: null, read: Array}}
 */
export function axesForPalette(palette = []) {
  const cols = (Array.isArray(palette) ? palette : [])
    .map((hex) => ({ hex, hsl: hexToHsl(hex), axes: axesForColour(hex) }))
    .filter((c) => c.hsl && c.axes)

  if (!cols.length) {
    return {
      formality: null,
      energy: null,
      warmth: null,
      weight: null,
      era: null,
      read: [],
    }
  }

  // A neutral still counts, but quietly — it is holding the page, not
  // setting the tone.
  const weightOf = (c) => 0.25 + 0.75 * Math.min(1, c.hsl.s / 0.5)

  const weighted = (pick) => {
    let sum = 0
    let total = 0
    for (const c of cols) {
      const v = pick(c)
      if (v === null || v === undefined) continue
      const w = weightOf(c)
      sum += v * w
      total += w
    }
    return total === 0 ? null : sum / total
  }

  return {
    // Physical, so derived.
    warmth: weighted((c) => c.axes.warmth),
    energy: weighted((c) => c.axes.energy),
    weight: weighted((c) => c.axes.weight),
    // Cultural, so left unsaid rather than invented.
    formality: null,
    era: null,
    read: cols.map((c) => ({ hex: c.hex, ...c.axes })),
  }
}

/* ------------------------------------------------------------ vetoes ----- */

/**
 * Colour families, for reading a brief's own words back against a palette.
 *
 * The names are the ones clients actually use. Ranges are deliberately
 * generous — a client saying "no orange" means the family, not a hex.
 */
const FAMILIES = [
  { name: 'orange', hue: [18, 45], minSat: 0.25 },
  { name: 'red', hue: [345, 17], minSat: 0.25 },
  { name: 'yellow', hue: [46, 65], minSat: 0.25 },
  { name: 'green', hue: [80, 165], minSat: 0.12 },
  { name: 'teal', hue: [166, 195], minSat: 0.15 },
  { name: 'blue', hue: [196, 250], minSat: 0.15 },
  { name: 'navy', hue: [205, 250], minSat: 0.2, maxLight: 0.32 },
  { name: 'purple', hue: [251, 300], minSat: 0.15 },
  { name: 'pink', hue: [301, 344], minSat: 0.15 },
  { name: 'brown', hue: [18, 45], minSat: 0.15, maxLight: 0.4 },
]

function inRange(h, [lo, hi]) {
  return lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi
}

/** Which families a hex belongs to (a dark orange is also brown). */
export function familiesFor(hex) {
  const hsl = hexToHsl(hex)
  if (!hsl) return []
  return FAMILIES.filter(
    (f) =>
      hsl.s >= f.minSat &&
      inRange(hsl.h, f.hue) &&
      (f.maxLight === undefined || hsl.l <= f.maxLight)
  ).map((f) => f.name)
}

/**
 * Colours the brief says NOT to use.
 *
 * The client in the test run said "No orange" and "not a hunter green", and
 * the app showed those back on the desk under a heading reading OFF THE
 * TABLE — while telling the designer an all-orange palette matched the
 * strategy. Reading the brief's own words against the palette is the
 * cheapest useful second opinion in the product, and unlike the axes it
 * requires no judgement: the client already said it.
 *
 * Matches "no orange", "not orange", "avoid orange", "no more orange",
 * "hates orange". Deliberately conservative — a false veto that blocks a
 * colour the client never objected to would be worse than a missed one.
 *
 * @param {string} text any brief text (avoid field, notes, etc.)
 * @returns {string[]} family names
 */
export function vetoedFamilies(text) {
  const t = String(text || '').toLowerCase()
  if (!t) return []
  const found = new Set()
  for (const f of FAMILIES) {
    // "no orange", "not orange", "avoid orange", "no more orange",
    // "nothing orange", "hates orange", "anything but orange"
    const re = new RegExp(
      `\\b(?:no|not|avoid|never|hate[sd]?|dislike[sd]?|nothing|anything but)\\b[^.!?;\\n]{0,24}\\b${f.name}\\b`,
      'i'
    )
    if (re.test(t)) found.add(f.name)
  }
  return [...found]
}

/**
 * Palette colours that break a stated veto.
 * @returns {Array<{hex: string, family: string}>}
 */
export function vetoBreaches(palette = [], briefText = '') {
  const vetoed = new Set(vetoedFamilies(briefText))
  if (!vetoed.size) return []
  const out = []
  for (const hex of palette) {
    for (const family of familiesFor(hex)) {
      if (vetoed.has(family)) out.push({ hex, family })
    }
  }
  return out
}
