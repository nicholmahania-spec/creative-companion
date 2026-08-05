/**
 * Sketch — fold owns the step; capture secondary; queue/done collapsed.
 * Tech-Studio ADHD: one primary (Done), sticky Next, focus isolation.
 */
import { Suspense, lazy, useState, useRef, useEffect } from 'react'
import { labelForStepId } from '../lib/journey/journey'
import useAppStore from '../store/useAppStore'
import { getProcessPhase } from '../lib/journey/processGuide'
import { formatShortDate, urgencyLabel } from '../lib/dates'
import { POMODORO_WORK_MIN } from '../lib/helper/forcedBreak'
import {
  formatDecisionLine,
  latestDecision,
  chosenDirection,
} from '../lib/decisionLog'
import LayoutPatterns from '../components/LayoutPatterns'
import '../styles/lazy-sketch.css'

const EmptyIllustration = lazy(() => import('../components/EmptyIllustration'))

/** Title Case for a surface id ('website' → 'Website'). */
const surfaceLabel = (id) =>
  String(id || '').replace(/^./, (c) => c.toUpperCase())

/** 'a', 'a and b', 'a, b and c' — no digits, by design (see below). */
function joinWords(list) {
  if (list.length <= 1) return list[0] || ''
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

/**
 * Touchpoints progress as words, never "1 of 3".
 *
 * `touchpointsStatus.test.js` has specified this since before it existed —
 * the test imported it, the function never did, and that is why `main`'s unit
 * job has been red. Implemented to the spec the test already fixes, including
 * its explicit assertion that the line must NOT match /\d+ of \d+/: raw counts
 * are the representation this product is built to avoid, and a fraction on a
 * progress line reads as a score to fall short of.
 *
 * NOT wired into the render. Where this line belongs on the Touchpoints
 * screen, and whether it replaces anything already there, is a layout decision
 * that belongs to the owner — so this exports the behaviour the test demands
 * and changes nothing on screen.
 *
 * A surface counts as checked when its proof is explicitly done, or carries a
 * note — a note is the evidence that someone actually looked at it.
 */
export function touchpointsStatusLine({
  hasBriefSurfaces = false,
  apps = [],
  proofs = {},
} = {}) {
  const list = Array.isArray(apps) ? apps.filter(Boolean) : []
  if (!list.length) return hasBriefSurfaces ? 'No mocks yet' : 'No surfaces yet'

  const checked = list.filter((id) => {
    const proof = proofs?.[id]
    if (!proof) return false
    return proof.done === true || String(proof.note || '').trim().length > 0
  })

  if (!checked.length) return 'No mocks checked yet'
  if (checked.length === list.length) return 'All mocks checked'
  return `${joinWords(checked.map(surfaceLabel))} checked — enough for the path`
}

export default function SketchView(props) {
  const {
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
    // Focus timer props
    forcedBreak,
    setSessionComplete,
    startOrPauseFocus,
    resetFocus,
    isFocusRunning,
    focusLeft,
    setFocusLeft,
    setPomodoroWorkStartedAt,
    setIsFocusRunning,
    setTimerFocusSource,
    sessionLabel,
    sessionComplete,
  } = props

  const addTask = useAppStore((s) => s.addTask)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
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
    flashToast?.(`Draft added · ${d.label}`)
  }

  const confirmRemove = (id, label) => {
    if (typeof setDeskConfirm === 'function') {
      setDeskConfirm({
        kind: 'remove-step',
        label,
        onConfirm: () => {
          removeTask(id)
          flashToast?.('Step removed')
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
            {labelForStepId('sketch')}
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

      {/* Fold: current step owns attention (redesign brief Work AOF) */}
      <section
        className="panel step-focus-panel sketch-now"
        key={stepFocusKey}
        id="current-step"
      >
        <div className="step-focus-head">
          <div className="brand-section-label" style={{ margin: 0 }}>
            Current step
          </div>
        </div>
        {!nextTask ? (
          <div className="empty-state empty-state-craft sketch-empty">
            <Suspense fallback={null}>
              <EmptyIllustration variant="desk" />
            </Suspense>
            <p className="empty-state-title">
              {doneTasks.length === 0
                ? 'No step yet'
                : `All done here (${doneTasks.length} ${
                    doneTasks.length === 1 ? 'step' : 'steps'
                  } completed)`}
            </p>
            <p className="empty-state-subtitle">
              {doneTasks.length === 0
                ? 'Ready to start your first step?'
                : "What's next?"}
            </p>
            <div className="step-focus-actions step-focus-actions-empty">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  document.getElementById('desk-capture')?.focus()
                }
              >
                Add step
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
                className="btn btn-primary"
                onClick={completeCurrentStep}
              >
                Complete step
              </button>
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
                  Split if too big
                </button>
              )}
              <details className="step-more-details">
                <summary>More</summary>
                <div className="step-more-panel">
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
                    Break down project
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
        {decisionLine ? (
          <p className="sketch-decision-line" role="status">
            {decisionLine}{' '}
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setActiveView?.('spark')
              }}
            >
              Edit
            </button>
          </p>
        ) : null}

        {ideateDirs.length > 0 && (
          <details className="sketch-ideate-details">
            <summary>From Ideate ({ideateDirs.length})</summary>
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
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    ideateDirs.forEach(queueDraft)
                  }}
                >
                  Queue all
                </button>
              )}
            </div>
          </details>
        )}

        {/* Closed reference, next to the drafts it informs. "What shape
            should this be" is the question that stalls a sketch, and naming
            the eight patterns turns it into a one-second decision. */}
        <LayoutPatterns />

        {/* Focus Timer */}
        <div className="insights-timer" style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
          {isFocusRunning || focusLeft < POMODORO_WORK_MIN * 60
            ? `${Math.floor(focusLeft / 60)}:${String(focusLeft % 60).padStart(2, '0')}`
            : 'not started'}
        </div>
        <div className="insights-focus-actions" style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={startOrPauseFocus}
            className={`btn ${!!forcedBreak || (focusLeft === 0 && !isFocusRunning) ? 'btn-secondary' : 'btn-primary'}`}
            disabled={!!forcedBreak || (focusLeft === 0 && !isFocusRunning)}
          >
            {isFocusRunning ? 'Pause' : focusLeft === 0 ? 'Start' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerFocusSource?.(null)
              resetFocus(25)
            }}
            className="btn btn-secondary btn-sm"
            disabled={!!forcedBreak}
          >
            25
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerFocusSource?.(null)
              resetFocus(2)
            }}
            className="btn btn-ghost btn-sm"
            disabled={!!forcedBreak}
          >
            2
          </button>
        </div>

        {/* The brand book's handoff page reads this — used to be writable
            only in off-path Review, so the numbered path alone could never
            produce it. One quiet field, no pressure to fill it. */}
        <div className="field-block sketch-feedback-block">
          <label className="field-label" htmlFor="sketch-feedback-notes">
            Feedback so far
            {/* Same field as Review's "Notes" — named differently in each
                place, which reads as two separate logs unless you notice
                text from one showing up in the other. */}
            <span className="sketch-feedback-shared-hint"> (shared with Review)</span>
          </label>
          <textarea
            id="sketch-feedback-notes"
            className="field-input"
            rows={3}
            value={activeProject?.feedbackNotes || ''}
            onChange={(e) => updateBrandField('feedbackNotes', e.target.value)}
            placeholder="Change · why · keep — optional"
          />
        </div>

        <section className="capture-strip sketch-capture" aria-label="Capture">
          <div className="capture-row capture-row-compact">
            <input
              id="desk-capture"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => {
              if (e.key === 'Enter') {
                captureStep?.();
              }
            }}
              placeholder="Next step"
              aria-label="Add to desk"
            />
            <button
              type="button"
              onClick={() => {
                captureStep?.();
              }}
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
              Five path stops: Strategy → Research → Identity → Touchpoints →
              Assets. Ideate and Review live under Tools.
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
                        onChange={() => {
                toggleTask(task.id);
              }}
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

      <div className="path-continue-row">
        <button
          type="button"
          className="btn btn-primary work-path-next"
          onClick={() =>
            setActiveView?.(journeyNext?.view || 'brand')
          }
        >
          {`Next · ${journeyNext?.label || labelForStepId('deliver')}`}
        </button>
      </div>
    </div>
  )
}
