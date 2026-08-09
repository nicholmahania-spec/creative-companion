/**
 * What a direction is made of, resolved for display.
 *
 * A direction stores refKeys. This turns them back into things you can draw,
 * and it is the only place that knows how. Three rules it exists to hold:
 *
 *   NOTHING IS COPIED. Every part is read through its reference at the moment
 *   it is shown, so a direction is a view over the project rather than a
 *   second store of marks and palettes.
 *
 *   A MISSING PART IS MISSING. A deleted concept resolves to null and the
 *   caller renders a gap. Substituting the project's current mark would show
 *   a composition the designer never assembled.
 *
 *   THE COMPOSITION DOES NOT ROT. Palette and type ids are content-derived, so
 *   editing the palette tomorrow leaves this direction resolving to the one it
 *   was built from. That is the whole reason the snapshot exists.
 */

import { parseRefKey, resolveRef } from '../artifacts/artifactRef'

/**
 * The parts a direction is made of, in the order they read.
 *
 * Named COMPOSITION_SLOTS, not DIRECTION_SLOTS — the store already owns that
 * name for the three Ideate positions A·B·C. Two different "slots" in one
 * feature is a real trap: one is which direction, the other is which part of
 * it.
 */
export const COMPOSITION_SLOTS = Object.freeze(['mark', 'typePairing', 'palette'])

/**
 * @param {object} project
 * @param {object} direction one of `project.directions`
 * @returns {{mark, typePairing, palette, filled: number, empty: string[]}}
 *   Each slot is the resolved artifact or null. `filled` counts what resolved,
 *   which is what a caller needs to decide whether there is anything to show —
 *   never a completion score.
 */
export function directionComposition(project, direction) {
  const refs = direction?.refs || {}
  const out = { mark: null, typePairing: null, palette: null }
  for (const slot of COMPOSITION_SLOTS) {
    const ref = parseRefKey(refs[slot])
    out[slot] = ref ? resolveRef(project, ref) : null
  }
  out.filled = COMPOSITION_SLOTS.filter((s) => out[s]).length
  /* Slots pointed at something that is gone — a concept the designer deleted.
     Distinct from never having been set, and the caller may want to say so. */
  out.empty = COMPOSITION_SLOTS.filter((s) => refs[s] && !out[s])
  return out
}

/**
 * Where to go to change a resolved part.
 *
 * CHOOSE, DEVELOP and SWAP are three different acts. This is DEVELOP: it hands
 * back the authoritative workspace for a slot so the designer edits the real
 * thing, rather than the direction growing an editor of its own and becoming a
 * second author of a mark, a pairing or a palette.
 */
export const SLOT_HOME = Object.freeze({
  mark: { view: 'brand', section: 'logo' },
  typePairing: { view: 'brand', section: 'type' },
  palette: { view: 'brand', section: 'colors' },
})

/** A short factual label for a slot's contents. No judgement, no invention. */
export function slotSummary(slot, artifact) {
  if (!artifact) return ''
  if (slot === 'mark') return artifact.label || 'Mark'
  if (slot === 'typePairing')
    return [artifact.heading, artifact.body].filter(Boolean).join(' + ')
  if (slot === 'palette') return `${(artifact.hexes || []).length} colors`
  return ''
}

/**
 * Every snapshot of one kind the project has ever captured.
 *
 * SWAP NEEDS SOMETHING TO SWAP TO. "Use current" could only ever point a
 * direction at the project's palette as it stands right now, so a designer who
 * captured one palette on A and then edited Color could not give B the earlier
 * one — the snapshot existed, and nothing could name it. Snapshots are
 * content-addressed and tiny, so the list is exactly the distinct palettes and
 * pairings this project has held.
 */
export function artifactsOfKind(project, kind) {
  return Object.values(project?.artifacts || {}).filter((a) => a?.kind === kind)
}

/**
 * A label that tells two snapshots apart in a picker.
 *
 * `slotSummary` says "5 colors", which is true of every five-colour palette
 * the project has captured. A picker offering three identical lines is not a
 * choice, so the first hex and the heading face come along.
 */
export function artifactChoiceLabel(kind, artifact) {
  if (!artifact) return ''
  if (kind === 'palette') {
    const hexes = artifact.hexes || []
    return hexes.length ? `${hexes.length} colors · ${hexes[0]}` : 'Empty palette'
  }
  return slotSummary(kind, artifact) || 'Untitled'
}
