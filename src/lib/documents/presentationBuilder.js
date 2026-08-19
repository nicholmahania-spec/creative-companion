/**
 * Phase 5 — working Presentation composition.
 *
 * Analog of bookBuilder: mutable working state, not a Version.
 * Contents are Direction recordIds. Ordinary edits mint nothing.
 */

export const PRESENTATION_WORKING_KIND = 'direction'

function mint(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function mintPresentationItemId() {
  return mint('pitem')
}

export function blankPresentationBuilder() {
  return { v: 1, contents: [] }
}

export function isPresentationContentRow(row) {
  return !!(
    row &&
    typeof row === 'object' &&
    row.kind === PRESENTATION_WORKING_KIND &&
    String(row.id || '').trim() &&
    String(row.itemId || '').trim()
  )
}

/**
 * Working Presentation for a project. Fills defaults; drops illegal rows.
 */
export function presentationBuilderFor(project) {
  const saved = project?.presentationBuilder
  if (!saved || typeof saved !== 'object') return blankPresentationBuilder()
  const raw = Array.isArray(saved.contents) ? saved.contents : []
  return {
    v: 1,
    contents: raw.filter(isPresentationContentRow).map((row) => ({
      itemId: String(row.itemId),
      kind: PRESENTATION_WORKING_KIND,
      id: String(row.id).trim(),
    })),
  }
}
