/**
 * Compact 7-step process progress (Review / Deliver).
 */
export default function PathProgressPanel({
  steps = [],
  rows = [],
  doneN = 0,
  missing = [],
  onOpenStep,
  labelForId,
  hint = 'Tap any step to fill gaps.',
}) {
  const total = steps.length || rows.length || 7
  return (
    <section
      className="panel brand-section deliver-path-progress"
      aria-label="Process progress"
    >
      <div className="brand-section-label">
        Process · {doneN} of {total} steps have content
      </div>
      <ol className="deliver-progress-list">
        {rows.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={`deliver-progress-chip${p.done ? ' is-done' : ''}`}
              onClick={() => onOpenStep?.(p.view)}
            >
              <span aria-hidden="true">{p.done ? '✓' : p.num}</span>{' '}
              {labelForId?.(p.id) || p.label}
            </button>
          </li>
        ))}
      </ol>
      {missing.length > 0 ? (
        <p className="panel-hint deliver-missing" style={{ marginBottom: 0 }}>
          <strong>Still thin:</strong> {missing.join(' · ')}
        </p>
      ) : (
        <p className="panel-hint" style={{ marginBottom: 0 }}>
          {hint}
        </p>
      )}
    </section>
  )
}
