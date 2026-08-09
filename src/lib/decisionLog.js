/**
 * Ideate → Sketch decision log helpers.
 * External working memory: “we chose B because …”
 */

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

/**
 * Append / replace a decision (same directionId replaces prior direction pick).
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
  // Also collapse to one "active" direction decision (latest choose wins)
  if (row.kind === 'direction') {
    next = next.filter((d) => d.kind !== 'direction')
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
 * @param {{ id?: string, label?: string, title?: string, note?: string }} dir
 */
export function decisionFromDirection(dir = {}) {
  return {
    kind: 'direction',
    directionId: dir.id || '',
    /* NO LETTER. `label` used to carry 'A' | 'B' | 'C' and the line read
       "Chose B: Loud grotesk". A·B·C are display labels derived from a route's
       position among the routes that currently exist, so deleting one reflows
       the rest — and a stored letter then names a route that no longer wears
       it. `directionId` is the reference and always was; the name is what a
       human recognises. See `isDirectionEntry` for the readers that still have
       to cope with letters written before this. */
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
