/** Lazy-loaded Ideate step — sparks + A/B/C direction capture */
export default function SparkView({
  setActiveView,
  nextTask,
  currentSpark,
  nextSpark,
  addMoodPin,
  projectPalette,
  notifyAction,
  directions = [],
  updateDirection,
  sparkIndex = 0,
}) {
  const dirs =
    Array.isArray(directions) && directions.length >= 3
      ? directions
      : [
          { id: 'a', label: 'A', title: '', note: '', chosen: false },
          { id: 'b', label: 'B', title: '', note: '', chosen: false },
          { id: 'c', label: 'C', title: '', note: '', chosen: false },
        ]
  const filledDirs = dirs.filter((d) => String(d.title || '').trim()).length
  /** Sparks seen (index) + filled shortlist toward pro “5–8 directions” goal */
  const tried = Math.max(sparkIndex + 1, filledDirs)
  const goal = 8
  const progress = Math.min(tried, goal)

  return (
    <div className="spark-view">
      <button
        type="button"
        className="back-link"
        onClick={() => setActiveView('studio')}
      >
        ← Research
      </button>
      <div className="flow-top">
        <div>
          <h1 className="page-title">Ideate</h1>
          <p className="page-sub">
            Step 3 — messy is correct. Force many directions. Best idea often
            hides in #6–7. Shortlist A/B/C; don’t marry the first.
          </p>
          <p className="panel-hint ideate-progress" style={{ marginTop: '0.35rem' }}>
            Direction energy:{' '}
            <strong>
              {progress}/{goal}
            </strong>{' '}
            toward a rich set
            {progress < 5
              ? ' — keep going (opposites welcome)'
              : progress < 8
                ? ' — strong set; pick a winner'
                : ' — enough; shortlist and Sketch'}
          </p>
        </div>
        <div className="finish-secondary-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView('flow')}
          >
            Go to Sketch
          </button>
        </div>
      </div>
      {nextTask && (
        <p className="mood-linked-step" style={{ marginBottom: '1rem' }}>
          <span className="task-badge">For</span>{' '}
          <span className="mood-linked-title">{nextTask.title}</span>
        </p>
      )}

      <section className="panel brand-section">
        <div className="brand-section-label">Three directions (A · B · C)</div>
        <p className="panel-hint" style={{ marginTop: 0 }}>
          Short titles only. Opposite ideas welcome. Pick one to sketch next.
        </p>
        <div className="ideate-directions">
          {dirs.map((d) => (
            <div
              key={d.id}
              className={`ideate-dir-card${d.chosen ? ' is-chosen' : ''}`}
            >
              <div className="ideate-dir-head">
                <span className="ideate-dir-letter" aria-hidden="true">
                  {d.label || d.id?.toUpperCase()}
                </span>
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm${d.chosen ? ' is-on' : ''}`}
                  onClick={() =>
                    updateDirection?.(d.id, { chosen: !d.chosen })
                  }
                  aria-pressed={!!d.chosen}
                >
                  {d.chosen ? 'Chosen' : 'Choose'}
                </button>
              </div>
              <label className="sr-only" htmlFor={`dir-title-${d.id}`}>
                Direction {d.label} title
              </label>
              <input
                id={`dir-title-${d.id}`}
                className="field-input"
                value={d.title || ''}
                onChange={(e) =>
                  updateDirection?.(d.id, { title: e.target.value })
                }
                placeholder={`${d.label} — one-line direction`}
              />
              <label className="sr-only" htmlFor={`dir-note-${d.id}`}>
                Direction {d.label} note
              </label>
              <textarea
                id={`dir-note-${d.id}`}
                className="field-input"
                rows={2}
                value={d.note || ''}
                onChange={(e) =>
                  updateDirection?.(d.id, { note: e.target.value })
                }
                placeholder="Why it might fit the goal…"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="panel brand-section">
        <div className="brand-section-label">Prompt</div>
        <div className="spark-card">
          <p>{currentSpark}</p>
        </div>
        <div className="spark-actions">
          <button
            type="button"
            onClick={nextSpark}
            className="btn btn-primary"
          >
            Another spark
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              addMoodPin({
                type: 'quote',
                note: currentSpark,
                visual: projectPalette[0] || '#1C1917',
              })
              notifyAction('Pinned', 'mood_pin', { label: 'Spark pin' })
              setActiveView('studio')
            }}
          >
            Pin to Research
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setActiveView('flow')}
          >
            Done — Go to Sketch
          </button>
        </div>
      </section>
    </div>
  )
}
