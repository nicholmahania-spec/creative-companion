/**
 * Define step — Design Detective Sheet (who / feel / goal / must-haves).
 * Lazy-loaded so main bundle stays lean.
 */
export default function DetectiveSheet({
  detective = {},
  updateDetective,
  applyDetectiveToBrief,
  flashToast,
}) {
  const fields = [
    {
      id: 'goal',
      label: 'One-sentence goal',
      ph: 'e.g. Make a friendly booklet that helps families feel supported.',
      area: true,
    },
    {
      id: 'audience',
      label: 'Who is this for?',
      ph: 'e.g. Busy parents new to the program — not “everyone.”',
      area: false,
    },
    {
      id: 'feel',
      label: 'What should they feel or do?',
      ph: 'e.g. Hopeful, safe, clear next step.',
      area: true,
    },
    {
      id: 'mustHaves',
      label: 'Must-haves',
      ph: 'e.g. Logo, contact, 4 pages max.',
      area: true,
    },
    {
      id: 'niceToHaves',
      label: 'Nice-to-haves',
      ph: 'e.g. Photo of real families, illustration accents.',
      area: true,
    },
    {
      id: 'format',
      label: 'Format / size / constraint',
      ph: 'e.g. Letter PDF + Instagram square · Friday deadline.',
      area: false,
    },
  ]

  return (
    <section className="panel brand-section detective-sheet-panel">
      <div className="brand-section-label">Design Detective Sheet</div>
      <p className="panel-hint" style={{ marginTop: 0 }}>
        The big “what are we even making?” talk. Strong Step 1 saves hours of
        fixing later. Fill this before pretty pictures.
      </p>
      {fields.map((f) => (
        <div
          key={f.id}
          className="field-block"
          style={{ marginBottom: '0.75rem' }}
        >
          <label className="field-label" htmlFor={`detective-${f.id}`}>
            {f.label}
          </label>
          {f.area ? (
            <textarea
              id={`detective-${f.id}`}
              className="field-input"
              rows={2}
              value={detective?.[f.id] || ''}
              onChange={(e) => updateDetective?.(f.id, e.target.value)}
              placeholder={f.ph}
            />
          ) : (
            <input
              id={`detective-${f.id}`}
              className="field-input"
              value={detective?.[f.id] || ''}
              onChange={(e) => updateDetective?.(f.id, e.target.value)}
              placeholder={f.ph}
            />
          )}
        </div>
      ))}
      <div className="finish-secondary-row" style={{ marginTop: '0.35rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const r = applyDetectiveToBrief?.()
            if (r?.ok) flashToast?.('Brief filled from detective sheet')
            else flashToast?.(r?.error || 'Add a few answers first')
          }}
        >
          Fill brief from sheet
        </button>
      </div>
    </section>
  )
}
