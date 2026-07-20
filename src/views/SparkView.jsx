/** Lazy-loaded Ideate step — sparks + A/B/C direction capture */
import { getProcessPhase } from '../lib/processGuide'
import { pathLabel, tFormat } from '../lib/i18n'

export default function SparkView({
  setActiveView,
  nextTask,
  currentSpark,
  nextSpark,
  oppositeSpark,
  addMoodPin,
  projectPalette,
  notifyAction,
  directions = [],
  updateDirection,
  sparksTried = 0,
  locale = 'en',
  flashMicro,
  addTask,
  projectId,
  i18nT = (key) => key,
  /** Detective goal one-liner when set — grounds prompts */
  projectGoal = '',
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
  const chosen = dirs.find((d) => d.chosen && String(d.title || '').trim())
  const sparksSeen = Math.min(Math.max(sparksTried, 0), 8)
  const phase = getProcessPhase('ideate')
  const title = pathLabel(locale, 'ideate') || 'Ideate'
  const goalLine = String(projectGoal || '').trim()

  const pinSparkStay = () => {
    addMoodPin({
      type: 'spark',
      fromSpark: true,
      note: currentSpark,
      visual: projectPalette[0] || '#1C1917',
    })
    notifyAction?.('Pinned', 'mood_pin', { label: 'Spark pin' })
    flashMicro?.(i18nT('ui.sparkPinnedStay') || 'Pinned · stay on Ideate')
  }

  const queueChosen = () => {
    if (!chosen) return
    addTask?.({
      id: Date.now() + Math.random(),
      title: `Draft ${chosen.label}: ${chosen.title}`,
      energy: 'med',
      meta: chosen.note || 'Direction option',
      completed: false,
      seeded: false,
      projectId: projectId || null,
      dueDate: '',
    })
    flashMicro?.(
      i18nT('ui.queuedDraft') || `Queued draft ${chosen.label}`
    )
    setActiveView('flow')
  }

  return (
    <div className="spark-view">
      <button
        type="button"
        className="back-link"
        onClick={() => setActiveView('studio')}
      >
        {i18nT('ui.backResearch') || '← Research'}
      </button>
      <div className="flow-top">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">
            Step 3 — messy is correct. Force many directions. Best idea often
            hides in #6–7. Shortlist A/B/C; don’t marry the first.
          </p>
          <p className="panel-hint ideate-progress" style={{ marginTop: '0.35rem' }}>
            Sparks tried:{' '}
            <strong>
              {sparksSeen}
              /8
            </strong>
            {' · '}
            Shortlist:{' '}
            <strong>
              {filledDirs}
              /3
            </strong>
            {filledDirs === 0
              ? ' — fill A/B/C or pin a spark'
              : chosen
                ? ' — winner picked; queue or Sketch'
                : filledDirs < 2
                  ? ' — add another direction'
                  : ' — pick a winner (Choose)'}
          </p>
        </div>
        <div className="finish-secondary-row path-continue-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView('flow')}
          >
            {tFormat(locale, 'ui.continueNext', {
              label: pathLabel(locale, 'sketch') || 'Sketch',
            })}
          </button>
          {chosen && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={queueChosen}
            >
              {i18nT('ui.queueChosenSketch') || 'Queue chosen → Sketch'}
            </button>
          )}
        </div>
      </div>
      {nextTask && (
        <p className="mood-linked-step" style={{ marginBottom: '1rem' }}>
          <span className="task-badge">For</span>{' '}
          <span className="mood-linked-title">{nextTask.title}</span>
        </p>
      )}

      {phase && (
        <section className="panel brand-section process-tip-panel">
          <div className="brand-section-label">
            {phase.title || 'Ideate checklist'}
          </div>
          <p className="panel-hint" style={{ marginTop: 0 }}>
            {phase.prompt}
          </p>
          <ul
            className="process-guide-checks"
            style={{ marginBottom: 0 }}
          >
            {(phase.checks || []).map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
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
        {goalLine ? (
          <p className="panel-hint spark-goal-line" style={{ marginTop: 0 }}>
            Goal · {goalLine.length > 120 ? `${goalLine.slice(0, 117)}…` : goalLine}
          </p>
        ) : null}
        <div className="spark-card">
          <p>{currentSpark}</p>
        </div>
        <div className="spark-actions">
          <button
            type="button"
            onClick={nextSpark}
            className="btn btn-primary"
          >
            {i18nT('ui.anotherSpark') || 'Another spark'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => oppositeSpark?.()}
          >
            {i18nT('ui.oppositeDirection') || 'Opposite direction'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={pinSparkStay}
          >
            {i18nT('ui.pinSpark') || 'Pin spark'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setActiveView('studio')}
          >
            {i18nT('ui.openResearchBoard') || 'Open Research'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setActiveView('flow')}
          >
            {tFormat(locale, 'ui.continueNext', {
              label: pathLabel(locale, 'sketch') || 'Sketch',
            })}
          </button>
        </div>
      </section>
    </div>
  )
}
