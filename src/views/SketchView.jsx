/**
 * Sketch step — current desk step, capture, queue, micro-breakdown.
 */
import { Suspense, lazy, useState } from 'react'
import useAppStore from '../store/useAppStore'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
  pathFillHint,
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
    // capture
    quickInput = '',
    setQuickInput,
    captureEnergy = 'med',
    setCaptureEnergy,
    captureDue = '',
    setCaptureDue,
    captureOptionsOpen = false,
    setCaptureOptionsOpen,
    handleCapture,
    // queue UI (legacy alias)
    addQuickTask: addQuickTaskProp,
    queueCollapsed = false,
    queueOpen = false,
    setQueueOpen,
    doneOpen = false,
    setDoneOpen,
    // task ops
    toggleTask,
    updateTaskTitle,
    updateTaskMeta,
    updateTaskWhy,
    removeTask,
    breakIntoSteps,
    setTaskDueDate,
    stepDueOpen = false,
    setStepDueOpen,
    completeCurrentStep,
    startVoice,
    // breakdown (embedded if parent passes flags)
    showBreakdown = false,
  } = props

  const locale = normalizeLocale(localeProp)
  const addTask = useAppStore((s) => s.addTask)
  const captureStep = handleCapture || addQuickTaskProp
  const [processOpenLocal, setProcessOpenLocal] = useState(false)
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

  return (
          <div className="flow-view surface-desk view-enter sketch-studio" data-nav-dir={navDir}>
            <div className="flow-top flow-top-compact sketch-studio-top">
              <div>
                <h1 className="page-title work-page-title">
                  {i18nT(locale, 'path.sketch')}
                </h1>
                <p className="work-context-line">
                  <strong>{activeProject?.name || 'Project'}</strong>
                  {projectDeadline
                    ? ` · due ${formatShortDate(projectDeadline)}`
                    : ''}
                  <span className="work-context-progress">
                    {' '}
                    · {completedCount}/{deskTasks.length || 0} done
                  </span>
                  <span className="sketch-studio-hint">
                    {' '}
                    · 2–3 drafts · one “why” each
                  </span>
                </p>
              </div>
              {journeyNext && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm work-path-next"
                  onClick={() => setActiveView(journeyNext.view)}
                >
                  {tFormat(locale, 'ui.continueNext', {
                    label:
                      pathLabel(locale, journeyNext.id) || journeyNext.label,
                  })}
                </button>
              )}
            </div>

            <section
              className="decision-log-strip sketch-decision-strip"
              aria-label={i18nT(locale, 'ui.decisionLogTitle') || 'Decision log'}
            >
              <p className="decision-log-strip-label">
                {i18nT(locale, 'ui.decisionLogTitle') || 'Decision log'}
              </p>
              {decisionLine ? (
                <>
                  <p className="decision-log-strip-line">{decisionLine}</p>
                  <p className="panel-hint" style={{ margin: '0.35rem 0 0' }}>
                    {i18nT(locale, 'ui.decisionSketchHint') ||
                      'Sketch this direction. Low polish.'}
                  </p>
                  <div className="decision-log-strip-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setActiveView?.('spark')}
                    >
                      {i18nT(locale, 'ui.decisionEditIdeate') ||
                        'Edit on Ideate'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="decision-log-empty">
                  {i18nT(locale, 'ui.decisionEmpty') ||
                    'Pick a winner on Ideate — we save why for Sketch.'}{' '}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setActiveView?.('spark')}
                  >
                    {pathLabel(locale, 'ideate') || 'Ideate'}
                  </button>
                </p>
              )}
            </section>

            {/* Current step owns the fold — only one primary action */}
            <section
              className="panel step-focus-panel surface-desk-hero sketch-now"
              key={stepFocusKey}
              id="current-step"
            >
              <div className="step-focus-head">
                <div className="brand-section-label" style={{ margin: 0 }}>
                  {i18nT(locale, 'ui.currentStep')}
                </div>
                {getProcessPhase('sketch') && (
                  <InfoReveal>
                    {getProcessPhase('sketch').checks.join(' · ')}
                  </InfoReveal>
                )}
              </div>
              {!nextTask ? (
                <div className="empty-state empty-state-craft">
                  <Suspense fallback={null}>
                    <EmptyIllustration variant="desk" />
                  </Suspense>
                  <p className="empty-state-title">
                    {doneTasks.length > 0
                      ? i18nT(locale, 'ui.queueClear')
                      : i18nT(locale, 'ui.noStepYet')}
                  </p>
                  <p className="empty-state-body">
                    {doneTasks.length > 0
                      ? i18nT(locale, 'ui.emptyStepBodyDone')
                      : i18nT(locale, 'ui.emptyStepBody')}
                  </p>
                  {deskTasks.length === 0 && (
                    <p className="panel-hint sketch-still-thin" style={{ marginTop: '0.5rem' }}>
                      <strong>
                        {i18nT(locale, 'ui.stillThin')} ·{' '}
                        {pathLabel(locale, 'sketch')}
                      </strong>
                      {' — '}
                      {pathFillHint(locale, 'sketch')}.
                    </p>
                  )}
                  <p className="work-pack-destination">
                    {i18nT(locale, 'ui.packDest')}
                  </p>
                  <div className="step-focus-actions step-focus-actions-empty">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        document.getElementById('desk-capture')?.focus()
                      }
                    >
                      {i18nT(locale, 'ui.dumpIdea')}
                    </button>
                    {deskTasks.length === 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={openBreakdown}
                      >
                        {i18nT(locale, 'ui.breakMicro')}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="step-focus">
                  <div className="step-focus-meta">
                    <span className="task-badge">
                      {i18nT(locale, 'ui.doThisNow')}
                    </span>
                    <span className="task-meta">
                      {({ high: 'High', med: 'Medium', low: 'Low' }[
                        nextTask.energy || 'med'
                      ] || 'Medium')}{' '}
                      energy
                      {nextTask.parentId ? ' · micro-step' : ''}
                      {nextTask.dueDate
                        ? ` · ${urgencyLabel(nextTask.dueDate)}`
                        : ''}
                    </span>
                  </div>
                  <input
                    className="step-focus-title"
                    value={nextTask.title}
                    onChange={(e) =>
                      updateTaskTitle(nextTask.id, e.target.value)
                    }
                    aria-label="Edit current step"
                  />
                  <label className="field-label" htmlFor="step-why" style={{ marginTop: '0.65rem' }}>
                    Why it fits the goal (one line)
                  </label>
                  <input
                    id="step-why"
                    className="field-input"
                    value={nextTask.why || ''}
                    onChange={(e) =>
                      updateTaskWhy(nextTask.id, e.target.value)
                    }
                    placeholder="e.g. Quiet hierarchy matches the detective goal"
                    aria-label="Why this draft fits the goal"
                  />
                  <div className="step-focus-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={completeCurrentStep}
                    >
                      {i18nT(locale, 'ui.completeStep')}
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
                              notifyAction('Split into 3', 'micro_steps', {
                                label: 'Split step',
                              })
                              bumpStepFocus()
                            }}
                          >
                            Split if too big
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setProcessOpenLocal((o) => !o)}
                          aria-expanded={processOpenLocal}
                        >
                          Process checklist
                        </button>
                        <button
                          type="button"
                          className="text-link step-due-toggle"
                          onClick={() => setStepDueOpen((o) => !o)}
                          aria-expanded={stepDueOpen}
                        >
                          {stepDueOpen || nextTask.dueDate
                            ? stepDueOpen
                              ? 'Hide due date'
                              : `Due ${formatShortDate(nextTask.dueDate)}`
                            : 'Add due date'}
                        </button>
                      </div>
                    </details>
                  </div>
                  <div className="step-focus-secondary">
                    <button
                      type="button"
                      className="text-link step-remove-link"
                      onClick={() => {
                        const id = nextTask.id
                        setDeskConfirm({
                          kind: 'remove-step',
                          label:
                            'Remove this step from the desk? Cannot be undone.',
                          onConfirm: () => {
                            removeTask(id)
                            flashToast(i18nT(locale, 'ui.stepRemoved'))
                            setDeskConfirm(null)
                          },
                        })
                      }}
                    >
                      Remove step
                    </button>
                  </div>
                  {stepDueOpen && (
                    <div className="step-due-row">
                      <label className="field-label" htmlFor="step-due">
                        Due date
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

            {/* A/B/C draft options from Ideate */}
            {(activeProject?.directions || []).some((d) =>
              String(d.title || '').trim()
            ) && (
              <section className="panel brand-section sketch-directions-panel">
                <div className="brand-section-label">Draft options (from Ideate · ideas)</div>
                <div className="sketch-dir-chips">
                  {(activeProject.directions || [])
                    .filter((d) => String(d.title || '').trim())
                    .map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className={`sketch-dir-chip${d.chosen ? ' is-chosen' : ''}`}
                        onClick={() => {
                          addTask({
                            id: Date.now() + Math.random(),
                            title: `Draft ${d.label}: ${d.title}`,
                            energy: 'med',
                            meta: 'Direction option',
                            why: d.note || '',
                            completed: false,
                            seeded: false,
                            projectId:
                              activeProject?.id ||
                              useAppStore.getState().currentProjectId,
                            dueDate: '',
                          })
                          flashToast(
                            tFormat(locale, 'ui.queuedDraftLabel', {
                              label: d.label,
                            })
                          )
                        }}
                      >
                        {d.label}
                        {d.chosen ? ' ★' : ''} · {d.title}
                      </button>
                    ))}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.65rem' }}
                  onClick={() => {
                    const filled = (activeProject?.directions || []).filter(
                      (d) => String(d.title || '').trim()
                    )
                    if (!filled.length) {
                      flashToast(i18nT(locale, 'ui.captureIdeateFirst'))
                      return
                    }
                    const base = Date.now()
                    filled.forEach((d, i) => {
                      addTask({
                        id: base + i + 1,
                        title: `Draft ${d.label}: ${d.title}`,
                        energy: 'med',
                        meta: 'Direction option',
                        why: d.note || '',
                        completed: false,
                        seeded: false,
                        projectId:
                          activeProject?.id ||
                          useAppStore.getState().currentProjectId,
                        dueDate: '',
                      })
                    })
                    flashToast(
                      tFormat(locale, 'ui.queuedDraftsN', {
                        n: filled.length,
                      })
                    )
                  }}
                >
                  Queue all A/B/C drafts
                </button>
              </section>
            )}

            <div className="sketch-below">
            {/* Compact capture — secondary to current step */}
            <section className="capture-strip sketch-capture" aria-label="Capture">
              <div className="capture-row capture-row-compact">
                <input
                  id="desk-capture"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && captureStep?.()}
                  placeholder="Dump another idea…"
                  aria-label="Add to desk"
                />
                <button
                  type="button"
                  onClick={() => captureStep?.()}
                  className="btn btn-secondary"
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
                  {captureOptionsOpen ? 'Hide options' : 'Energy & voice'}
                </button>
                {captureOptionsOpen && (
                  <>
                    <select
                      className="capture-energy"
                      value={captureEnergy}
                      onChange={(e) => setCaptureEnergy(e.target.value)}
                      aria-label="Energy level"
                    >
                      <option value="high">High</option>
                      <option value="med">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <label className="capture-due-label">
                      Due
                      <input
                        type="date"
                        className="capture-due-input"
                        value={captureDue}
                        onChange={(e) => setCaptureDue(e.target.value)}
                        aria-label="Optional due date"
                      />
                    </label>
                    <button
                      type="button"
                      className="voice-link"
                      onClick={startVoice}
                    >
                      Voice input
                    </button>
                  </>
                )}
              </div>
            </section>

            {showHowItWorks && (
              <section className="product-card product-card-quiet" aria-label="How this desk works">
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

            <div className="path-continue-row work-below-tools sketch-tools-row">
              <button
                type="button"
                className="text-link"
                onClick={openBreakdown}
              >
                Break project down
              </button>
            </div>

            {/* Queue — collapsed by default when busy */}
            <section className="panel brand-section sketch-queue-panel">
              <button
                type="button"
                className="section-toggle"
                onClick={() => setQueueOpen((o) => !o)}
                aria-expanded={
                  queueTasks.length === 0
                    ? false
                    : queueCollapsed
                      ? queueOpen
                      : true
                }
              >
                <span className="brand-section-label" style={{ margin: 0 }}>
                  Queue · {queueTasks.length} waiting
                </span>
                <span className="section-toggle-hint">
                  {queueTasks.length === 0
                    ? ''
                    : queueCollapsed && !queueOpen
                      ? 'Show'
                      : 'Hide'}
                </span>
              </button>
              {queueTasks.length === 0 ? (
                <p className="empty-state-body" style={{ margin: '0.65rem 0 0' }}>
                  Nothing waiting. Completing the current step promotes the next
                  entry automatically.
                </p>
              ) : (queueCollapsed ? queueOpen : true) ? (
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
                          <span className="task-step-num">Step {i + 2}</span>
                          <span className="task-title">{task.title}</span>
                          <span className="task-meta">
                            {({ high: 'High', med: 'Medium', low: 'Low' }[
                              task.energy || 'med'
                            ] || 'Medium')}{' '}
                            energy
                            {task.dueDate
                              ? ` · ${formatShortDate(task.dueDate)}`
                              : ''}
                          </span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state-body" style={{ margin: '0.65rem 0 0' }}>
                  Queue hidden so you only see the current step. Show when ready.
                </p>
              )}
            </section>

            {/* Completed — collapsed by default */}
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
                  {doneTasks.length === 0 ? '' : doneOpen ? 'Hide' : 'Show'}
                </span>
              </button>
              {doneTasks.length === 0 ? (
                <p className="empty-state-body" style={{ margin: '0.65rem 0 0' }}>
                  Finished steps land here — proof you moved.
                </p>
              ) : doneOpen ? (
                <ul className="done-list" style={{ marginTop: '0.75rem' }}>
                  {doneTasks.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="done-undo"
                        onClick={() => toggleTask(t.id)}
                        title="Mark incomplete"
                      >
                        ✓
                      </button>
                      <span className="done-title">{t.title}</span>
                      <button
                        type="button"
                        className="text-link"
                        style={{ marginTop: 0 }}
                        onClick={() => {
                          const id = t.id
                          setDeskConfirm({
                            kind: 'delete-done',
                            label: 'Delete this completed step permanently?',
                            onConfirm: () => {
                              removeTask(id)
                              setDeskConfirm(null)
                            },
                          })
                        }}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
            </div>
          </div>
  )
}
