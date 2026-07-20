/**
 * Define step — Design Detective Sheet (who / feel / goal / must-haves).
 * Lazy-loaded so main bundle stays lean.
 */
export default function DetectiveSheet({
  detective = {},
  updateDetective,
  applyDetectiveToBrief,
  flashToast,
  addMilestone,
  updateMilestone,
  removeMilestone,
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
      id: 'brandWords',
      label: 'Brand words (3–5)',
      ph: 'e.g. Warm, trustworthy, unhurried.',
      hint: 'Later steps ask you to justify choices against these words.',
      area: false,
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
      label: 'Format / size',
      ph: 'e.g. Letter PDF + Instagram square.',
      area: false,
    },
    {
      id: 'avoid',
      label: 'What to avoid',
      ph: 'e.g. No literal icons — abstract motion only.',
      hint: 'Carried forward so this instruction survives all the way to Design.',
      area: true,
    },
    {
      id: 'deliverables',
      label: 'Deliverables — what ships',
      ph: 'e.g. Master logo, style guide, 4-page catalog, website hero.',
      hint: 'One line per deliverable — the actual scope, not the vibe.',
      area: true,
    },
    {
      id: 'technical',
      label: 'Technical / production constraints',
      ph: 'e.g. Sharp at 32px, laser-engravable, .AI/.EPS/.SVG with transparent bg.',
      area: true,
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
          {f.hint && (
            <p className="panel-hint" style={{ margin: '0 0 0.35rem' }}>
              {f.hint}
            </p>
          )}
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

      <div className="field-block" style={{ marginBottom: '0.75rem' }}>
        <label className="field-label">Milestones</label>
        <p className="panel-hint" style={{ margin: '0 0 0.35rem' }}>
          A brief often has several dated checkpoints, not just one deadline.
        </p>
        {(detective?.milestones || []).map((m) => (
          <div key={m.id} className="detective-milestone-row">
            <input
              className="field-input"
              value={m.label}
              onChange={(e) =>
                updateMilestone?.(m.id, 'label', e.target.value)
              }
              placeholder="e.g. Moodboard approval"
            />
            <input
              type="date"
              className="field-input detective-milestone-date"
              value={m.date}
              onChange={(e) =>
                updateMilestone?.(m.id, 'date', e.target.value)
              }
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => removeMilestone?.(m.id)}
              aria-label="Remove milestone"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ marginTop: '0.35rem' }}
          onClick={() => addMilestone?.('', '')}
        >
          + Add milestone
        </button>
      </div>

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
