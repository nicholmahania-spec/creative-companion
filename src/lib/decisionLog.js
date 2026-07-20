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
  const letter = String(d.label || d.directionId || '').toUpperCase()
  const title = String(d.title || '').trim()
  const why = String(d.why || '').trim()
  if (!title && !why) return ''
  const head = letter
    ? `Chose ${letter}${title ? `: ${title}` : ''}`
    : title || 'Decision'
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
    label: dir.label || dir.id || '',
    title: String(dir.title || '').trim(),
    why: String(dir.note || '').trim(),
    at: Date.now(),
  }
}

/** Chosen direction on project, if any. */
export function chosenDirection(project = {}) {
  const dirs = Array.isArray(project.directions) ? project.directions : []
  return (
    dirs.find((d) => d.chosen && String(d.title || d.note || '').trim()) || null
  )
}
