/**
 * Ideate → Sketch decision log helpers.
 * External working memory: “we chose B because …”
 */

import { isDirectionSlotId } from './brand/directionLetters'

/**
 * @typedef {{
 *   id: string|number,
 *   at: number,
 *   kind: string,
 *   directionId?: string,
 *   label?: string,
 *   title?: string,
 *   why?: string,
 * }} DecisionEntry
 */

/** True for a Direction.recordId minted by blankDirection (`dir_…`). */
export function isDirectionRecordId(id) {
  return /^dir_/.test(String(id || ''))
}

/**
 * Which live Direction a log row names.
 *
 * New rows store `recordId`. A match is exact. Legacy rows store the slot
 * (`a`|`b`|`c`). Those only resolve to a Direction that itself has no
 * recordId — the historical pair. A newly minted Direction A must not
 * inherit an old `directionId: 'a'`.
 *
 * Display (`formatDecisionLine`) reads title/why off the row and does not
 * need this. It exists so a reader cannot silently rebind old history.
 *
 * @param {object} [project]
 * @param {DecisionEntry|null} [entry]
 * @returns {object|null}
 */
export function directionForLogEntry(project, entry) {
  const id = String(entry?.directionId || '')
  if (!id) return null
  const dirs = Array.isArray(project?.directions) ? project.directions : []
  const byRecord = dirs.find((d) => d?.recordId && String(d.recordId) === id)
  if (byRecord) return byRecord
  if (!isDirectionSlotId(id)) return null
  const bySlot = dirs.find(
    (d) => String(d?.id || '').toLowerCase() === id.toLowerCase()
  )
  if (bySlot && !bySlot.recordId) return bySlot
  return null
}

/**
 * Append / replace a decision (same directionId replaces that subject's prior
 * pick). A different identity is a different subject — including a new
 * recordId after slot A was deleted and recreated — and does not swallow
 * the earlier row.
 * @param {DecisionEntry[]} log
 * @param {Partial<DecisionEntry>} entry
 * @param {{ max?: number }} [opts]
 * @returns {DecisionEntry[]}
 */
export function appendDecision(log = [], entry = {}, { max = 20 } = {}) {
  const title = String(entry.title || '').trim()
  const why = String(entry.why || '').trim()
  if (!title && !why) return Array.isArray(log) ? [...log] : []

  const row = {
    id: entry.id != null ? entry.id : Date.now(),
    at: Number(entry.at) || Date.now(),
    kind: entry.kind || 'direction',
    directionId: entry.directionId ? String(entry.directionId) : '',
    label: entry.label ? String(entry.label) : '',
    title,
    why,
  }

  const prev = Array.isArray(log) ? log.filter(Boolean) : []
  let next = prev
  if (row.kind === 'direction' && row.directionId) {
    /* Carry the ORIGINAL timestamp forward when refining a decision already
       logged. The store re-appends on every keystroke while the title or why
       of the chosen direction is being edited, so a fresh Date.now() each
       time made "decided at" mean "last typed at" — and this log exists to
       tell you when you committed, which is the one thing editing the wording
       does not change. An explicit `entry.at` still wins. */
    const existing = prev.find(
      (d) =>
        d.kind === 'direction' &&
        String(d.directionId) === String(row.directionId)
    )
    if (existing && !Number(entry.at)) {
      row.at = Number(existing.at) || row.at
      if (entry.id == null && existing.id != null) row.id = existing.id
    }
    next = prev.filter(
      (d) =>
        !(
          d.kind === 'direction' &&
          String(d.directionId) === String(row.directionId)
        )
    )
  }
  next = [...next, row]
  if (next.length > max) next = next.slice(-max)
  return next
}

/** Latest direction (or any) decision. */
export function latestDecision(log = [], kind = null) {
  const list = Array.isArray(log) ? log : []
  for (let i = list.length - 1; i >= 0; i--) {
    const d = list[i]
    if (!d) continue
    if (kind && d.kind !== kind) continue
    return d
  }
  return null
}

/**
 * One-line strip for Sketch / resume banner.
 * @param {DecisionEntry|null} d
 * @returns {string}
 */
export function formatDecisionLine(d) {
  if (!d) return ''
  const title = String(d.title || '').trim()
  const why = String(d.why || '').trim()
  if (!title && !why) return ''
  const head = title || 'Decision'
  if (why) return `${head} — because ${why}`
  return head
}

/**
 * Build a decision entry from an Ideate direction card.
 *
 * `directionId` is the durable recordId when the card has one. Slot `id`
 * (`a`|`b`|`c`) stays on the Direction for position; it is only written here
 * when a historical row never received a recordId, so we do not invent one.
 *
 * @param {{ id?: string, recordId?: string, title?: string, note?: string }} dir
 */
export function decisionFromDirection(dir = {}) {
  const durable = String(dir.recordId || '').trim()
  return {
    kind: 'direction',
    directionId: durable || dir.id || '',
    /* NO LETTER. `label` used to carry 'A' | 'B' | 'C' and the line read
       "Chose B: Loud grotesk". A·B·C are display labels derived from a route's
       position among the routes that currently exist, so deleting one reflows
       the rest — and a stored letter then names a route that no longer wears
       it. The name is what a human recognises. See `isDirectionEntry` for the
       readers that still have to cope with letters written before this. */
    title: String(dir.title || '').trim(),
    why: String(dir.note || '').trim(),
    at: Date.now(),
  }
}

/**
 * Should this entry's `label` be shown?
 *
 * Only for kinds that are not directions. Every direction entry written before
 * this change carries a frozen letter, and printing it would assert a position
 * the route may no longer hold — so the readers drop it rather than the data
 * being migrated. Nothing is rewritten: an old entry keeps its `directionId`
 * and keeps resolving.
 */
export function decisionLabelToShow(entry) {
  if (!entry || entry.kind === 'direction') return ''
  return String(entry.label || '').trim()
}

/** Chosen direction on project, if any. */
export function chosenDirection(project = {}) {
  const dirs = Array.isArray(project.directions) ? project.directions : []
  return (
    dirs.find((d) => d.chosen && String(d.title || d.note || '').trim()) || null
  )
}
