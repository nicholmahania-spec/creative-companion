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
import {
  JOURNEY_STEPS,
  PATH_STEP_COUNT,
  labelForStepId,
} from '../lib/journey/journey'
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
import BusinessCardProduce from '../features/brand/BusinessCardProduce'
import EmailSignatureProduce from '../features/brand/EmailSignatureProduce'
import {
  BRAND_ROLE_KEYS,
  BRAND_ROLE_LABELS,
  paletteIsUntouched,
} from '../lib/color'
import {
  touchpointsFor,
  allBrandSurfaces,
  touchpointLabel,
  touchpointCheckHint,
} from '../lib/journey/touchpoints'
import { projectHasProducedBusinessCard } from '../lib/brand/businessCardArtifact'
import { projectHasProducedEmailSignature } from '../lib/brand/emailSignatureArtifact'
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
 * Touchpoints status as words about what is RECORDED — never path completion,
 * never "checked" for a note, never "1 of 3".
 *
 * A surface has evidence when it holds any of: mock accepted (`done`), a note,
 * or a colour-sample object (`check`). Those are discrete facts, not a claim
 * that the application is finished, approved, or delivered.
 *
 * ARTIFACT HONESTY: this line must not say "checked", "complete", or "enough
 * for the path". The system only knows optional designer evidence on mocks.
 */
export function touchpointsStatusLine({
  hasBriefSurfaces = false,
  apps = [],
  proofs = {},
} = {}) {
  const list = Array.isArray(apps) ? apps.filter(Boolean) : []
  if (!list.length) return hasBriefSurfaces ? 'No mocks yet' : 'No surfaces yet'

  const withEvidence = list.filter((id) => {
    const proof = proofs?.[id]
    if (!proof) return false
    return (
      proof.done === true ||
      String(proof.note || '').trim().length > 0 ||
      !!(proof.check && typeof proof.check === 'object')
    )
  })

  if (!withEvidence.length) return 'Nothing recorded yet'
  if (withEvidence.length === list.length) return 'Evidence on every surface'
  return `Evidence on ${joinWords(withEvidence.map(surfaceLabel))}`
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
  const addPackageAsset = useAppStore((s) => s.addPackageAsset)
  const updatePackageAsset = useAppStore((s) => s.updatePackageAsset)
  const businessCardProduced = projectHasProducedBusinessCard(activeProject)
  const emailSignatureProduced = projectHasProducedEmailSignature(activeProject)

  /* Touchpoints — derived from the brief, so the surfaces offered are the
     ones this project actually has, not a fixed four for every brand. */
  /* What the client asked for, plus what the designer added here. Two lists,
     one view — see `addQuickSurface`. */
  const touchpointSurfaces = allBrandSurfaces(activeProject)
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

  /* THE CLIENT'S ANSWER IS NOT THE DESIGNER'S LIST.
     This used to push straight into `detective.brandSurfaces`, so a designer
     adding a surface here rewrote the client's brief answer with no record
     that anyone had — and the brief is the one place the client's own words
     are supposed to survive. Designer additions live on the project and are
     unioned for display; the brief keeps saying what the client asked for. */
  const addQuickSurface = (id) => {
    if (touchpointSurfaces.includes(id)) {
      flashMicro?.(`${touchpointLabel(id)} · already on the list`)
      return
    }
    const mine = Array.isArray(activeProject?.designerSurfaces)
      ? activeProject.designerSurfaces
      : []
    updateBrandField('designerSurfaces', [...mine, id])
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
      className="flow-view surface-desk view-enter sketch-studio touchpoints-studio"
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
          </p>
          <p className="touchpoints-blurb">
            Apply the brand system to real surfaces. What you see here is a
            schematic mock — not finished artwork. Upload finished files in
            Assets when you have them (not linked to these surfaces yet).
          </p>
        </div>
      </div>

      {/* Application mocks are the stage. Desk tasks stay available below, collapsed. */}
      <section className="touchpoints-block" aria-label="Application mocks">
        <div className="touchpoints-head">
          <h2 className="touchpoints-heading">Application mocks</h2>
          <p className="touchpoints-status" role="status">
            {statusLine}
          </p>
        </div>

        {!hasBriefSurfaces ? (
          <div className="touchpoints-empty">
            <p className="touchpoints-empty-title">
              Name where the brand appears
            </p>
            <p className="touchpoints-empty-sub">
              From the brief when it is filled — or add a surface here so you
              can apply the system.
            </p>
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
          <>
          <ul className="touchpoints-list">
            {touchpointApps.map((id) => {
              const row = touchpointProofs[id] || {}
              const note = row.note || ''
              const done = !!row.done
              const hasCheck = !!(row.check && typeof row.check === 'object')
              const isBusinessCard = id === 'businessCard'
              const isEmail = id === 'email'
              const cardProduced = isBusinessCard && businessCardProduced
              const emailProduced = isEmail && emailSignatureProduced
              const appProduced = cardProduced || emailProduced
              /* Discrete facts only — never OR into "application complete".
                 Mock accepted ≠ produced artifact. */
              const proofBits = []
              if (done) proofBits.push('Mock accepted')
              if (hasCheck) proofBits.push('Colour sample')
              if (String(note).trim()) proofBits.push('Note')
              if (appProduced) proofBits.push('Application produced')
              return (
                <li
                  key={id}
                  className={`touchpoints-card${appProduced ? ' is-produced' : ''}`}
                  data-touchpoint={id}
                  data-application-produced={appProduced ? 'true' : 'false'}
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
                                ? `${touchpointLabel(id)} · mock accepted`
                                : `${touchpointLabel(id)} · mock open again`
                            )
                          }}
                        >
                          {done ? 'Mock is good' : 'This mock is good'}
                        </button>
                      </div>
                      <p className="touchpoints-proof-line" role="status">
                        {proofBits.length
                          ? proofBits.join(' · ')
                          : 'Nothing recorded yet'}
                      </p>
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
                      {isBusinessCard ? (
                        <BusinessCardProduce
                          project={activeProject}
                          palette={
                            Array.isArray(projectPalette) &&
                            projectPalette.length
                              ? projectPalette
                              : activeProject?.palette || []
                          }
                          addPackageAsset={addPackageAsset}
                          updatePackageAsset={updatePackageAsset}
                          flashMicro={flashMicro}
                          setActiveView={setActiveView}
                        />
                      ) : null}
                      {isEmail ? (
                        <EmailSignatureProduce
                          project={activeProject}
                          palette={
                            Array.isArray(projectPalette) &&
                            projectPalette.length
                              ? projectPalette
                              : activeProject?.palette || []
                          }
                          addPackageAsset={addPackageAsset}
                          updatePackageAsset={updatePackageAsset}
                          flashMicro={flashMicro}
                          setActiveView={setActiveView}
                        />
                      ) : null}
                      <ApplicationCheck
                        check={row.check || null}
                        palette={checkPalette}
                        labelFor={roleLabelForHex}
                        label={touchpointLabel(id).toLowerCase()}
                        onChecked={(check) => {
                          setTouchpointApp(id, { check })
                          flashMicro?.(
                            `${touchpointLabel(id)} · colour sample`
                          )
                        }}
                        onClear={() => {
                          const before = row.check
                          setTouchpointApp(id, { check: null })
                          offerUndo?.('Colour sample cleared', () =>
                            setTouchpointApp(id, { check: before })
                          )
                        }}
                      />
                      <p className="touchpoints-asset-line">
                        {appProduced ? (
                          <>
                            Application {cardProduced ? 'PDF' : 'PNG'} is in the{' '}
                            <button
                              type="button"
                              className="text-link"
                              onClick={() => setActiveView?.('finish')}
                            >
                              Delivery · client package
                            </button>
                            {' '}
                            (Application proofs folder when exported)
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="text-link"
                              onClick={() => setActiveView?.('assets')}
                            >
                              Upload finished files in Assets
                            </button>
                            {' '}
                            — not linked to this surface yet
                            {isBusinessCard
                              ? '. Or produce the card above to file a real PDF.'
                              : isEmail
                                ? '. Or produce the signature above to file a real PNG.'
                                : ''}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="touchpoints-handoff-note" role="note">
            Finished application files belong in{' '}
            <button
              type="button"
              className="text-link"
              onClick={() => setActiveView?.('assets')}
            >
              Assets
            </button>
            {' '}
            when you have them. They are not linked to these surfaces. A colour
            sample here stores a reading only — not the file.
          </p>
          </>
        )}
      </section>

      {/* Generic desk machinery — preserved, not the stage story. */}
      <details className="touchpoints-desk-optional">
        <summary className="touchpoints-desk-summary">
          Desk steps (optional)
          {deskTasks.length > 0
            ? ` · ${completedCount}/${deskTasks.length}`
            : ''}
        </summary>
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
            <summary>{`From ${labelForStepId('ideate')} (${ideateDirs.length})`}</summary>
            <div
              className="sketch-ideate-strip"
              aria-label={`From ${labelForStepId('ideate')}`}
            >
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
          </label>
          {/* READ-ONLY HERE. This and Review's "Notes" were two editors on one
              field, so the same log looked like two and either could clobber
              the other mid-sentence. Review owns it — it is the surface whose
              job is feedback, and it is where the append-only comment and
              approval records will land. */}
          <p
            id="sketch-feedback-notes"
            className={`sketch-feedback-read${
              activeProject?.feedbackNotes ? '' : ' is-empty'
            }`}
          >
            {activeProject?.feedbackNotes || '—'}
          </p>
          <button
            type="button"
            className="text-link"
            onClick={() => setActiveView?.('review')}
          >
            {activeProject?.feedbackNotes ? 'Edit on Review' : 'Write it on Review'}
          </button>
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
            {/* Derived. This sentence was a hand-typed copy of the path —
                "Five path stops: Strategy → … → Assets. Ideate and Review live
                under Tools." — and by 2026-08-09 every clause of it was wrong:
                the count, two of the names, and the claim about where Ideate
                lives. It named retired labels, so the single-source guard,
                which only knows current ones, never saw it. */}
            <p className="product-card-title" style={{ marginBottom: 0 }}>
              {`${PATH_STEP_COUNT} path stops: ${JOURNEY_STEPS.map((s) => s.label).join(' → ')}. ${labelForStepId('review')} lives under Tools.`}
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
      </details>

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
