/**
 * What the choices actually show — and, more often, that they do not yet.
 *
 * THE LINE THIS FEATURE MUST NOT CROSS. "You consistently chose serif faces
 * and warm color" is a report on evidence. "Your brand personality is
 * sophisticated and authentic" is a claim about a person the app has never
 * met. The first is what this file produces; the second is why every rule
 * below exists.
 *
 * THREE GUARDS AGAINST SAYING TOO MUCH:
 *
 *   1. A trait is only counted for comparisons where the two samples actually
 *      DIFFERED on it. Choosing between two serifs says nothing about serifs,
 *      and counting it would manufacture a lean out of noise.
 *   2. A category says nothing at all until it has MIN_CHOICES informative
 *      comparisons behind it. Four choices are not a pattern.
 *   3. Even then, a line appears only when one side wins by both a share and a
 *      margin. A 3–2 split is a coin toss with an opinion.
 *
 * The result is that an early session mostly reports "not enough yet", which
 * is the correct thing for it to say.
 */

import { sampleById, differingTraits } from './samples'
import { AXES } from '../brand/alignment'

/** Informative comparisons a category needs before it may report anything. */
export const MIN_CHOICES = 5

/** Share of the informative comparisons one side must win. */
const LEAN_SHARE = 0.65

const AXIS = Object.fromEntries(AXES.map((a) => [a.id, a]))

/** How a trait value is put into words. Facts only. */
const TRAIT_WORDS = {
  category: {
    serif: 'serif faces',
    sans: 'sans-serif faces',
    display: 'display faces',
    mono: 'monospaced faces',
    system: 'system faces',
  },
  weight: { bold: 'bolder weights', regular: 'regular weights' },
}

/** A numeric trait's poles come from the shared axis vocabulary, not new words. */
function numericWords(trait, high) {
  const axis = AXIS[trait]
  if (!axis) return null
  return high ? `${axis.high} color` : `${axis.low} color`
}

/**
 * Tally every informative comparison.
 *
 * @returns {{ perCategory: Record<string, {informative:number, traits:object}> }}
 */
function tally(choices) {
  const perCategory = {}
  for (const c of choices || []) {
    const shown = (c?.shown || []).map((k) => sampleById(idFromKey(k)))
    const chose = sampleById(idFromKey(c?.chose))
    if (shown.length !== 2 || !shown[0] || !shown[1] || !chose) continue
    const other = shown.find((s) => s.id !== chose.id)
    if (!other) continue

    const cat = (perCategory[c.category] ||= { informative: 0, traits: {} })
    const differing = differingTraits(chose, other)
    if (!differing.length) continue
    cat.informative += 1

    for (const t of differing) {
      const bucket = (cat.traits[t] ||= { n: 0, wins: {} })
      bucket.n += 1
      const v = chose.traits[t]
      const key =
        typeof v === 'number' ? (v > other.traits[t] ? 'high' : 'low') : v
      bucket.wins[key] = (bucket.wins[key] || 0) + 1
    }
  }
  return { perCategory }
}

/** `sample:type:fraunces:400` → `type:fraunces:400`. Tolerates a bare id. */
function idFromKey(key) {
  const s = String(key || '')
  return s.startsWith('sample:') ? s.slice('sample:'.length) : s
}

/**
 * What the choices suggest, or an honest statement that they do not yet.
 *
 * @param {object} project
 * @returns {{enough: boolean, lines: string[], counts: object, needed: number}}
 *   `lines` is empty whenever `enough` is false. There is no partial verdict:
 *   a half-formed observation reads as a conclusion.
 */
export function discoveryObservations(project) {
  const choices = project?.visualDiscovery?.choices || []
  const { perCategory } = tally(choices)
  const counts = Object.fromEntries(
    Object.entries(perCategory).map(([k, v]) => [k, v.informative])
  )
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  const ready = Object.entries(perCategory).filter(
    ([, v]) => v.informative >= MIN_CHOICES
  )
  if (!ready.length) {
    return {
      enough: false,
      lines: [],
      counts,
      total,
      needed: Math.max(0, MIN_CHOICES - Math.max(0, ...Object.values(counts), 0)),
    }
  }

  const lines = []
  for (const [, cat] of ready) {
    for (const [trait, bucket] of Object.entries(cat.traits)) {
      if (bucket.n < MIN_CHOICES) continue
      const [top, n] = Object.entries(bucket.wins).sort((a, b) => b[1] - a[1])[0]
      const share = n / bucket.n
      /* Share AND margin: 3 of 5 clears 0.6 but is one flipped choice from
         even, and stating it would be an opinion the evidence does not hold. */
      if (share < LEAN_SHARE || n - (bucket.n - n) < 2) continue
      const words =
        top === 'high' || top === 'low'
          ? numericWords(trait, top === 'high')
          : TRAIT_WORDS[trait]?.[top]
      if (words) lines.push(`${words} — ${n} of ${bucket.n}`)
    }
  }

  /* Ready by count but with no clear lean is a real and common result: the
     person's choices were genuinely mixed. Say that rather than reaching. */
  return { enough: lines.length > 0, lines, counts, total, needed: 0 }
}
