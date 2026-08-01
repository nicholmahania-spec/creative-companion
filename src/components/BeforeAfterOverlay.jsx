/**
 * Full brand-progress view, opened from the chip. Everything here is
 * derived from project state, not entered here.
 */
import { useCallback } from 'react'
import { brandProgressSummary } from '../lib/beforeAfter'
import { useModalFocus } from '../lib/useModalFocus'

export default function BeforeAfterOverlay({ open, onClose, project }) {
  /* Focus trap, focus restore and Escape.

     This declared aria-modal="true" while implementing none of it — which is
     the worst available combination, not a missing nicety: assistive tech is
     told the rest of the page is unavailable while Tab walks straight out into
     it. Focus also never entered the dialog on open and was never returned to
     the opener on close.

     useModalFocus is the same hook ProjectOverviewShare and ClientInbox
     already use; passing onClose is what wires Escape, so one call covers all
     three. */
  const getRoot = useCallback(() => document.querySelector('.before-after-overlay'), [])
  useModalFocus(open, getRoot, {
    initialSelector: '.export-panel-header button, button',
    onClose,
  })

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
          {/* aria-label because the glyph is the whole button. × is on the
              icon rule's permitted list for close, but "times" is what a
              screen reader announces without a name. aria-hidden on the glyph
              so it is not read twice. */}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <span aria-hidden="true">×</span>
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
