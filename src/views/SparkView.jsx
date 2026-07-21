/** Ideate — A/B/C stage (primary) + Spark rail (secondary). Tech-Studio ADHD. */
import { getProcessPhase } from '../lib/processGuide'
import { pathLabel, tFormat } from '../lib/i18n'
import {
  formatDecisionLine,
  latestDecision,
  decisionFromDirection,
} from '../lib/decisionLog'
import useAppStore from '../store/useAppStore'
import InfoReveal from '../components/InfoReveal'

export default function SparkView({
  setActiveView,
  currentSpark,
  nextSpark,
  oppositeSpark,
  addMoodPin,
  projectPalette,
  notifyAction,
  directions = [],
  updateDirection,
  locale = 'en',
  flashMicro,
  addTask,
  projectId,
  i18nT = (key) => key,
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
  const canSend = !!chosen
  const phase = getProcessPhase('ideate')
  const title = pathLabel(locale, 'ideate') || 'Ideate'
  const goalLine = String(projectGoal || '').trim()

  const pinSparkStay = () => {
    addMoodPin({
      type: 'spark',
      fromSpark: true,
      note: currentSpark,
      visual: projectPalette[0] || '#1A1A1E',
    })
    notifyAction?.('Pinned', 'mood_pin', { label: 'Spark pin' })
    flashMicro?.(i18nT('ui.sparkPinnedStay') || 'Pinned · Research')
  }

  const chooseDirection = (dir) => {
    const hasTitle = String(dir.title || '').trim()
    if (!dir.chosen && !hasTitle) {
      document.getElementById(`dir-title-${dir.id}`)?.focus?.()
      flashMicro?.('Add a title first')
      return
    }
    const nextChosen = !dir.chosen
    updateDirection?.(dir.id, { chosen: nextChosen })
    if (nextChosen) {
      flashMicro?.(
        tFormat(locale, 'ui.decisionLogged', {
          label: dir.label || dir.id,
        }) || `Chose ${dir.label}`
      )
      if (!String(dir.note || '').trim()) {
        window.setTimeout(() => {
          document.getElementById(`dir-note-${dir.id}`)?.focus?.()
        }, 80)
      }
    }
  }

  const queueChosen = () => {
    if (!chosen) return
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
    flashMicro?.(i18nT('ui.queuedDraft') || `Queued ${chosen.label}`)
    setActiveView('flow')
  }

  return (
    <div className="spark-view ideate-studio">
      <div className="flow-top ideate-top">
        <div className="ideate-top-text">
          <h1 className="page-title">{title}</h1>
          <p className="ideate-progress" role="status">
            <strong>{filledDirs}/3</strong>
            {chosen ? ` · ${chosen.label}` : ''}
            {phase ? (
              <InfoReveal>
                {(phase.checks || []).join(' · ')}
                {phase.prompt ? ` — ${phase.prompt}` : ''}
              </InfoReveal>
            ) : null}
          </p>
          {goalLine ? (
            <p className="ideate-goal-anchor" title={goalLine}>
              Goal · {goalLine.slice(0, 80)}
              {goalLine.length > 80 ? '…' : ''}
            </p>
          ) : null}
        </div>
      </div>

      <div className="ideate-layout">
        <section
          className="panel brand-section ideate-shortlist"
          aria-label="Three directions A B C"
        >
          <div className="brand-section-label">A · B · C</div>
          <div className="ideate-directions is-locked-3">
            {dirs.slice(0, 3).map((d) => {
              const hasTitle = Boolean(String(d.title || '').trim())
              return (
                <div
                  key={d.id}
                  className={`ideate-dir-card${d.chosen ? ' is-chosen' : ''}${
                    hasTitle ? ' has-title' : ''
                  }`}
                >
                  <div className="ideate-dir-head">
                    <span className="ideate-dir-letter" aria-hidden="true">
                      {d.label || d.id?.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm${
                        d.chosen ? ' is-on' : ''
                      }`}
                      onClick={() => chooseDirection(d)}
                      aria-pressed={!!d.chosen}
                      disabled={!hasTitle && !d.chosen}
                      title={
                        !hasTitle && !d.chosen
                          ? 'Add a title first'
                          : undefined
                      }
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
                    Direction {d.label} why
                  </label>
                  <textarea
                    id={`dir-note-${d.id}`}
                    className="field-input"
                    rows={2}
                    value={d.note || ''}
                    onChange={(e) =>
                      updateDirection?.(d.id, { note: e.target.value })
                    }
                    placeholder="Why this wins"
                  />
                </div>
              )
            })}
          </div>
        </section>

        <aside className="panel brand-section ideate-spark-tray" aria-label="Spark">
          <div className="brand-section-label">
            Spark
            {currentSpark ? (
              <InfoReveal>{currentSpark}</InfoReveal>
            ) : null}
          </div>
          <div className="spark-card spark-card-stem" title={currentSpark || ''}>
            <p>
              {String(currentSpark || '')
                .split(/[—.–]/)
                [0]
                .trim()
                .slice(0, 72) || '—'}
              {String(currentSpark || '').length > 72 ? '…' : ''}
            </p>
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
              className="btn btn-ghost"
              onClick={() => oppositeSpark?.()}
            >
              Opposite
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={pinSparkStay}
            >
              Pin
            </button>
          </div>
        </aside>
      </div>

      <div className="path-continue-row ideate-send-row">
        <button
          type="button"
          className="btn btn-primary work-path-next"
          onClick={queueChosen}
          disabled={!canSend}
          title={canSend ? undefined : 'Choose a titled direction first'}
        >
          {canSend
            ? `Send · Sketch`
            : tFormat(locale, 'ui.continueNext', {
                label: pathLabel(locale, 'sketch') || 'Sketch',
              })}
        </button>
      </div>
    </div>
  )
}
