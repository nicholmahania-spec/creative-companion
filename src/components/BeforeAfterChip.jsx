/**
 * Always-visible, read-only progress line — not collapsible, no dismiss.
 * Answers "is this evolving?" without surfacing the audit editor itself
 * on every step. Click opens the full Before/After view.
 */
import { beforeAfterSummary } from '../lib/beforeAfter'

export default function BeforeAfterChip({ project, assetAudit = [], onOpen }) {
  if (!project) return null
  const summary = beforeAfterSummary(project, assetAudit)
  if (summary.beforeTotal === 0 && summary.afterDoneCount === 0) return null

  const beforeText =
    summary.beforeTotal > 0
      ? `Before: ${summary.beforeTotal} asset${summary.beforeTotal === 1 ? '' : 's'}${
          summary.beforeOutdated ? `, ${summary.beforeOutdated} outdated` : ''
        }`
      : 'Before: nothing logged yet'

  const afterText = summary.afterDoneLabels.length
    ? `After: ${summary.afterDoneLabels.join(', ')}`
    : 'After: not started'

  const remaining = summary.afterRemainingLabels.length
    ? ` · ${summary.afterRemainingLabels.length} to go`
    : ''

  return (
    <button type="button" className="before-after-chip" onClick={onOpen}>
      {beforeText} → {afterText}
      {remaining}
    </button>
  )
}
