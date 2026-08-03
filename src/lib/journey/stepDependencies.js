/**
 * Which Define fields each later step actually depends on. No hard gate —
 * every step stays freely navigable. Used only to show an inline, in-context
 * reminder (never a lock) at the top of a step when its inputs are missing.
 */
import { DETECTIVE_CHAPTERS } from '../brief/detectiveBrief'

export const STEP_DEPENDENCIES = {
  research: ['audience', 'goal'],
  ideate: ['goal', 'audience'],
  // deliverablesPicked is the required checklist id (not free-text deliverables)
  sketch: ['deliverablesPicked', 'goal'],
  design: ['deliverablesPicked', 'clientName'],
  review: ['goal'],
  deliver: ['deliverablesPicked', 'clientName'],
}

const FIELD_META = DETECTIVE_CHAPTERS.flatMap((ch) => ch.fields).reduce(
  (acc, f) => {
    acc[f.id] = f
    return acc
  },
  {}
)

export function fieldLabel(fieldId) {
  return FIELD_META[fieldId]?.label || fieldId
}

/** Full field def for formatDetectiveAnswer (checklist/spectrum/etc.). */
export function fieldMeta(fieldId) {
  return FIELD_META[fieldId] || null
}

export function fieldPlaceholder(fieldId) {
  return FIELD_META[fieldId]?.placeholder || ''
}

/** Field ids for a step that are still empty on the given detective object. */
export function missingDependencies(stepId, detective = {}) {
  const ids = STEP_DEPENDENCIES[stepId] || []
  return ids.filter((id) => {
    const v = detective?.[id]
    if (Array.isArray(v)) return v.length === 0
    return !String(v || '').trim()
  })
}
