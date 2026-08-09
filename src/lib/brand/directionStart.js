/**
 * How Directions starts from kept evidence — three honest states.
 *
 *   nothing  — no favorites. Point back at the hearts; invent nothing.
 *   thin     — some kept material, not enough (or not axis-readable) to
 *              offer a split. Show the count; one empty route is enough.
 *   split    — four or more items with a usable physical axis, and no
 *              routes yet. Offer a computed grouping as citations only.
 *
 * THE LINE THIS MUST NOT CROSS. Computing "warmer / cooler" from hexes is
 * a fact. Naming those groups, inventing a palette, or writing a why is
 * authoring. The offer creates references when accepted; it never pretends
 * the split is a finished creative direction.
 */

import { axesForColour } from './colourAxes'
import { normalizeHex } from '../color'

/** Kept items needed before a split may be offered. */
export const SPLIT_MIN_KEPT = 4

/**
 * Axes a single evidence item can honestly sit on.
 * Same physical rule as colourAxes: warmth null for near-greys.
 */
const SPLIT_AXES = Object.freeze([
  {
    id: 'warmth',
    high: 'warmer',
    low: 'cooler',
    mid: 0.5,
  },
  {
    id: 'energy',
    high: 'higher energy',
    low: 'lower energy',
    mid: 0.5,
  },
  {
    id: 'weight',
    high: 'heavier',
    low: 'lighter',
    mid: 0.5,
  },
])

/**
 * A hex from kept evidence, or null.
 * Color samples and color pins only — type and images have no temperature.
 */
export function evidenceHex(item) {
  if (!item || item.missing) return null
  if (item.sample?.category === 'color' && item.sample.hex) {
    return normalizeHex(item.sample.hex)
  }
  const pin = item.pin || {}
  if (pin.type === 'color') {
    return normalizeHex(pin.visual || pin.hex || '')
  }
  return null
}

/** Readable axes for one kept item, or null when nothing is measurable. */
export function evidenceAxes(item) {
  const hex = evidenceHex(item)
  if (!hex) return null
  return axesForColour(hex)
}

/**
 * Best binary split of kept items by a physical axis.
 *
 * Prefers warmth, then energy, then weight — the order colourAxes can
 * defend. Items without a value on the chosen axis are left out of both
 * groups (not forced into a pole). Both poles must be non-empty and the
 * items with a reading must total at least SPLIT_MIN_KEPT.
 *
 * @param {Array} items  projectEvidence() results
 * @returns {null | {
 *   axis: string,
 *   highLabel: string,
 *   lowLabel: string,
 *   highKeys: string[],
 *   lowKeys: string[],
 *   highCount: number,
 *   lowCount: number,
 *   measured: number,
 *   summary: string,
 * }}
 */
export function computeEvidenceSplit(items = []) {
  const list = Array.isArray(items) ? items : []
  if (list.length < SPLIT_MIN_KEPT) return null

  for (const axis of SPLIT_AXES) {
    const scored = []
    for (const item of list) {
      const axes = evidenceAxes(item)
      const v = axes?.[axis.id]
      if (v === null || v === undefined || !item.key) continue
      scored.push({ key: item.key, value: v })
    }
    if (scored.length < SPLIT_MIN_KEPT) continue

    const highKeys = []
    const lowKeys = []
    for (const row of scored) {
      if (row.value >= axis.mid) highKeys.push(row.key)
      else lowKeys.push(row.key)
    }
    if (!highKeys.length || !lowKeys.length) continue

    return {
      axis: axis.id,
      highLabel: axis.high,
      lowLabel: axis.low,
      highKeys,
      lowKeys,
      highCount: highKeys.length,
      lowCount: lowKeys.length,
      measured: scored.length,
      /* Factual counts only — no creative names. */
      summary: `Start from what you kept — 2 routes, ${highKeys.length} ${axis.high}, ${lowKeys.length} ${axis.low}`,
    }
  }
  return null
}

/**
 * Which start state the Directions shortlist is in.
 *
 * @param {Array} evidenceItems  from projectEvidence
 * @param {Array} routes         from orderedDirections (existing routes)
 * @returns {{
 *   state: 'nothing'|'thin'|'split'|'ready',
 *   kept: number,
 *   offer: object|null,
 *   reason: string,
 * }}
 */
export function classifyDirectionStart(evidenceItems = [], routes = []) {
  const kept = Array.isArray(evidenceItems) ? evidenceItems.length : 0
  const hasRoutes = Array.isArray(routes) && routes.length > 0

  if (kept === 0) {
    return {
      state: 'nothing',
      kept: 0,
      offer: null,
      reason:
        'Nothing kept yet. Tap ♥ on Research or in Visual Discovery and it shows up here.',
    }
  }

  /* Existing routes mean the designer is already shortlisting — do not
     offer a computed replace, and do not narrate "thin". */
  if (hasRoutes) {
    return { state: 'ready', kept, offer: null, reason: '' }
  }

  const offer = computeEvidenceSplit(evidenceItems)
  if (offer) {
    return {
      state: 'split',
      kept,
      offer,
      reason: offer.summary,
    }
  }

  /* Thin: kept something, but not a measurable split (count < 4, or no
     axis-readable material, or everything on one pole). */
  const measurable = evidenceItems.filter((i) => evidenceAxes(i)).length
  let reason
  if (kept < SPLIT_MIN_KEPT) {
    reason = `${kept} kept — add more, or start one route with what you have.`
  } else if (measurable < SPLIT_MIN_KEPT) {
    reason = `${kept} kept · ${measurable} with readable colour — need ${SPLIT_MIN_KEPT} colour facts to split.`
  } else {
    reason = `${kept} kept — colours sit too close to split on their own.`
  }

  return {
    state: 'thin',
    kept,
    offer: null,
    reason,
  }
}
