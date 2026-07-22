/**
 * Sketch — fold owns the step; capture secondary; queue/done collapsed.
 * Tech-Studio ADHD: one primary (Done), sticky Next, focus isolation.
 */
import { Suspense, lazy, useState } from 'react'
import useAppStore from '../store/useAppStore'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
} from '../lib/i18n'
import { getProcessPhase } from '../lib/processGuide'
import { formatShortDate, urgencyLabel } from '../lib/dates'
import InfoReveal from '../components/InfoReveal'
import {
  formatDecisionLine,
  latestDecision,
  chosenDirection,
} from '../lib/decisionLog'

const EmptyIllustration = lazy(() => import('../components/EmptyIllustration'))

export default function SketchView(props) {
  const {
    locale: localeProp = 'en',
    navDir = 'none',
    activeProject = null,
    projectDeadline = '',
    completedCount = 0,
    deskTasks = [],
    doneTasks = [],
    queueTasks = [],
    nextTask = null,
    stepFocusKey = 0,
    setStepFocusKey,
    showHowItWorks = false,
    hideHowItWorks,
    openBreakdown,
    journeyNext = null,
    setActiveView,
    flashToast,
    flashMicro,
    notifyAction,
    quickInput = '',
    setQuickInput,
    captureEnergy = 'med',
    setCaptureEnergy,
    captureDue = '',
    setCaptureDue,
    captureOptionsOpen = false,
    setCaptureOptionsOpen,
    handleCapture,
    addQuickTask: addQuickTaskProp,
    queueCollapsed = false,
    queueOpen = false,
    setQueueOpen,
    doneOpen = false,
    setDoneOpen,
    toggleTask,
    updateTaskTitle,
    updateTaskWhy,
    removeTask,
    breakIntoSteps,
    setTaskDueDate,
    stepDueOpen = false,
    setStepDueOpen,
    completeCurrentStep,
    startVoice,
    setDeskConfirm,
  } = props

  const locale = normalizeLocale(localeProp)
  const addTask = useAppStore((s) => s.addTask)
  const captureStep = handleCapture || addQuickTaskProp
  const bumpStepFocus = () => {
    if (typeof setStepFocusKey === 'function') setStepFocusKey((k) => k + 1)
  }

  const dec =
    latestDecision(activeProject?.decisionLog, 'direction') ||
    latestDecision(activeProject?.decisionLog)
  const fromChosen = chosenDirection(activeProject)
  const decisionLine =
    formatDecisionLine(dec) ||
    (fromChosen
      ? formatDecisionLine({
          label: fromChosen.label,
          title: fromChosen.title,
          why: fromChosen.note,
        })
      : '')

  const ideateDirs = (activeProject?.directions || []).filter((d) =>
    String(d.title || '').trim()
  )

  const queueDraft = (d) => {
    addTask({
      id: Date.now() + Math.random(),
      title: `Draft ${d.label}: ${d.title}`,
      energy: 'med',
      meta: 'Direction option',
      why: d.note || '',
      completed: false,
      seeded: false,
      projectId:
        activeProject?.id || useAppStore.getState().currentProjectId,
      dueDate: '',
    })
    flashToast?.(
      tFormat(locale, 'ui.queuedDraftLabel', { label: d.label }) ||
        `Queued ${d.label}`
    )
  }

  const confirmRemove = (id, label) => {
    if (typeof setDeskConfirm === 'function') {
      setDeskConfirm({
        kind: 'remove-step',
        label,
        onConfirm: () => {
          removeTask(id)
          flashToast?.(i18nT(locale, 'ui.stepRemoved'))
          setDeskConfirm(null)
        },
      })
      return
    }
    removeTask(id)
  }

  return (
    <div
      className="flow-view surface-desk view-enter sketch-studio"
      data-nav-dir={navDir}
    >
      <div className="flow-top flow-top-compact sketch-studio-top">
        <div>
          <h1 className="page-title work-page-title">
            {i18nT(locale, 'path.sketch')}
          </h1>
          <p className="work-context-line">
            <strong>{activeProject?.name || 'Project'}</strong>
            {projectDeadline ? ` · ${formatShortDate(projectDeadline)}` : ''}
            {deskTasks.length > 0 && (
              <span className="work-context-progress">
                {' '}
                · {completedCount}/{deskTasks.length}
              </span>
            )}
          </p>
        </div>
      </div>

      {decisionLine ? (
        <p className="sketch-decision-line" role="status">
          {decisionLine}{' '}
          <button
            type="button"
            className="text-link"
            onClick={() => setActiveView?.('spark')}
          >
            Edit
          </button>
        </p>
      ) : null}

      {ideateDirs.length > 0 && (
        <div className="sketch-ideate-strip" aria-label="From Ideate">
          {ideateDirs.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`sketch-dir-chip${d.chosen ? ' is-chosen' : ''}`}
              onClick={() => queueDraft(d)}
            >
              {d.label}
              {d.chosen ? ' ·' : ''} {d.title}
            </button>
          ))}
          {ideateDirs.length > 1 && (
            <details className="sketch-ideate-more">
              <summary>All</summary>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => ideateDirs.forEach(queueDraft)}
              >
                Queue all
              </button>
            </details>
          )}
        </div>
      )}

      {/* Fold: current step only */}
      <section
        className="panel step-focus-panel sketch-now"
        key={stepFocusKey}
        id="current-step"
      >
        <div className="step-focus-head">
          <div className="brand-section-label" style={{ margin: 0 }}>
            Now
          </div>
          {getProcessPhase('sketch') && (
            <InfoReveal>
              {getProcessPhase('sketch').checks.join(' · ')}
            </InfoReveal>
          )}
        </div>
        {!nextTask ? (
          <div className="empty-state empty-state-craft sketch-empty">
            <Suspense fallback={null}>
              <EmptyIllustration variant="desk" />
            </Suspense>
            <p className="empty-state-title">
              {doneTasks.length === 0
                ? i18nT(locale, 'ui.noStepYet')
                : `${i18nT(locale, 'ui.queueClear')} (${doneTasks.length} ${
                    doneTasks.length === 1
                      ? i18nT(locale, 'ui.step')
                      : i18nT(locale, 'ui.steps')
                  } ${i18nT(locale, 'ui.completed')})`}
            </p>
            <p className="empty-state-subtitle">
              {doneTasks.length === 0
                ? i18nT(locale, 'ui.getStarted')
                : i18nT(locale, 'ui.nextStepSuggestion')}
            </p>
            <div className="step-focus-actions step-focus-actions-empty">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  document.getElementById('desk-capture')?.focus()
                }
              >
                {i18nT(locale, 'ui.addStep')}
              </button>
            </div>
          </div>
        ) : (
          <div className="step-focus">
            <div className="step-focus-meta">
              <span className="task-badge">Now</span>
              <span className="task-meta">
                {({ high: 'H', med: 'M', low: 'L' }[nextTask.energy || 'med'] ||
                  'M')}
                {nextTask.parentId ? ' · micro' : ''}
                {nextTask.dueDate
                  ? ` · ${urgencyLabel(nextTask.dueDate)}`
                  : ''}
              </span>
            </div>
            <input
              className="step-focus-title"
              value={nextTask.title}
              onChange={(e) => updateTaskTitle(nextTask.id, e.target.value)}
              aria-label="Edit current step"
            />
            <label className="field-label" htmlFor="step-why">
              Why
            </label>
            <input
              id="step-why"
              className="field-input"
              value={nextTask.why || ''}
              onChange={(e) => updateTaskWhy(nextTask.id, e.target.value)}
              placeholder="Why this step"
              aria-label="Why this step"
            />
            <div className="step-focus-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={completeCurrentStep}
              >
                Done
              </button>
              <details className="step-more-details">
                <summary>More</summary>
                <div className="step-more-panel">
                  {!nextTask.parentId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        breakIntoSteps(nextTask.id)
                        notifyAction?.('Split into 3', 'micro_steps', {
                          label: 'Split step',
                        })
                        bumpStepFocus()
                      }}
                    >
                      Split
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setStepDueOpen((o) => !o)}
                    aria-expanded={stepDueOpen}
                  >
                    {nextTask.dueDate
                      ? `Due ${formatShortDate(nextTask.dueDate)}`
                      : 'Due'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      confirmRemove(
                        nextTask.id,
                        'Remove this step? Cannot undo.'
                      )
                    }
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={openBreakdown}
                  >
                    Break down
                  </button>
                </div>
              </details>
            </div>
            {stepDueOpen && (
              <div className="step-due-row">
                <label className="field-label" htmlFor="step-due">
                  Due
                </label>
                <input
                  id="step-due"
                  type="date"
                  className="field-input step-due-input"
                  value={nextTask.dueDate || ''}
                  onChange={(e) =>
                    setTaskDueDate(nextTask.id, e.target.value)
                  }
                />
              </div>
            )}
          </div>
        )}
      </section>

      <div className="sketch-below">
        <section className="capture-strip sketch-capture" aria-label="Capture">
          <div className="capture-row capture-row-compact">
            <input
              id="desk-capture"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && captureStep?.()}
              placeholder="Next step"
              aria-label="Add to desk"
            />
            <button
              type="button"
              onClick={() => captureStep?.()}
              className="btn btn-primary"
            >
              Add
            </button>
          </div>
          <div className="capture-desk-meta">
            <button
              type="button"
              className="text-link capture-options-toggle"
              onClick={() => setCaptureOptionsOpen((o) => !o)}
              aria-expanded={captureOptionsOpen}
            >
              {captureOptionsOpen ? 'Hide' : 'Options'}
            </button>
            {captureOptionsOpen && (
              <>
                <select
                  className="capture-energy"
                  value={captureEnergy}
                  onChange={(e) => setCaptureEnergy(e.target.value)}
                  aria-label="Energy"
                >
                  <option value="high">H</option>
                  <option value="med">M</option>
                  <option value="low">L</option>
                </select>
                <label className="capture-due-label">
                  Due
                  <input
                    type="date"
                    className="capture-due-input"
                    value={captureDue}
                    onChange={(e) => setCaptureDue(e.target.value)}
                    aria-label="Due date"
                  />
                </label>
                <button
                  type="button"
                  className="voice-link"
                  onClick={startVoice}
                >
                  Voice
                </button>
              </>
            )}
          </div>
        </section>

        {showHowItWorks && (
          <section
            className="product-card product-card-quiet"
            aria-label="How this desk works"
          >
            <div className="product-card-top">
              <p className="product-card-eyebrow">Desk</p>
              <button
                type="button"
                className="product-card-dismiss"
                onClick={hideHowItWorks}
              >
                Got it
              </button>
            </div>
            <p className="product-card-title" style={{ marginBottom: 0 }}>
              {i18nT(locale, 'ui.howDeskWorks')}
            </p>
          </section>
        )}

        {queueTasks.length > 0 && (
          <section className="panel brand-section sketch-queue-panel">
            <button
              type="button"
              className="section-toggle"
              onClick={() => setQueueOpen((o) => !o)}
              aria-expanded={queueCollapsed ? queueOpen : true}
            >
              <span className="brand-section-label" style={{ margin: 0 }}>
                Queue · {queueTasks.length}
              </span>
              <span className="section-toggle-hint">
                {queueCollapsed && !queueOpen ? 'Show' : 'Hide'}
              </span>
            </button>
            {(queueCollapsed ? queueOpen : true) && (
              <div className="desk-list" style={{ marginTop: '0.75rem' }}>
                {queueTasks.map((task, i) => (
                  <div key={task.id} className="task-row">
                    <label className="task-row-label">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => toggleTask(task.id)}
                      />
                      <span className="task-row-body">
                        <span className="task-step-num">{i + 2}</span>
                        <span className="task-title">{task.title}</span>
                        <span className="task-meta">
                          {({ high: 'H', med: 'M', low: 'L' }[
                            task.energy || 'med'
                          ] || 'M')}
                          {task.dueDate
                            ? ` · ${formatShortDate(task.dueDate)}`
                            : ''}
                        </span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {doneTasks.length > 0 && (
          <section className="panel brand-section">
            <button
              type="button"
              className="section-toggle"
              onClick={() => setDoneOpen((o) => !o)}
              aria-expanded={doneOpen}
            >
              <span className="brand-section-label" style={{ margin: 0 }}>
                Done · {doneTasks.length}
              </span>
              <span className="section-toggle-hint">
                {doneOpen ? 'Hide' : 'Show'}
              </span>
            </button>
            {doneOpen ? (
              <ul className="done-list" style={{ marginTop: '0.75rem' }}>
                {doneTasks.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="done-undo"
                      onClick={() => toggleTask(t.id)}
                      title="Undo"
                    >
                      ✓
                    </button>
                    <span className="done-title">{t.title}</span>
                    <button
                      type="button"
                      className="text-link"
                      style={{ marginTop: 0 }}
                      onClick={() =>
                        confirmRemove(t.id, 'Delete this step permanently?')
                      }
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        )}
      </div>

      {journeyNext && (
        <div className="path-continue-row work-below-tools">
          <button
            type="button"
            className="btn btn-secondary work-path-next"
            onClick={() => setActiveView(journeyNext.view)}
          >
            {tFormat(locale, 'ui.continueNext', {
              label: pathLabel(locale, journeyNext.id) || journeyNext.label,
            })}
          </button>
        </div>
      )}
    </div>
  )
}
