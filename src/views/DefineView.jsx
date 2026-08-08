/**
 * Strategy / The brief — form-only writing surface.
 *
 * One job: answers get written here (client later, or you now).
 * Head: title · status · Send the brief (when not sent). Form is the start.
 * No start ramp, no interview CTA, no chapter rail, no project-name band.
 * No milestones / Scope strip under the form (owner — brief is the work).
 * Footer: Back to desk · Next · Research · short needed count.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo } from 'react'
import { labelForStepId } from '../lib/journey/journey'
import useAppStore from '../store/useAppStore'
import { getRequiredEmpty } from '../lib/brief/detectiveBrief'
import { relativeDeadlineLabel } from '../lib/dates'
import StrategyWords from '../components/StrategyWords'
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
    setActiveView,
    setProjectDeadline: setProjectDeadlineProp,
    projectDeadline: projectDeadlineProp = '',
  } = props

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
    <div
      className="brand-layout surface-document define-studio define-brief view-enter"
      data-nav-dir={navDir}
    >
      <header className="define-brief-head">
        <div className="define-brief-head-row">
          <div className="define-brief-head-text">
            <h1 className="page-title define-brief-title">
              {labelForStepId('define')}
            </h1>
            <p className="define-brief-status" data-status={sendStatus.kind}>
              {sendStatus.label}
              {deadlineRelative ? (
                <span className="define-brief-status-due">
                  {' '}
                  · {deadlineRelative}
                </span>
              ) : null}
            </p>
          </div>
          {/* Share never competes with path Continue (audit P1). */}
          <button
            type="button"
            className="btn btn-secondary define-brief-send"
            onClick={() => onOpenShare?.()}
          >
            {showSend ? 'Send the brief' : 'Share'}
          </button>
        </div>
        <div className="define-title-rule" aria-hidden="true" />
      </header>

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

      <div
        className="define-brief-footer"
        role="region"
        aria-label="Brief actions"
      >
        <div className="define-brief-footer-row">
          <div className="define-brief-footer-actions">
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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const hub = 'desk'
                setActiveView?.(hub)
              }}
            >
              Back to the desk
            </button>
          </div>
          {neededLine ? (
            <p className="define-brief-still-blank">{neededLine}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
