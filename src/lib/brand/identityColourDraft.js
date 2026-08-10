/**
 * Identity Color development surface (L2).
 *
 * DISPLAY / DRAFT ONLY until "Set as brand palette".
 * Initialized from the chosen route's colour material so factory stone/teal
 * is not the thing the designer is developing. Never writes the store.
 *
 *   L1 route material  →  L2 draft hexes  →  L3 project.palette (explicit Set)
 */

import { normalizeHex } from '../color'

/**
 * @param {ReturnType<import('./directionWorkingMaterial').directionWorkingMaterial> | null} working
 * @returns {{
 *   active: boolean,
 *   source: 'ref'|'evidence'|'none'|null,
 *   hexes: string[],
 *   key: string|null,
 * }}
 */
export function colourDraftSeed(working) {
  if (!working?.directionId) {
    return { active: false, source: null, hexes: [], key: null }
  }
  const source = working.colour?.source || 'none'
  const hexes = (working.colour?.hexes || [])
    .map((h) => normalizeHex(h))
    .filter(Boolean)
  const key = `${working.directionId}:${source}:${hexes.join(',')}`
  return {
    active: true,
    source,
    /* Ref or evidence: start from route material. None: empty surface —
       factory palette stays L3 only until the designer builds and Sets. */
    hexes: source === 'none' ? [] : [...hexes],
    key,
  }
}

/**
 * Whether the working editor is a route draft (must not hit project.palette
 * until Set as brand palette).
 */
export function isColourDraftMode(seed) {
  return !!(seed && seed.active)
}

/**
 * Immutable helpers for draft palette edits (component state).
 */
export function draftReplaceAt(hexes, index, hex) {
  const n = normalizeHex(hex)
  if (!n) return hexes
  const next = [...(hexes || [])]
  if (index < 0 || index >= next.length) return hexes
  next[index] = n
  return next
}

export function draftAddHex(hexes, hex, max = 8) {
  const list = [...(hexes || [])]
  if (list.length >= max) return list
  const n = normalizeHex(hex) || '#888888'
  list.push(n)
  return list
}

export function draftRemoveAt(hexes, index) {
  const list = [...(hexes || [])]
  if (list.length <= 0) return list
  if (index < 0 || index >= list.length) return list
  /* Keep at least 0 for empty route develop; promotion requires ≥1. */
  list.splice(index, 1)
  return list
}

/** True when draft differs from current project palette (promotion meaningful). */
export function draftDiffersFromProject(draftHexes, projectHexes) {
  const a = (draftHexes || []).map((h) => normalizeHex(h)).filter(Boolean)
  const b = (projectHexes || []).map((h) => normalizeHex(h)).filter(Boolean)
  if (a.length !== b.length) return true
  return a.some((h, i) => h !== b[i])
}

/**
 * Family name from a sample label like "Fraunces Bold" for specimen preview.
 * Display only — never written into project type fields.
 */
export function familyFromSampleLabel(label) {
  const s = String(label ?? '').trim()
  if (!s) return ''
  return s
    .replace(/\s+(Bold|Regular|SemiBold|Medium|Light|Black|Thin|Italic)$/i, '')
    .trim()
}
