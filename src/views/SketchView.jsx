/**
 * Sketch — fold owns the step; capture secondary; queue/done collapsed.
 * Tech-Studio ADHD: one primary (Done), sticky Next, focus isolation.
 */
import {
  Suspense,
  lazy,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react'
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
import TouchpointMockThumb from '../components/TouchpointMockThumb'
import ApplicationCheck from '../features/brand/ApplicationCheck'
import {
  BRAND_ROLE_KEYS,
  BRAND_ROLE_LABELS,
  paletteIsUntouched,
} from '../lib/color'
import {
  touchpointsFor,
  touchpointLabel,
  touchpointCheckHint,
} from '../lib/journey/touchpoints'
import '../styles/lazy-sketch.css'

const EmptyIllustration = lazy(() => import('../components/EmptyIllustration'))

/** One-tap surfaces, so a thin brief is not stuck bouncing back to Strategy. */
const QUICK_SURFACES = [
  { id: 'website', label: 'Website' },
  { id: 'social', label: 'Social' },
  { id: 'print', label: 'Print' },
  { id: 'app', label: 'App' },
]


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
 * `touchpointsStatus.test.js` specified this before it existed — the test
 * imported it, the function did not, and that is why main's unit job was red.
 * Implemented to the spec the test already fixes, including its explicit
 * assertion that the line must NOT match /\d+ of \d+/: a fraction on a
 * progress line reads as a score to fall short of, and this stop needs only
 * ONE surface noted, so a count would misreport the ask and leave a visible
 * remainder to finish.
 *
 * A surface counts as checked when its proof is explicitly done, or carries a
 * note — a note is the evidence that someone actually looked at it.
 *
 * NOW WIRED. It previously said it was deliberately not rendered, because
 * where the line belonged was a layout decision for the owner. That decision
 * has been made (owner, 2026-08-05: restore the Touchpoints screen), so it
 * heads the restored block. The function survived b90e24e; the UI that called
 * it did not — which is why a status line sat here for weeks with nothing to
 * describe, and why `surfaceLabel` and `joinWords` were still imported.
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
    /* Needed by the Touchpoints mocks so they preview in the brand's own
       colours rather than a generic grey. Was absent from this file's props
       and present in the version b90e24e overwrote — restoring the block
       without it threw `projectPalette is not defined` at render, which the
       build and 905 unit tests both reported as fine. */
    projectPalette = [],
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
    offerUndo,
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
  const updateDetective = useAppStore((s) => s.updateDetective)

  /* Touchpoints — derived from the brief, so the surfaces offered are the
     ones this project actually has, not a fixed four for every brand. */
  const touchpointSurfaces = activeProject?.detective?.brandSurfaces
  const touchpointDeliverables = activeProject?.detective?.deliverablesPicked
  const touchpointApps = touchpointsFor(
    touchpointSurfaces,
    touchpointDeliverables
  )
  const touchpointProofs = activeProject?.touchpointApps || {}
  const hasBriefSurfaces =
    (Array.isArray(touchpointSurfaces) && touchpointSurfaces.length > 0) ||
    (Array.isArray(touchpointDeliverables) &&
      touchpointDeliverables.length > 0)
  const statusLine = touchpointsStatusLine({
    hasBriefSurfaces,
    apps: hasBriefSurfaces ? touchpointApps : [],
    proofs: touchpointProofs,
  })

  /* Reads the CURRENT row out of the store rather than closing over the
     render's copy: two edits in quick succession (tick "mock is good", then
     type a note) would otherwise resolve against the same stale object and
     the first would be silently dropped. */
  const setTouchpointApp = (id, patch) => {
    const state = useAppStore.getState()
    const projectId = activeProject?.id || state.currentProjectId
    const prev =
      state.projects.find((p) => p.id === projectId)?.touchpointApps || {}
    updateBrandField('touchpointApps', {
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    })
  }

  /* THE PALETTE THE DESIGNER ACTUALLY CHOSE, which is not the same as "the
     palette". Every project is created carrying DEFAULT_PALETTE's four stone
     values and App.jsx substitutes them again when a project has none, so
     `palette.length` is never 0 and an untouched project looks identical to a
     decided one. Checking a business card against four colours nobody picked
     reports the designer's own correct work as off-brand — verified on the
     Mark screen before this guard existed there, and the same trap is one
     line away here. */
  const checkPalette = useMemo(() => {
    const chosen =
      Array.isArray(projectPalette) && projectPalette.length
        ? projectPalette
        : activeProject?.palette || []
    return paletteIsUntouched(chosen) ? [] : chosen
  }, [projectPalette, activeProject?.palette])

  const roleLabelForHex = useCallback(
    (hex) => {
      const want = String(hex || '').toLowerCase()
      if (!want) return null
      const key = BRAND_ROLE_KEYS.find(
        (k) =>
          String(activeProject?.colorRoles?.[k] || '').toLowerCase() === want
      )
      return key ? BRAND_ROLE_LABELS[key] : null
    },
    [activeProject?.colorRoles]
  )

  const addQuickSurface = (id) => {
    const prev = Array.isArray(touchpointSurfaces) ? [...touchpointSurfaces] : []
    if (prev.includes(id)) {
      flashMicro?.(`${touchpointLabel(id)} · already on the list`)
      return
    }
    updateDetective('brandSurfaces', [...prev, id])
    flashMicro?.(`${touchpointLabel(id)} · added`)
  }

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
              {/* Breakdown is project-scoped, but its only other entry point
                  is the per-step "More" menu, which needs a step to exist —
                  so the tool for "big job, no idea where to start" was
                  unreachable at exactly that moment. */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={openBreakdown}
              >
                Break down project
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

        {/* The focus timer used to be duplicated here, and it was the loudest
            thing on the screen: a "not started" readout set at display size,
            dominating a work page while the designer was demonstrably working.
            Removed rather than kept — the real Timer lives on Tools, and a
            second copy of a running clock is a second clock to reconcile.
            Same fix already applied to Identity, Assets, Spark, Review and
            Research; this was the last copy. Found by opening the app, not by
            a test: every check was green with it on screen. */}

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

      {/* ── Touchpoints ──────────────────────────────────────────────────
          The reason this stop exists, restored.

          `journey.js` declares this stop as "Touchpoints — where the brand
          shows up, one note per surface from the brief", and says what enough
          looks like: "one surface noted or marked looks right." None of that
          was on the screen. b90e24e overwrote this file — its parent version
          WAS the Touchpoints screen — with a general step view, and the
          heading kept reading "Touchpoints" because it comes from
          `labelForStepId`, so the page named a job it no longer did.

          The consequence was not cosmetic. `touchpointApps` had no writer
          anywhere in src/, and `journeyProgress.js` gates this stop on it, so
          the stop could NEVER complete — and the brand book's applications
          page reads the same field, so it had nothing to draw from. Every
          check stayed green throughout: no test renders this view, and an
          empty object is a valid empty object.

          Restored as an addition rather than a revert. The old file predates
          the layout-pattern reference and the current-step panel, both of
          which are pinned by e2e (`phase-surfaces`, `offline`), so putting it
          back wholesale would have traded one loss for another. */}
      <section className="touchpoints-block" aria-label="Applications">
        <div className="touchpoints-head">
          <h2 className="touchpoints-heading">Where the brand shows up</h2>
          <p className="touchpoints-status" role="status">
            {statusLine}
          </p>
        </div>

        {!hasBriefSurfaces ? (
          <div className="touchpoints-empty">
            <p className="touchpoints-empty-title">
              Name where the brand appears
            </p>
            {/* One tap each, so a thin brief is not stuck bouncing back to
                Strategy to become completable. */}
            <div
              className="touchpoints-quick"
              role="group"
              aria-label="Add a surface"
            >
              {QUICK_SURFACES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => addQuickSurface(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="touchpoints-list">
            {touchpointApps.map((id) => {
              const row = touchpointProofs[id] || {}
              const note = row.note || ''
              const done = !!row.done
              const ready = done || String(note).trim().length > 0
              return (
                <li
                  key={id}
                  className={`touchpoints-card${ready ? ' is-ready' : ''}`}
                >
                  <div className="touchpoints-card-layout">
                    <TouchpointMockThumb
                      id={id}
                      project={activeProject}
                      palette={
                        Array.isArray(projectPalette) && projectPalette.length
                          ? projectPalette
                          : activeProject?.palette || []
                      }
                    />
                    <div className="touchpoints-card-body">
                      <div className="touchpoints-card-head">
                        <h3 className="touchpoints-card-title">
                          {touchpointLabel(id)}
                        </h3>
                        <button
                          type="button"
                          className={`btn btn-sm${done ? ' btn-secondary' : ' btn-ghost'}`}
                          aria-pressed={done}
                          onClick={() => {
                            setTouchpointApp(id, { done: !done })
                            flashMicro?.(
                              !done
                                ? `${touchpointLabel(id)} · mock is good`
                                : `${touchpointLabel(id)} · open again`
                            )
                          }}
                        >
                          {done ? 'Mock is good' : 'This mock is good'}
                        </button>
                      </div>
                      <label className="field-label" htmlFor={`tp-note-${id}`}>
                        How it shows up
                      </label>
                      <textarea
                        id={`tp-note-${id}`}
                        className="field-textarea"
                        rows={2}
                        value={note}
                        onChange={(e) =>
                          setTouchpointApp(id, { note: e.target.value })
                        }
                        placeholder={touchpointCheckHint(id)}
                      />
                      {/* ── The finished piece, checked ────────────────────
                          Phase 6 recorded this half as structurally blocked:
                          "the banner lives on one asset, not an asset
                          library". The blocked reasoning assumed the check
                          needs somewhere to FILE assets. It does not — it
                          needs somewhere the deliverables are already named,
                          and this list is exactly that, derived from the
                          brief. A business card exported from Illustrator
                          lands on the Business card row because that is the
                          row the designer is standing on. */}
                      <ApplicationCheck
                        check={row.check || null}
                        palette={checkPalette}
                        labelFor={roleLabelForHex}
                        label={touchpointLabel(id).toLowerCase()}
                        onChecked={(check) => {
                          setTouchpointApp(id, { check })
                          flashMicro?.(`${touchpointLabel(id)} · colours read`)
                        }}
                        onClear={() => {
                          const before = row.check
                          setTouchpointApp(id, { check: null })
                          /* Undo, not a confirmation dialog. A dialog is a
                             decision; undo is not — and the reading cost a
                             file-picker trip to produce. */
                          offerUndo?.('Check cleared', () =>
                            setTouchpointApp(id, { check: before })
                          )
                        }}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

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
