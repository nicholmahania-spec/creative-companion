/**
 * Full Before/After view, opened from the chip. Before side is a frozen,
 * read-only view of the asset audit (editing stays on Project overview
 * only). After side is derived, not entered here.
 */
import { beforeAfterSummary } from '../lib/beforeAfter'

export default function BeforeAfterOverlay({ open, onClose, project, assetAudit = [] }) {
  if (!open) return null
  const summary = beforeAfterSummary(project, assetAudit)

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
            Before &amp; after
          </h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="before-after-columns">
          <div className="before-after-col">
            <h4>Before</h4>
            {assetAudit.length === 0 ? (
              <p className="before-after-empty">
                Nothing logged yet — add existing assets on Project overview.
              </p>
            ) : (
              <ul className="before-after-list">
                {assetAudit.map((it) => (
                  <li key={it.id} className={`before-after-item is-${it.status}`}>
                    {it.name}
                    <span className="before-after-item-status">{it.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="before-after-col">
            <h4>After</h4>
            <ul className="before-after-list">
              {summary.afterDoneLabels.map((label) => (
                <li key={label} className="before-after-item is-done">
                  {label}
                </li>
              ))}
              {summary.afterRemainingLabels.map((label) => (
                <li key={label} className="before-after-item is-open">
                  {label} — not started
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
