/**
 * Brand progress summary — read-only, derived from state that already
 * exists elsewhere (brand fields on the project). Adds zero new data
 * entry anywhere; this is a glanceable progress signal, not a tool.
 */
import { isStockProjectPalette } from './journey/journeyProgress'
import { progressItemInScope } from './brief/detectiveBrief'

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
  /* Only count what the brief actually picked. A logo-only client picked
     logoPrimary, so colours/tagline/voice are not part of THIS job and must
     not read as "3 to go" on finished work. Scope comes from the brief's
     deliverablesPicked — no mode, no toggle. */
  const picked = project.detective?.deliverablesPicked
  const scoped = PROGRESS_ITEMS.filter((it) => progressItemInScope(it.id, picked))
  const doneItems = scoped.filter((it) => progressItemDone(it.id, project))
  const remainingItems = scoped.filter((it) => !progressItemDone(it.id, project))

  return {
    doneLabels: doneItems.map((it) => it.label),
    remainingLabels: remainingItems.map((it) => it.label),
    doneCount: doneItems.length,
    total: scoped.length,
    /* True when everything in scope is present — the signal the chip uses to
       say "ready" by name instead of a count. */
    allDone: remainingItems.length === 0 && scoped.length > 0,
  }
}
