/**
 * Strategy / The brief — form-only writing surface (Studio mock).
 *
 * Inspiration/refs live on Research, not beside this page — owner removed
 * the Refs block deliberately; do not reintroduce without asking.
 *
 * Chrome (pruned): title · status · Send / Interview · one start jump · form.
 * Milestones + scope below the form. Sticky footer: desk · Next · short blank.
 * No project-name band (sidebar/header already name the project).
 * No chapter rail (form headings are the only map).
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { labelForStepId } from '../lib/journey'
import useAppStore from '../store/useAppStore'
import { getRequiredEmpty } from '../lib/detectiveBrief'
import { relativeDeadlineLabel } from '../lib/dates'
import DefineStartHere from '../components/DefineStartHere'
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

  // Own the live project row so App shell can skip detective equality and not
  // re-render the whole tree on every Define keystroke.
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
    [activeProject?.clientPortalId, activeProject?.discoveryShareId, activeProject?.discoveryShareStatus]
  )

  const milestones = activeProject?.detective?.milestones || []
  /** Milestone rows queued for removal: id -> entry. Purely transient UI
   * state — never belongs in the store. No countdown (time blindness). */
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

  /** Designer fills the brief live (mock: "I'm interviewing them"). */
  const startInterview = useCallback(() => {
    const first =
      requiredEmpty[0] ||
      { id: 'clientName' }
    requestAnimationFrame(() => {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
        .matches
      const el =
        document.getElementById(`detective-${first.id}`) ||
        document
          .getElementById(`detective-field-${first.id}`)
          ?.querySelector('input, textarea, button')
      if (!el) {
        document
          .getElementById('define-chapter-content-overview')
          ?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
        return
      }
      el.scrollIntoView({
        block: 'center',
        behavior: reduce ? 'auto' : 'smooth',
      })
      el.focus?.()
    })
  }, [requiredEmpty])

  /* Footer: short count only — full labels live on Start with / NEEDED badges. */
  const stillBlankLine =
    requiredEmpty.length === 0
      ? ''
      : requiredEmpty.length === 1
        ? '1 still blank'
        : `${requiredEmpty.length} still blank`

  return (
    <div
      className="brand-layout surface-document define-studio define-brief view-enter"
      data-nav-dir={navDir}
    >
      <header className="define-brief-head">
        <h1 className="page-title define-brief-title">The brief</h1>
        <p className="define-brief-status" data-status={sendStatus.kind}>
          {sendStatus.label}
          {deadlineRelative ? (
            <span className="define-brief-status-due"> · {deadlineRelative}</span>
          ) : null}
        </p>
        <div className="define-brief-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenShare?.()}
          >
            Send it to them
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={startInterview}
          >
            I&rsquo;m interviewing them
          </button>
        </div>
        <div className="define-title-rule" aria-hidden="true" />
        <DefineStartHere
          detective={activeProject?.detective}
          projectDeadline={projectDeadline}
          researchLabel={labelForStepId('research')}
        />
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

      {/* Demoted below the form so cheap edits don't intercept initiation. */}
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
                    ✕
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

      <div className="define-brief-footer" role="region" aria-label="Brief actions">
        <div className="define-brief-footer-row">
          <div className="define-brief-footer-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActiveView?.('desk')}
            >
              Back to the desk
            </button>
            <button
              type="button"
              className="btn btn-primary work-path-next"
              onClick={() => setActiveView?.(journeyNext?.view || 'studio')}
            >
              {`Next · ${journeyNext?.label || labelForStepId('research')}`}
            </button>
          </div>
          {stillBlankLine ? (
            <p className="define-brief-still-blank">{stillBlankLine}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
