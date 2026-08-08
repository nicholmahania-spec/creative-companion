/**
 * Favorites — the designer's own evidence, kept apart from the client's pack.
 *
 * ONE BOOLEAN WAS DOING TWO JOBS. `inPack` has always meant "on the client's
 * shortlist": capped at six, ordered, one hero, and read by the pack export,
 * the artboard's mood strip, `stopEstablished`, `completeness` and
 * `brandBrain`. But it was also the only way to say "I like this" — so liking
 * a reference and putting it in front of a client were the same click, and a
 * designer who wanted to keep seven references had to choose which one the
 * client would not see.
 *
 *   favorite         I like this and want it as evidence for later work.
 *                    Unbounded, unordered, never client-facing.
 *   inPack           This goes on the client's shortlist.
 *
 * Neither implies the other. A favorite may never be shown; a pack pin may be
 * one the client asked for rather than one the designer likes.
 *
 * NO COPIES. Later stages take a REFERENCE to the pin — `artifactRef`'s
 * `evidence` kind — and read through it. Color already works this way
 * (`applyFromPins` samples the pins in place). Type, Mark and Directions will
 * do the same. Nothing here duplicates an image, a hex or a note.
 */

import { makeRef } from '../artifacts/artifactRef'

/** Pins belonging to one project (or to no project, which is the shared wall). */
export function projectPins(moodItems, projectId) {
  return (moodItems || []).filter(
    (m) => m && (m.projectId == null || m.projectId === projectId)
  )
}

/** True when the designer marked this pin as evidence worth keeping. */
export function isFavorite(pin) {
  return !!pin?.favorite
}

/** True when this pin is on the client's shortlist. */
export function isSharedWithClient(pin) {
  return !!pin?.inPack
}

/**
 * The designer's favorites for a project, newest first.
 *
 * This is what Color, Type, Mark and Directions consume. It returns the PINS,
 * not copies of their content — callers read `visual`, `note` and so on
 * through the live record so an edited pin is never stale downstream.
 */
export function favoritePins(moodItems, projectId) {
  return projectPins(moodItems, projectId).filter(isFavorite)
}

/** Favorites narrowed to one pin type — `'image'`, `'note'`, `'colour'`, … */
export function favoritePinsOfType(moodItems, projectId, type) {
  return favoritePins(moodItems, projectId).filter((m) => m.type === type)
}

/** A reference to a pin, for anything that needs to point at it later. */
export function evidenceRef(pin) {
  return makeRef('evidence', String(pin?.id ?? ''))
}

/**
 * How many favorites a project has, and how many are also on the pack.
 *
 * The overlap is the number worth watching: if it is always total, the two
 * flags have collapsed back into one in practice and the split is not
 * carrying its weight.
 */
export function favoriteCounts(moodItems, projectId) {
  const pins = projectPins(moodItems, projectId)
  const favorites = pins.filter(isFavorite).length
  const shared = pins.filter(isSharedWithClient).length
  const both = pins.filter((m) => isFavorite(m) && isSharedWithClient(m)).length
  return { favorites, shared, both }
}
