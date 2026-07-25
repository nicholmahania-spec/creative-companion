/**
 * Brand progress summary — read-only, derived from state that already
 * exists elsewhere (brand fields on the project). Adds zero new data
 * entry anywhere; this is a glanceable progress signal, not a tool.
 */
import { isStockProjectPalette } from './journeyProgress'

const PROGRESS_ITEMS = [
  { id: 'palette', label: 'colors' },
  { id: 'logo', label: 'logo' },
  { id: 'tagline', label: 'tagline' },
  { id: 'voice', label: 'voice' },
]

function progressItemDone(id, project = {}) {
  switch (id) {
    case 'palette':
      return (project.palette || []).length >= 2 && !isStockProjectPalette(project.palette)
    case 'logo':
      return !!(project.logoImage || String(project.logoWordmark || '').trim())
    case 'tagline':
      return !!String(project.tagline || '').trim()
    case 'voice':
      return !!String(project.voice || '').trim()
    default:
      return false
  }
}

export function brandProgressSummary(project = {}) {
  const doneItems = PROGRESS_ITEMS.filter((it) => progressItemDone(it.id, project))
  const remainingItems = PROGRESS_ITEMS.filter((it) => !progressItemDone(it.id, project))

  return {
    doneLabels: doneItems.map((it) => it.label),
    remainingLabels: remainingItems.map((it) => it.label),
    doneCount: doneItems.length,
    total: PROGRESS_ITEMS.length,
  }
}
