/** Lazy-loaded Ideate step — sparks + A/B/C direction capture */
import { getProcessPhase } from '../lib/processGuide'
import { pathLabel, tFormat, t as i18nLookup } from '../lib/i18n'
import {
  formatDecisionLine,
  latestDecision,
  decisionFromDirection,
} from '../lib/decisionLog'
import useAppStore from '../store/useAppStore'
import InfoReveal from '../components/InfoReveal'

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
  decisionLog = [],
}) {
  const logDecision = useAppStore((s) => s.logDecision)
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
  const latest = latestDecision(decisionLog, 'direction') || latestDecision(decisionLog)
  const decisionLine =
    formatDecisionLine(latest) ||
    (chosen
      ? formatDecisionLine({
          label: chosen.label,
          title: chosen.title,
          why: chosen.note,
        })
      : '')

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

  const chooseDirection = (dir) => {
    const nextChosen = !dir.chosen
    updateDirection?.(dir.id, { chosen: nextChosen })
    if (nextChosen) {
      const entry = decisionFromDirection({ ...dir, chosen: true })
      // updateDirection also logs; reinforce micro feedback
      const line = formatDecisionLine(entry)
      flashMicro?.(
        line
          ? tFormat(locale, 'ui.decisionLogged', {
              label: dir.label || dir.id,
            }) || `Decision saved · ${dir.label}`
          : `Chose ${dir.label} — add a title + why`
      )
      if (!String(dir.note || '').trim() && String(dir.title || '').trim()) {
        // Soft nudge: why is the ADHD working-memory glue
        window.setTimeout(() => {
          document.getElementById(`dir-note-${dir.id}`)?.focus?.()
        }, 80)
      }
    }
  }

  const queueChosen = () => {
    if (!chosen) return
    // Ensure decision log has the latest title/why
    logDecision?.(decisionFromDirection(chosen))
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
    <div className="spark-view ideate-studio">
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
          <p className="panel-hint ideate-progress" style={{ marginTop: '0.35rem' }}>
            <strong>{filledDirs}/3</strong>
            {chosen ? ` · ${chosen.label}` : ''}
            {phase ? (
              <InfoReveal>
                {(phase.checks || []).join(' · ')}
                {phase.prompt ? ` — ${phase.prompt}` : ''}
              </InfoReveal>
            ) : null}
          </p>
        </div>
        <div className="finish-secondary-row path-continue-row">
          {chosen ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={queueChosen}
            >
              {i18nT('ui.queueChosenSketch') || 'Queue chosen → Sketch'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveView('flow')}
            >
              {tFormat(locale, 'ui.continueNext', {
                label: pathLabel(locale, 'sketch') || 'Sketch',
              })}
            </button>
          )}
        </div>
      </div>
      {/* Locked 3-column shortlist — primary stage */}
      <section
        className="panel brand-section ideate-shortlist"
        aria-label="Three directions A B C"
      >
        <div className="brand-section-label">A · B · C</div>
        <div className="ideate-directions is-locked-3">
          {dirs.slice(0, 3).map((d) => (
            <div
              key={d.id}
              className={`ideate-dir-card${d.chosen ? ' is-chosen' : ''}${
                String(d.title || '').trim() ? ' has-title' : ''
              }`}
            >
              <div className="ideate-dir-head">
                <span className="ideate-dir-letter" aria-hidden="true">
                  {d.label || d.id?.toUpperCase()}
                </span>
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm${d.chosen ? ' is-on' : ''}`}
                  onClick={() => chooseDirection(d)}
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
                placeholder={`${d.label} title`}
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
                placeholder="Why"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="panel brand-section ideate-spark-tray">
        <div className="brand-section-label">Spark</div>
        <div className="spark-card">
          <p>{currentSpark}</p>
        </div>
        <div className="spark-actions">
          <button
            type="button"
            onClick={nextSpark}
            className="btn btn-primary"
          >
            New
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => oppositeSpark?.()}
          >
            Opposite
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={pinSparkStay}
          >
            Pin
          </button>
        </div>
      </section>
    </div>
  )
}
