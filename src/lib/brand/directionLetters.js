/**
 * Which routes exist, and what each is called on screen.
 *
 * A·B·C ARE POSITION, NOT IDENTITY. The letter used to live on the record and
 * get written into the decision log, so deleting B left the log naming a place
 * the surviving routes had reshuffled out from under. Here it is computed at
 * render time from where a route sits among the routes that exist; the `id` is
 * the only thing anything persists, references or points at.
 *
 * IN A LIB, NOT THE STORE. `DirectionEvidence` needs the mapping and importing
 * the store into a feature's render path would pull the whole workspace in
 * behind it. The store re-exports these so views keep one import.
 */

/** The three ids a route may occupy. Three is the cap that makes it a shortlist. */
export const DIRECTION_SLOT_IDS = Object.freeze(['a', 'b', 'c'])

/** True for 'a' | 'b' | 'c' — nothing else may become a route. */
export function isDirectionSlotId(id) {
  return DIRECTION_SLOT_IDS.includes(String(id || '').toLowerCase())
}

/** The letter for a position among the rendered routes. */
export function directionLetter(index) {
  return String.fromCharCode(65 + Math.max(0, index))
}

const listOf = (project) =>
  Array.isArray(project?.directions) ? project.directions : []

/**
 * The routes a project has, in slot order, each carrying the letter it is
 * drawn with. Records that do not exist are absent — there are no blanks.
 */
export function orderedDirections(project) {
  const dirs = listOf(project)
  return DIRECTION_SLOT_IDS.map((id) => dirs.find((d) => d?.id === id))
    .filter(Boolean)
    .map((d, i) => ({ ...d, letter: directionLetter(i) }))
}

/** `{ a: 'A', c: 'B' }` — id to displayed letter, for anything drawing chips. */
export function directionLetters(project) {
  return Object.fromEntries(orderedDirections(project).map((d) => [d.id, d.letter]))
}

/** The first slot with no record, or null when all three are taken. */
export function firstFreeDirectionSlot(project) {
  const dirs = listOf(project)
  return DIRECTION_SLOT_IDS.find((id) => !dirs.some((d) => d?.id === id)) || null
}
