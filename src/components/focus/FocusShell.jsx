import { useState } from 'react'

/**
 * Shared shell for the "Tactile Minimalist" focus-mode rework.
 * One header (progress + step label + preview toggle), one centered
 * card slot. Every focus-mode stage view renders inside this.
 */
export default function FocusShell({
  stepLabel,
  stepIndex,
  stepCount,
  onBack,
  previewContent,
  children,
}) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const pct = stepCount > 0 ? Math.round((stepIndex / stepCount) * 100) : 0

  return (
    <div className="focus-shell">
      <header className="focus-header">
        {onBack && (
          <button
            type="button"
            className="focus-back-btn"
            onClick={onBack}
            aria-label="Back to previous step"
          >
            ←
          </button>
        )}
        <span className="focus-step-label">{stepLabel}</span>
        <div
          className="focus-progress-track"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="focus-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        {previewContent && (
          <button
            type="button"
            className="focus-preview-toggle"
            onClick={() => setPreviewOpen((v) => !v)}
            aria-expanded={previewOpen}
          >
            Preview ▸
          </button>
        )}
      </header>

      <main className="focus-main">{children}</main>

      {previewContent && (
        <>
          <div
            className={`focus-preview-backdrop${previewOpen ? ' is-open' : ''}`}
            onClick={() => setPreviewOpen(false)}
          />
          <aside
            className={`focus-preview-drawer${previewOpen ? ' is-open' : ''}`}
            aria-hidden={!previewOpen}
          >
            {previewContent}
          </aside>
        </>
      )}
    </div>
  )
}
