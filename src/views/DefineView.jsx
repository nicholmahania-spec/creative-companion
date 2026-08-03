/**
 * Strategy / The brief — form-only writing surface.
 *
 * One job: answers get written here (client later, or you now).
 * Head: title · status · Send the brief (when not sent). Form is the start.
 * No start ramp, no interview CTA, no chapter rail, no project-name band.
 * Milestones + scope demoted below the form.
 * Footer: Back to desk · Next · Research · short needed count.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { labelForStepId } from '../lib/journey'
import useAppStore from '../store/useAppStore'
import { getRequiredEmpty } from '../lib/detectiveBrief'
import { relativeDeadlineLabel } from '../lib/dates'
import ScopePanel from '../components/ScopePanel'
import '../styles/lazy-define.css'

const DetectiveSheet = lazy(() => import('./DetectiveSheet'))

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
    flashMicro,
  } = props

  const projectId = useAppStore(
    (s) => activeProjectProp?.id || s.currentProjectId
  )
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

  const addMilestone = useCallback(
    (...a) => useAppStore.getState().addMilestone(...a),
    []
  )
  const updateMilestone = useCallback(
    (...a) => useAppStore.getState().updateMilestone(...a),
    []
  )
  const removeMilestone = useCallback(
    (...a) => useAppStore.getState().removeMilestone(...a),
    []
  )

  const scrollToChapter = useCallback((chapterId) => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document
      .getElementById(`define-chapter-content-${chapterId}`)
      ?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
  }, [])

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

  const milestones = activeProject?.detective?.milestones || []
  const [pendingRemovals, setPendingRemovals] = useState({})
  const pendingRemovalsRef = useRef(pendingRemovals)
  pendingRemovalsRef.current = pendingRemovals

  const scheduleRemoveMilestone = useCallback(
    (id) => {
      const ownerProjectId = projectId
      setPendingRemovals((prev) => ({
        ...prev,
        [id]: { timeoutId: null, ownerProjectId },
      }))
    },
    [projectId]
  )

  const undoRemoveMilestone = useCallback((id) => {
    setPendingRemovals((prev) => {
      const entry = prev[id]
      if (entry?.timeoutId) clearTimeout(entry.timeoutId)
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  useEffect(() => {
    return () => {
      Object.entries(pendingRemovalsRef.current).forEach(([id, entry]) => {
        clearTimeout(entry?.timeoutId)
        removeMilestone?.(id, entry?.ownerProjectId)
      })
    }
  }, [removeMilestone])

  const deadlineRelative = useMemo(
    () => relativeDeadlineLabel(projectDeadline),
    [projectDeadline]
  )

  const neededLine =
    requiredEmpty.length === 0
      ? ''
      : requiredEmpty.length === 1
        ? '1 needed'
        : `${requiredEmpty.length} needed`

  const showSend = sendStatus.kind === 'not_sent'

  return (
    <div
      className="brand-layout surface-document define-studio define-brief view-enter"
      data-nav-dir={navDir}
    >
      <header className="define-brief-head">
        <div className="define-brief-head-row">
          <div className="define-brief-head-text">
            <h1 className="page-title define-brief-title">The brief</h1>
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
          {showSend ? (
            <button
              type="button"
              className="btn btn-primary define-brief-send"
              onClick={() => onOpenShare?.()}
            >
              Send the brief
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary define-brief-send"
              onClick={() => onOpenShare?.()}
            >
              Share
            </button>
          )}
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

      <section
        className="define-brief-secondary"
        aria-label="Dates and scope"
      >
        <div className="define-milestones-compact">
          <span className="define-field-label">Milestones</span>
          <div className="define-milestones-list">
            {milestones.map((m) => {
              const isPending = Boolean(pendingRemovals[m.id])
              if (isPending) {
                return (
                  <div
                    key={m.id}
                    className="detective-milestone-row is-pending-removal"
                    role="status"
                  >
                    <span>Removed “{m.label || 'Untitled'}”</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => undoRemoveMilestone(m.id)}
                    >
                      Undo
                    </button>
                  </div>
                )
              }
              return (
                <div key={m.id} className="detective-milestone-row">
                  <input
                    className="define-input field-input"
                    value={m.label}
                    onChange={(e) =>
                      updateMilestone?.(m.id, 'label', e.target.value)
                    }
                    placeholder="What happens"
                    aria-label="Milestone name"
                  />
                  <input
                    type="date"
                    className="define-input field-input detective-milestone-date"
                    value={m.date}
                    onChange={(e) =>
                      updateMilestone?.(m.id, 'date', e.target.value)
                    }
                    aria-label="Milestone date"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => scheduleRemoveMilestone(m.id)}
                    aria-label="Remove milestone"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => addMilestone?.('', '')}
            >
              + Add
            </button>
          </div>
        </div>

        <ScopePanel
          activeProject={activeProject}
          onOpenChapter={scrollToChapter}
          flashMicro={flashMicro}
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
              className="btn btn-primary work-path-next"
              onClick={() => setActiveView?.(journeyNext?.view || 'studio')}
            >
              {`Next · ${journeyNext?.label || labelForStepId('research')}`}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActiveView?.('desk')}
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
