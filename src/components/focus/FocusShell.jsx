/**
 * Shared shell for the "Tactile Minimalist" focus-mode rework.
 * One header (progress + step label), one centered card slot. Every
 * focus-mode stage view renders inside this.
 *
 * A slide-in preview drawer (toggled from the header) is planned for
 * stages that need a brand/pack preview (Design, Deliver) but isn't
 * wired up yet — added back together with its CSS when a stage
 * actually needs it, rather than shipping unused styling now.
 */
export default function FocusShell({ stepLabel, stepIndex, stepCount, onBack, children }) {
  const pct = stepCount > 0 ? Math.round((stepIndex / stepCount) * 100) : 0

  return (
    <div className="focus-shell p-4">
      <header className="focus-header flex items-center justify-between py-3">
        {onBack && (
          <button
            type="button"
            className="focus-back-btn btn btn-outline btn-icon"
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
      </header>

      <main className="focus-main">{children}</main>
    </div>
  )
}