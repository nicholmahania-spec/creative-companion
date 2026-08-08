/**
 * Turning a live project value into a referenceable artifact.
 *
 * THE PROBLEM. A Direction says "B's mark, C's type, A's color". Marks already
 * have ids. A palette does not: it is `project.palette`, a bare array of hexes
 * that is rewritten in place every time the designer edits a swatch. If a
 * Direction pointed at "the project's palette" it would silently change
 * meaning the next time Color was touched, and three Directions could never
 * name three different palettes.
 *
 * SO A SNAPSHOT IS TAKEN, and its id is derived from its content. Two
 * consequences, both wanted:
 *
 *   1. Snapshotting the same palette twice yields the SAME id, so a project
 *      that references one palette from four places stores it once. No bloat,
 *      no dedupe pass.
 *   2. A snapshot is immutable by construction. Editing the palette produces a
 *      different id, so an existing reference keeps meaning what it meant when
 *      it was made. That is the property Approval and version history need.
 *
 * SMALL VALUES ONLY — NEVER BYTES. `project.artifacts` is persisted inside the
 * single localStorage blob that carries the whole workspace, and the store
 * already records what a 50MB deliverable does to that. Hexes and face names
 * are tens of bytes. Images stay where images live: `logoConcepts` for marks,
 * IndexedDB for asset bytes. A snapshot may reference those; it must not
 * contain them.
 */

import { normalizeHex } from '../color'
import { makeRef } from './artifactRef'

const clean = (v) => String(v ?? '').trim()

/**
 * A short, stable id from a canonical string. FNV-1a — not a security hash,
 * and it does not need to be: the only requirement is that equal content maps
 * to one id inside one project.
 */
function contentId(prefix, canonical) {
  let h = 0x811c9dc5
  for (let i = 0; i < canonical.length; i += 1) {
    h ^= canonical.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `${prefix}_${h.toString(16).padStart(8, '0')}`
}

/** The palette exactly as it will be compared and stored. */
function canonicalPalette(project) {
  const hexes = (Array.isArray(project?.palette) ? project.palette : [])
    .map((c) => normalizeHex(c) || clean(c))
    .filter(Boolean)
  const roleSrc = project?.colorRoles || {}
  /* Sorted so two identical role maps written in a different order are one
     artifact, not two. */
  const roles = Object.fromEntries(
    Object.keys(roleSrc)
      .sort()
      .map((k) => [k, normalizeHex(roleSrc[k]) || clean(roleSrc[k])])
      .filter(([, v]) => v)
  )
  return { hexes, roles }
}

/**
 * An immutable record of the project's current palette.
 *
 * @returns {{id, kind, hexes, roles}} — always a record, even for an empty
 *   palette, so a caller never has to branch on "is there a palette yet".
 */
export function paletteSnapshot(project) {
  const { hexes, roles } = canonicalPalette(project)
  const canonical = `${hexes.join(',')}|${Object.entries(roles)
    .map(([k, v]) => `${k}=${v}`)
    .join(',')}`
  return { id: contentId('pal', canonical), kind: 'palette', hexes, roles }
}

/**
 * An immutable record of the project's current heading + body pairing.
 *
 * Stores the LABELS ("Fraunces SemiBold"), which is the shape every existing
 * reader already understands — `parseLabel` splits family from weight where a
 * caller needs them. Storing a parsed object here would be a second shape for
 * the same fact.
 */
export function typePairingSnapshot(project) {
  const heading = clean(project?.typeHeading)
  const body = clean(project?.typeBody)
  return {
    id: contentId('type', `${heading}|${body}`),
    kind: 'typePairing',
    heading,
    body,
  }
}

/** A reference to a snapshot, without needing to know how ids are made. */
export function refForSnapshot(snapshot) {
  return makeRef(snapshot.kind, snapshot.id)
}
