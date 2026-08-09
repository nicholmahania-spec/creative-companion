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

import { makeRef, parseRefKey, refKey } from '../artifacts/artifactRef'

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
 * DIRECTIONS CONSUMES THIS. Nothing else does yet, and the earlier version of
 * this line claimed Color, Type and Mark did too — they never have, and a
 * comment vouching for a consumer that does not exist is how dead code stays
 * alive. Add a name here when the reader ships, not when it is planned.
 *
 * It returns the PINS, not copies of their content — callers read `visual`,
 * `note`, `ref` and so on through the live record so an edited pin is never
 * stale downstream.
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

/* ── Samples on the wall ───────────────────────────────────────────────
   Visual Discovery shows stimuli the app owns; the wall holds evidence the
   project owns. Favoriting a sample had no way across that line, so the
   heart in Visual Discovery called `toggleFavorite('sample:…')` against a
   pin that never existed and the click did nothing at all.

   THE FIX IS ONE FAVORITE CONCEPT, NOT A SECOND STORE. A favorited sample
   becomes an ordinary pin whose id IS its reference — `sample:type:fraunces:700`
   — so `favoritePins` already returns it, `isFavorite` already reads it, and
   Directions consumes samples and hand-collected references through the same
   list. Nothing new keeps its own set of liked things.

   THE PIN CARRIES NO FACT THAT COULD ROT. A sample is app-level and immutable:
   `color:b45309` is that hex forever, so the swatch the wall draws can never
   disagree with the sample. Anything richer than a face — the letterform, the
   trait record — is read back through `sampleById`, never copied. */

/** The pin id for a sample. Identical to its refKey, deliberately. */
export function samplePinId(sampleId) {
  return refKey(makeRef('sample', sampleId))
}

/** The sample id a pin stands for, or '' for an ordinary pin. */
export function pinSampleId(pin) {
  const ref = parseRefKey(pin?.ref || pin?.id)
  return ref && ref.kind === 'sample' ? ref.id : ''
}

/** True when this pin exists because a sample was favorited. */
export function isSamplePin(pin) {
  return !!pinSampleId(pin)
}

/**
 * The wall record for a sample.
 *
 * A colour draws itself, so it gets the face every colour pin has. A typeface
 * cannot be drawn by the wall, so it gets a note carrying the sample's name —
 * a caption the designer may then rewrite in their own words. Either way `ref`
 * is the truth and `sampleById` is how anything that needs the real thing gets
 * it.
 */
export function pinFromSample(sample) {
  if (!sample?.id) return null
  /* EVERY FIELD `addMoodPin` WOULD HAVE SET. This is a second constructor for
     a `moodItems` record and there is no way around that — the pin has to
     exist before `toggleFavorite` can flag it — so the guard is a test that
     compares the two shapes. A field added to one and not the other is how a
     future migration quietly skips every sample pin. */
  const base = {
    id: samplePinId(sample.id),
    ref: samplePinId(sample.id),
    favorite: true,
    inPack: false,
    packOrder: 0,
    packHero: false,
    boardOrder: 0,
  }
  if (sample.category === 'color') {
    return { ...base, type: 'color', visual: sample.hex, note: '' }
  }
  return { ...base, type: 'note', note: sample.label || sample.id }
}

/**
 * Should un-favoriting remove this pin outright?
 *
 * Only a sample pin the designer has not otherwise touched. The heart created
 * it; pressing the heart again should leave the wall as it found it rather
 * than accumulating a card for every sample ever liked and unliked. A note
 * they rewrote, or a pin they put in the client pack, is theirs now and stays.
 */
export function samplePinIsDisposable(pin, sample) {
  if (!isSamplePin(pin) || pin.inPack) return false
  const seeded = sample ? (pinFromSample(sample)?.note ?? '') : ''
  return String(pin.note ?? '').trim() === String(seeded).trim()
}
