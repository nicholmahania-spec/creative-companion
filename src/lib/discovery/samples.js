/**
 * The things a person reacts to in Visual Discovery.
 *
 * WHY A REGISTRY AND NOT AN ASSET LIBRARY. The brief asks people to describe
 * what they want — "modern or traditional?", "if your business were a person".
 * That works for someone who already has the vocabulary and fails completely
 * for the person who says "I'll know it when I see it", which includes most
 * clients and a designer trying to brand themselves. Showing two real things
 * and asking which is closer needs no vocabulary at all.
 *
 * Every sample here is rendered from data the repo already has — the 21
 * families in `fontCatalog` and a small set of hexes — so there are no image
 * files, no CDN, and nothing to keep in sync. A sample is a few fields; the
 * letterforms and swatches are drawn at render time.
 *
 * WHAT A SAMPLE IS NOT. It is not a proposal, a recommendation, or a brand
 * decision. It is a stimulus. Choosing one records a preference between two
 * things, nothing more — which is why `traits` below are only ever facts about
 * the sample (this family IS a serif; this hex IS warm), never readings of the
 * person who picked it.
 */

import { FONT_FAMILIES } from '../book/fontCatalog'
import { axesForColour } from '../brand/colourAxes'

/** The categories this version can show. More are supplied here, not coded. */
export const SAMPLE_CATEGORIES = Object.freeze(['type', 'color'])

/**
 * Weights each family is shown at.
 *
 * Two, deliberately: one comparison can then vary weight while holding the
 * family, which is the only way "you keep choosing the heavier one" can be
 * observed rather than guessed.
 */
const TYPE_WEIGHTS = [400, 700]

/**
 * Colors to react to.
 *
 * Eight, spanning warm/cool × light/dark × muted/saturated. Not a palette and
 * never offered as one — `axesForColour` reads warmth, energy and weight off
 * the hex itself, so what a choice between two of them means is computed, not
 * asserted. Kept to eight because a stimulus set is not a content library, and
 * building one is the point at which this phase was told to stop.
 */
const COLOR_HEXES = [
  '#1C1917', '#FAFAF9',
  '#B45309', '#0F766E',
  '#7C3AED', '#65A30D',
  '#E11D48', '#0369A1',
]

const typeSamples = () =>
  FONT_FAMILIES.flatMap((f) =>
    TYPE_WEIGHTS.map((w) => ({
      id: `type:${f.id}:${w}`,
      category: 'type',
      family: f.name,
      weight: w,
      /* Facts from the catalog, not readings. `axesForTypeface` nulls the
         cultural axes on purpose — a slab serif reads rugged because of where
         you have seen slab serifs — and this must not go behind its back. */
      traits: { category: f.category, weight: w >= 700 ? 'bold' : 'regular' },
      label: `${f.name} ${w >= 700 ? 'Bold' : 'Regular'}`,
    }))
  )

const colorSamples = () =>
  COLOR_HEXES.map((hex) => {
    const a = axesForColour(hex) || {}
    return {
      id: `color:${hex.slice(1).toLowerCase()}`,
      category: 'color',
      hex,
      /* Computed by the module that already knows how to read a hex honestly:
         warmth is null for a near-grey rather than invented. */
      traits: { warmth: a.warmth, energy: a.energy, weight: a.weight },
      label: hex,
    }
  })

let cache = null
/** Every sample, id-keyed. Built once — the inputs are static. */
export function sampleIndex() {
  if (!cache) {
    cache = new Map(
      [...typeSamples(), ...colorSamples()].map((s) => [s.id, s])
    )
  }
  return cache
}

/** One sample by id, or null. Null is a real answer — see `artifactRef`. */
export function sampleById(id) {
  return sampleIndex().get(String(id || '')) || null
}

export function samplesInCategory(category) {
  return [...sampleIndex().values()].filter((s) => s.category === category)
}

/**
 * Deterministic shuffle so a session is reproducible from its seed.
 *
 * `Math.random` is avoided for the same reason the workflow runtime bans it:
 * a pair a designer is halfway through choosing between must not change
 * because the component re-rendered.
 */
function order(list, seed) {
  let h = (seed >>> 0) || 1
  return list
    .map((item) => {
      h ^= h << 13
      h ^= h >>> 17
      h ^= h << 5
      h >>>= 0
      return { item, k: h }
    })
    .sort((a, b) => a.k - b.k)
    .map((x) => x.item)
}

/**
 * A comparison worth making.
 *
 * PAIRS MUST DIFFER ON SOMETHING. Two serifs at the same weight teach nothing
 * about serif-versus-sans, and counting such a pair toward a lean would be the
 * fabrication this feature exists to avoid. So a pair is only offered when the
 * two samples differ on at least one recorded trait, and `observations.js`
 * counts a choice only for the traits that actually differed.
 *
 * @param {string} category
 * @param {number} seed     stable per session
 * @param {number} index    which comparison in the session
 * @param {string[]} seenIds ids already shown, so a session does not repeat
 * @returns {[object, object] | null} null when the category is exhausted
 */
export function nextPair(category, seed, index, seenIds = []) {
  const pool = order(samplesInCategory(category), seed + index * 7919)
  const seen = new Set(seenIds)
  const fresh = pool.filter((s) => !seen.has(s.id))
  const from = fresh.length >= 2 ? fresh : pool
  const [first] = from
  if (!first) return null
  const second = from
    .slice(1)
    .find((s) => differingTraits(first, s).length > 0)
  return second ? [first, second] : null
}

/** The trait names on which two samples genuinely disagree. */
export function differingTraits(a, b) {
  if (!a || !b) return []
  const keys = new Set([
    ...Object.keys(a.traits || {}),
    ...Object.keys(b.traits || {}),
  ])
  const out = []
  for (const k of keys) {
    const av = a.traits?.[k]
    const bv = b.traits?.[k]
    /* A trait neither sample can speak to — `warmth` on two greys — is not a
       disagreement, it is silence. */
    if (av == null || bv == null) continue
    if (typeof av === 'number' && typeof bv === 'number') {
      if (Math.abs(av - bv) >= 0.15) out.push(k)
    } else if (av !== bv) out.push(k)
  }
  return out
}
