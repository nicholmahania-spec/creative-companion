/**
 * Factual, computed differences between direction palettes.
 *
 * DISPLAY ONLY. Nothing is stored, and nothing is authored. The line names
 * where one route's colours sit relative to another's on axes that
 * `axesForPalette` can honestly read from hexes — warmth, energy, weight.
 * Cultural axes (formality, era) stay silent because a hex does not hold them.
 *
 * WITHIN CLOSE_ENOUGH the axis is not worth a designer's attention, so this
 * says nothing rather than inventing a contrast. When every axis is close, or
 * a route has no palette material, the line is empty.
 */

import { AXES, CLOSE_ENOUGH } from './alignment'
import { axesForPalette } from './colourAxes'
import { directionPreview } from './directionPreview'

/**
 * Comparative wording for each physical axis.
 *
 * Drawn from AXES poles, not free copy. Energy uses "higher/lower energy"
 * rather than "more energetic" so the unit is explicit; weight uses lighter /
 * heavier so "lighter than C" matches what a designer sees on paper.
 */
const COMPARATIVE = Object.freeze({
  warmth: { high: 'warmer', low: 'cooler' },
  energy: { high: 'higher energy', low: 'lower energy' },
  weight: { high: 'heavier', low: 'lighter' },
})

/** Axes a palette can actually speak for — formality and era stay null. */
const PALETTE_AXIS_IDS = AXES.map((a) => a.id).filter((id) => COMPARATIVE[id])

/**
 * One route's palette axes, or null when there is nothing to measure.
 *
 * Hexes come from the same resolution path as the specimen (`directionPreview`)
 * so the line never describes a palette the card is not showing.
 */
function paletteAxes(project, direction, opts) {
  const { hexes } = directionPreview(project, direction, opts)
  if (!hexes?.length) return null
  const axes = axesForPalette(hexes)
  const hasAny = PALETTE_AXIS_IDS.some(
    (id) => axes[id] !== null && axes[id] !== undefined
  )
  return hasAny ? axes : null
}

/**
 * The single strongest factual difference for one route against its peers.
 *
 * @param {object} project
 * @param {object} direction  the route being described
 * @param {Array<{id, letter, ...}>} peers  other routes with derived letters
 * @param {{ moodItems?: array, projectId?: string|number }} [opts]
 * @returns {string} e.g. "warmer than B", or "" when nothing is worth saying
 */
export function directionDifferenceLine(project, direction, peers = [], opts = {}) {
  const mine = paletteAxes(project, direction, opts)
  if (!mine) return ''

  let best = null
  for (const peer of peers) {
    if (!peer || peer.id === direction?.id) continue
    const theirs = paletteAxes(project, peer, opts)
    if (!theirs) continue
    const letter = peer.letter || ''
    if (!letter) continue

    for (const axisId of PALETTE_AXIS_IDS) {
      const a = mine[axisId]
      const b = theirs[axisId]
      if (a === null || a === undefined || b === null || b === undefined) continue
      const delta = a - b
      if (Math.abs(delta) <= CLOSE_ENOUGH + 1e-9) continue
      const words = COMPARATIVE[axisId]
      if (!words) continue
      const phrase = delta > 0 ? words.high : words.low
      const abs = Math.abs(delta)
      if (!best || abs > best.abs) {
        best = { abs, phrase, letter }
      }
    }
  }

  if (!best) return ''
  return `${best.phrase} than ${best.letter}`
}

/**
 * Difference line for every route in a shortlist, keyed by direction id.
 *
 * @param {object} project
 * @param {Array<{id, letter, ...}>} routes  orderedDirections output
 * @param {{ moodItems?: array, projectId?: string|number }} [opts]
 * @returns {Record<string, string>}
 */
export function directionDifferenceLines(project, routes = [], opts = {}) {
  const list = Array.isArray(routes) ? routes : []
  const out = {}
  for (const route of list) {
    if (!route?.id) continue
    const peers = list.filter((r) => r && r.id !== route.id)
    out[route.id] = directionDifferenceLine(project, route, peers, opts)
  }
  return out
}
