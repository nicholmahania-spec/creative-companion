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

  /* Name the things, never a count. "3 to go" on a finished job reads as
     blame, and a number is the one representation this user has said does not
     register. When everything IN SCOPE is present, the chip says so by name;
     otherwise it names what is still open — a concrete noun, not "N to go". */
  const label = summary.allDone
    ? `Ready: ${summary.doneLabels.join(', ')}`
    : `Built: ${summary.doneLabels.join(', ')}` +
      (summary.remainingLabels.length
        ? ` · still open: ${summary.remainingLabels.join(', ')}`
        : '')

  return (
    <button type="button" className="before-after-chip" onClick={onOpen}>
      {label}
    </button>
  )
}
