/**
 * What a direction was built from, resolved for display.
 *
 * RESEARCH DISCOVERS, DIRECTIONS INTERPRETS. Before this, the middle of the
 * process was two disconnected halves: the wall collected pins and Visual
 * Discovery collected choices, and Directions asked for three titles with no
 * sight of either. A designer who could not say in words what they wanted —
 * the person this product exists for — had nothing on screen to point at.
 *
 * This module is the join, and it holds the same three rules the composition
 * does:
 *
 *   NOTHING IS COPIED. A citation is a refKey. The image, the hex and the
 *   note are read through the live pin at the moment they are drawn.
 *
 *   A MISSING CITATION IS MISSING. A deleted pin resolves to `{ missing }` and
 *   the caller says so. Substituting whatever the wall holds today would show
 *   a direction built from material the designer never saw.
 *
 *   NOTHING IS INFERRED. An item carries what it is — a hex, a family name, a
 *   pin's own note — and never a reading of the person who kept it. The only
 *   sentences about a pattern come from `discoveryObservations`, which counts
 *   comparisons and refuses to speak below its threshold.
 */

import { parseRefKey, refKey, makeRef } from '../artifacts/artifactRef'
import { sampleById } from '../discovery/samples'
import { favoritePins, pinSampleId } from './favorites'

/** A refKey for any pin, sample-backed or hand-collected. */
export function pinRefKey(pin) {
  const sampleId = pinSampleId(pin)
  return sampleId
    ? refKey(makeRef('sample', sampleId))
    : refKey(makeRef('evidence', String(pin?.id ?? '')))
}

/**
 * One resolved citation.
 *
 * @returns {{key:string, kind:string, pin:object|null, sample:object|null,
 *   missing:boolean}}
 */
function resolveOne(key, pins) {
  const ref = parseRefKey(key)
  if (!ref) return { key, kind: '', pin: null, sample: null, missing: true }
  /* Matched on the whole refKey, kind included. A lookup on the bare id would
     bind `sample:type:fraunces:700` to any pin whose own id happened to read
     `type:fraunces:700` — the reference grammar exists precisely so a kind
     cannot be dropped from a comparison. */
  const pin = pins.find((m) => pinRefKey(m) === key) || null
  const sample = ref.kind === 'sample' ? sampleById(ref.id) : null
  /* A sample that is still in the registry is never missing, even if the pin
     was taken off the wall: the stimulus is app-level and can still be drawn.
     Everything else is only as present as its pin. */
  return { key, kind: ref.kind, pin, sample, missing: !pin && !sample }
}

/**
 * Everything the designer has kept for this project, newest first.
 *
 * The shared band above the three directions — "here is what you responded
 * to". Favorites only: the pack is the client's shortlist and the wall holds
 * everything ever collected, and neither is the same question as "which of
 * these did I like".
 */
export function projectEvidence(project, moodItems) {
  return favoritePins(moodItems, project?.id).map((pin) => ({
    key: pinRefKey(pin),
    kind: pinSampleId(pin) ? 'sample' : 'evidence',
    pin,
    sample: pinSampleId(pin) ? sampleById(pinSampleId(pin)) : null,
    missing: false,
  }))
}

/** The citations on one direction, resolved. Order is the designer's. */
export function directionEvidence(direction, moodItems, projectId) {
  const keys = Array.isArray(direction?.evidence) ? direction.evidence : []
  const pins = (moodItems || []).filter(
    (m) => m && (m.projectId == null || m.projectId === projectId)
  )
  return keys.map((k) => resolveOne(k, pins))
}

/**
 * Which directions cite this piece of material.
 *
 * THIS IS THE COMPARISON. The cards side by side show what each route is made
 * of; this shows the overlap between them — the same serif cited by two routes
 * and not the third is a fact about the shortlist that no single card can
 * state. It is a list, never a score: counting citations and ranking the routes
 * by them would be an opinion the evidence does not hold.
 */
export function citingDirections(project, key) {
  return (project?.directions || [])
    .filter((d) => (Array.isArray(d?.evidence) ? d.evidence : []).includes(key))
    /* IDS, NOT LETTERS. The letter a route wears is its position among the
       routes that exist and reflows when one is deleted; the id does not.
       Callers that need to draw a letter map through `directionLetters`. */
    .map((d) => String(d.id || ''))
}

/** A short factual label for a citation. No judgement, no invention. */
export function evidenceSummary(item) {
  if (!item || item.missing) return 'No longer available'
  if (item.sample) return item.sample.label || item.sample.id
  const pin = item.pin || {}
  if (pin.type === 'color') return pin.visual || 'Color'
  if (String(pin.note || '').trim()) return String(pin.note).trim()
  if (pin.linkTitle || pin.link) return pin.linkTitle || pin.link
  return pin.type === 'image' ? 'Image' : 'Pin'
}
