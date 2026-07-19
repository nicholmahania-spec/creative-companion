/** Lazy-loaded Spark tool */
export default function SparkView({
  setActiveView,
  nextTask,
  currentSpark,
  nextSpark,
  addMoodPin,
  projectPalette,
  notifyAction,
}) {
  return (
    <div className="spark-view">
      <button
        type="button"
        className="back-link"
        onClick={() => setActiveView('flow')}
      >
        ← Work
      </button>
      <div className="flow-top">
        <div>
          <h1 className="page-title">Ideate</h1>
          <p className="page-sub">
            Step 3 — many directions fast. Pin sparks to Research. No judging.
          </p>
        </div>
      </div>
      {nextTask && (
        <p className="mood-linked-step" style={{ marginBottom: '1rem' }}>
          <span className="task-badge">For</span>{' '}
          <span className="mood-linked-title">{nextTask.title}</span>
        </p>
      )}
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
            Pin to Board
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setActiveView('flow')}
          >
            Done — back to Work
          </button>
        </div>
      </section>
    </div>
  )
}
