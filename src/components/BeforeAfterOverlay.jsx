/**
 * Full brand-progress view, opened from the chip. Everything here is
 * derived from project state, not entered here.
 */
import { brandProgressSummary } from '../lib/beforeAfter'

export default function BeforeAfterOverlay({ open, onClose, project }) {
  if (!open) return null
  const summary = brandProgressSummary(project)

  return (
    <div
      className="export-overlay before-after-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="before-after-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="export-panel before-after-panel">
        <div className="export-panel-header">
          <h3 id="before-after-title" style={{ margin: 0 }}>
            Brand progress
          </h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        <ul className="before-after-list">
          {summary.doneLabels.map((label) => (
            <li key={label} className="before-after-item is-done">
              {label}
            </li>
          ))}
          {summary.remainingLabels.map((label) => (
            <li key={label} className="before-after-item is-open">
              {label} — not started
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
