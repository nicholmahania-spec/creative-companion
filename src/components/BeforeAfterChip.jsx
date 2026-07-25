/**
 * Always-visible, read-only progress line — not collapsible, no dismiss.
 * Answers "is this evolving?" without surfacing an editor on every step.
 * Click opens the full progress view.
 */
import { brandProgressSummary } from '../lib/beforeAfter'

export default function BeforeAfterChip({ project, onOpen }) {
  if (!project) return null
  const summary = brandProgressSummary(project)
  if (summary.doneCount === 0) return null

  const doneText = `Built: ${summary.doneLabels.join(', ')}`
  const remaining = summary.remainingLabels.length
    ? ` · ${summary.remainingLabels.length} to go`
    : ''

  return (
    <button type="button" className="before-after-chip" onClick={onOpen}>
      {doneText}
      {remaining}
    </button>
  )
}
