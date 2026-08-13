/**
 * Strategy / The brief — form-only writing surface.
 *
 * One job: answers get written here (client later, or you now).
 * Head: title · status · Send the brief (when not sent). Form is the start.
 * No start ramp, no interview CTA, no chapter rail, no project-name band.
 * No milestones / Scope strip under the form (owner — brief is the work).
 * Footer: Back to desk · Next · Research · short needed count.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import Workroom from '../components/Workroom'
import { labelForStepId } from '../lib/journey/journey'
import useAppStore from '../store/useAppStore'
import { getRequiredEmpty, DETECTIVE_CHAPTERS } from '../lib/brief/detectiveBrief'
import { relativeDeadlineLabel } from '../lib/dates'
import StrategyWords from '../components/StrategyWords'
import BriefClientLink from '../features/brief/BriefClientLink'
import '../styles/lazy-define.css'

const DetectiveSheet = lazy(() => import('../features/brief/DetectiveSheet'))

/** Local project signals only — no portal fetch on every Strategy visit. */
function briefSendStatus(project) {
  if (project?.discoveryShareStatus === 'submitted') {
    return {
      kind: 'submitted',
      label: 'Client submitted their answers.',
    }
  }
  if (project?.clientPortalId || project?.discoveryShareId) {
    return {
      kind: 'pending',
      label: 'Sent — waiting on the client.',
    }
  }
  return {
    kind: 'not_sent',
    label: 'Not sent yet.',
  }
}

export default function DefineView(props) {
  const {
    navDir = 'none',
    journeyNext = null,
    activeProject: activeProjectProp = null,
    updateDetective: updateDetectiveProp,
    onOpenShare,
    onSetDiscoveryShare,
    onMergeDiscoveryAnswers,
    flashToast,
    setActiveView,
    pathCtx = null,
    setProjectDeadline: setProjectDeadlineProp,
    projectDeadline: projectDeadlineProp = '',
  } = props

  /* CALL MODE — the Brief's designer-led capture mode.
     The client answers this same schema at /f/:shareId; this is the designer
     answering it while the client talks. One question at a time, written
     straight to `detective` by the same sheet — no second form, no second
     store. Index only: the answers live where they always did, so leaving
     and re-entering the call loses nothing. */
  const [callMode, setCallMode] = useState(false)
  const [callIndex, setCallIndex] = useState(0)
  const callFields = useMemo(() => DETECTIVE_CHAPTERS.flatMap((c) => c.fields), [])

  const activeProject = useAppStore((s) => {
    const id = activeProjectProp?.id || s.currentProjectId
    return (s.projects || []).find((p) => p.id === id) || activeProjectProp || null
  })
  const updateDetective = useCallback(
    (...a) =>
      (updateDetectiveProp || useAppStore.getState().updateDetective)(...a),
    [updateDetectiveProp]
  )
  const setProjectDeadline = useCallback(
    (...a) =>
      (setProjectDeadlineProp || useAppStore.getState().setProjectDeadline)(
        ...a
      ),
    [setProjectDeadlineProp]
  )
  const projectDeadline =
    projectDeadlineProp || activeProject?.deadline || ''

  /* Translate the brief's four positioning spectrums into strategy
     attributes, once. The client already answered "modern or traditional?";
     asking the designer to re-place that on a slider by hand was the app
     failing to use information it had. One-shot and idempotent in the store,
     so an adjusted or cleared list is never overwritten. */
  const seedStrategyAttributes = useAppStore((s) => s.seedStrategyAttributes)
  useEffect(() => {
    if (!activeProject?.id) return
    seedStrategyAttributes(activeProject.id)
  }, [activeProject?.id, seedStrategyAttributes])

  const requiredEmpty = useMemo(
    () => getRequiredEmpty(activeProject?.detective, projectDeadline),
    [activeProject?.detective, projectDeadline]
  )

  const sendStatus = useMemo(
    () => briefSendStatus(activeProject),
    [
      activeProject?.clientPortalId,
      activeProject?.discoveryShareId,
      activeProject?.discoveryShareStatus,
    ]
  )

  const deadlineRelative = useMemo(
    () => relativeDeadlineLabel(projectDeadline),
    [projectDeadline]
  )

  const neededLine =
    requiredEmpty.length === 0
      ? ''
      : requiredEmpty.length === 1
        ? '1 still blank'
        : `${requiredEmpty.length} still blank`

  const showSend = sendStatus.kind === 'not_sent'

  return (
    <Workroom
      stepId="define"
      project={activeProject}
      pathCtx={pathCtx}
      setActiveView={setActiveView}
      status={`${sendStatus.label}${
        deadlineRelative ? ` · ${deadlineRelative}` : ''
      }`}
      masthead={
        <>
          <h1 className="cc-stage-display">{labelForStepId('define')}</h1>
          <div className="cc-stage-masthead-aside">
            {/* Share never competes with path Continue (audit P1). */}
            {/* TWO CAPTURE MODES OF ONE BRIEF, side by side, because they
                answer the same question — "how do these answers get here?" —
                and the designer picks by who is available, not by which form
                they want. Neither is a separate destination. */}
            <button
              type="button"
              className="btn btn-secondary define-brief-send"
              onClick={() => onOpenShare?.()}
            >
              {showSend ? 'Send the brief' : 'Share'}
            </button>
            <BriefClientLink
              projectId={activeProject?.id || null}
              clientName={activeProject?.name || ''}
              shareId={activeProject?.discoveryShareId || null}
              shareStatus={activeProject?.discoveryShareStatus || null}
              onSetShare={onSetDiscoveryShare}
              onMergeAnswers={onMergeDiscoveryAnswers}
              flashToast={flashToast}
            />
            <button
              type="button"
              className="btn btn-ghost define-brief-call"
              aria-pressed={callMode}
              onClick={() => {
                setCallMode((on) => !on)
                setCallIndex(0)
              }}
            >
              {callMode ? 'Leave call mode' : 'Call mode'}
            </button>
          </div>
        </>
      }
      ledge={
        callMode ? (
          /* The call's own controls. Path Continue is deliberately absent
             here: mid-call the next thing is the next question, and a button
             that leaves the Brief while the client is still talking is the
             one mistake this mode can make. Leaving is the masthead toggle. */
          <>
            <p className="cc-stage-ledge-note">
              {`Question ${Math.min(callIndex + 1, callFields.length)} of ${callFields.length}`}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={callIndex === 0}
              onClick={() => setCallIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </button>
            {callIndex >= callFields.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setCallMode(false)
                  setCallIndex(0)
                }}
              >
                Done — back to the brief
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  setCallIndex((i) => Math.min(callFields.length - 1, i + 1))
                }
              >
                Next question
              </button>
            )}
          </>
        ) : (
        <>
          {neededLine ? (
            <p className="cc-stage-ledge-note">{neededLine}</p>
          ) : null}
          {/* NO BACK BUTTON HERE. The stage's own edge already carries one,
              and on the first stop it reads "← Back to the desk" — the exact
              words and the exact destination this button had. Two controls
              with one label and one target, a screen apart, is the second
              navigation system the ledge is written not to be: "it is a SLOT
              … nothing about any stop's navigation moved into here"
              (workroom.css). The ledge holds continue; leaving is chrome. */}
          <button
            type="button"
            className={`btn work-path-next${
              showSend && (requiredEmpty?.length || 0) === 0
                ? ' btn-secondary'
                : ' btn-primary'
            }`}
            onClick={() => setActiveView?.(journeyNext?.view || 'studio')}
          >
            {`Next · ${journeyNext?.label || labelForStepId('research')}`}
          </button>
        </>
        )
      }
    >
      {/* The view's layout classes stay on a wrapper INSIDE the plane, never
          on the stage element. `.define-brief` declares `display: flex` and a
          6rem bottom padding; on the stage those fought `.cc-stage`'s grid and
          shifted the sticky footer up off the viewport edge. The stage owns
          the frame, the view owns what sits in it — putting both on one
          element is how the two negotiate by cascade order instead of by
          decision. */}
      <div className="define-studio define-brief" data-nav-dir={navDir}>
      <div className="define-split" data-define-layout="form-only">
        <div
          className="define-split-form"
          role="region"
          aria-label="Brief questions"
        >
          <Suspense
            fallback={
              <div className="define-workbook define-workbook-loading">
                Loading…
              </div>
            }
          >
            <DetectiveSheet
              detective={activeProject?.detective}
              updateDetective={updateDetective}
              callMode={callMode}
              callIndex={callIndex}
              splitMode
              showStartHere={false}
              showChapterRail={false}
              projectDeadline={projectDeadline}
              setProjectDeadline={setProjectDeadline}
            />
          </Suspense>
        </div>
      </div>

      {/* Decision memory starts here. These words are what reappear later,
          as bars, at the moment type and colour are chosen — the connection
          the product is actually for. */}
      <section
        className="panel brand-section define-strategy"
        aria-label="Brand feel"
      >
        <StrategyWords
          projectId={activeProject?.id}
          attributes={activeProject?.strategyAttributes}
        />
      </section>

      </div>
    </Workroom>
  )
}
