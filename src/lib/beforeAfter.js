/**
 * Before/After summary — read-only, derived from state that already
 * exists elsewhere (asset audit + brand fields). Adds zero new data
 * entry anywhere; this is a glanceable progress signal, not a tool.
 */
import { isStockProjectPalette } from './journeyProgress'

const AFTER_ITEMS = [
  { id: 'palette', label: 'colors' },
  { id: 'logo', label: 'logo' },
  { id: 'tagline', label: 'tagline' },
  { id: 'voice', label: 'voice' },
]

function afterItemDone(id, project = {}) {
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

export function beforeAfterSummary(project = {}, assetAudit = []) {
  const beforeTotal = assetAudit.length
  const beforeOutdated = assetAudit.filter(
    (it) => it.status === 'outdated' || it.status === 'missing'
  ).length

  const doneItems = AFTER_ITEMS.filter((it) => afterItemDone(it.id, project))
  const remainingItems = AFTER_ITEMS.filter((it) => !afterItemDone(it.id, project))

  return {
    beforeTotal,
    beforeOutdated,
    afterDoneLabels: doneItems.map((it) => it.label),
    afterRemainingLabels: remainingItems.map((it) => it.label),
    afterDoneCount: doneItems.length,
    afterTotal: AFTER_ITEMS.length,
  }
}
