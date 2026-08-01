/**
 * Define — brief form studio (form-only).
 * Inspiration/refs live on Research, not beside this page — owner removed
 * the Refs block deliberately; do not reintroduce without asking.
 * Calm chapter nav — no XP / game HUD.
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


export default function DefineView(props) {
  const {
    navDir = 'none',
    journeyNext = null,
    activeProject: activeProjectProp = null,
    deskTasks = [],
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
  /* No open-chapter state anymore — the brief is flat (advisor ruling; see
     DetectiveSheet). The stored defineOpenChapter, its resolver, and the
     first-incomplete fallback all served the accordion and are deleted with
     it. "Opening" a chapter now just means scrolling to it. */
  const scrollToChapter = useCallback((chapterId) => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document
      .getElementById(`define-chapter-content-${chapterId}`)
      ?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  const requiredLeft = useMemo(
    () => getRequiredEmpty(activeProject?.detective, projectDeadline).length,
    [activeProject?.detective, projectDeadline]
  )

  const milestones = activeProject?.detective?.milestones || []
  /** Milestone rows queued for removal: id -> timeout handle. Purely
   * transient UI state — never belongs in the store. */
  const [pendingRemovals, setPendingRemovals] = useState({})
  const pendingRemovalsRef = useRef(pendingRemovals)
  pendingRemovalsRef.current = pendingRemovals

  const scheduleRemoveMilestone = useCallback(
    (id) => {
      // Capture the project at schedule time. This view stays mounted across
      // project switches, so without it a delete queued on project A fired
      // against whatever was current 8 seconds later and quietly did nothing.
      const ownerProjectId = projectId
      // No countdown. The undo row simply stays until the view unmounts,
      // where the cleanup below commits it. An 8-second silent timer is the
      // most time-blindness-hostile control shape there is: look away, answer
      // a question, glance back, and the row is gone with no trace of whether
      // you deleted it or imagined it. Removing the deadline is also less
      // code than visualising one, and a countdown ring would render exactly
      // the number that does not register for this user.
      setPendingRemovals((prev) => ({ ...prev, [id]: { timeoutId: null, ownerProjectId } }))
    },
    [removeMilestone, projectId]
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

  // If this view unmounts with removals still pending, commit them now
  // instead of leaking the timers (and instead of silently un-deleting).
  // Each commits against the project it was scheduled on.
  useEffect(() => {
    return () => {
      Object.entries(pendingRemovalsRef.current).forEach(([id, entry]) => {
        clearTimeout(entry?.timeoutId)
        removeMilestone?.(id, entry?.ownerProjectId)
      })
    }
  }, [removeMilestone])

  /** Plain-language deadline beside the date input. A read-only signal, not
   * a second control — an ISO date carries no felt urgency. */
  /* Shared phrasing (lib/dates) — the client record rows speak the same
     words, so the two surfaces can't drift apart. */
  const deadlineRelative = useMemo(
    () => relativeDeadlineLabel(projectDeadline),
    [projectDeadline]
  )

  /* Project rename lives here now — the top nav (and its rename input) is
     gone, and this is the screen where the project IS the subject, so the
     name is edited where it is read. Same semantics the header input had:
     Enter or blur commits, an emptied field reverts rather than saving "".
     The client stays the identity (detective.clientName wins in exports and
     the portal); this is the working label that tells two projects for one
     client apart. */
  const [nameDraft, setNameDraft] = useState(activeProject?.name || '')
  useEffect(() => {
    setNameDraft(activeProject?.name || '')
  }, [activeProject?.id, activeProject?.name])
  const commitRename = () => {
    if (!activeProject) return
    const next = String(nameDraft || '').trim()
    if (!next) {
      setNameDraft(activeProject.name || '')
      return
    }
    if (next === activeProject.name) return
    useAppStore.getState().renameProject(activeProject.id, next)
    flashMicro?.('Name saved')
  }

  return (
    <div
      className="brand-layout surface-document define-studio define-dashboard view-enter"
      data-nav-dir={navDir}
    >
      <div className="brand-template-top">
        {activeProject && (
          <input
            className="define-project-name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitRename()
                e.currentTarget.blur()
              }
            }}
            aria-label="Project name"
          />
        )}
        <div className="define-title-row">
          <h1 className="page-title">
            {labelForStepId('define')}
          </h1>
          {/* Replaces the old "Save" button, which called a @deprecated action
              (the brief already autosaves on every keystroke) and toasted a raw
              i18n key. Sharing is the real action this page needs, and it was
              buried in the Tools dropdown. */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onOpenShare?.()}
          >
            Share / export
          </button>
        </div>
        {/* 2026 dressing: the 2px baseline under the title/deadline/share
            cluster. Its own full-width element because this band is an
            ordered flex (define-title-row is display:contents on desktop) —
            a border on any one child can't underline the whole row. */}
        <div className="define-title-rule" aria-hidden="true" />
        {/* The date input moved into the brief itself ("Is there a date this
            needs to be done by?"). What stays here is read-only: an ISO date
            carries no felt urgency, and this phrase is the only thing on the
            page that makes time concrete. Not a second control. */}
        {deadlineRelative && (
          <div className="define-deadline-inline">
            <span className="define-deadline-relative" aria-live="polite">
              {deadlineRelative}
            </span>
          </div>
        )}

        {/* Counts REQUIRED fields only, and names the endpoint. "X of 40"
            over mostly-optional fields is fabricated debt — a finished brief
            would read 5/40 forever. Silent once the needed ones are done;
            the ✓s on the fields say the rest. */}
        {requiredLeft > 0 && (
          <p className="define-needed-line">
            {requiredLeft === 1
              ? `1 thing needed before ${labelForStepId('research')}`
              : `${requiredLeft} things needed before ${labelForStepId('research')}`}
          </p>
        )}

        {/* Above the milestone list, not below it: the milestone rows are a
            quicker, more satisfying task than answering a brief question, and
            sitting them in front of the only anti-stall control on the page
            let the cheap task intercept the intended one. Its position is
            also fixed now — it used to slide down as milestones were added. */}
        <DefineStartHere detective={activeProject?.detective} />

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
                    {/* Name what went. Remove two inside the undo window and
                        two rows both reading "Removed" gave no way to tell
                        which Undo was which. */}
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
                    onChange={(e) => updateMilestone?.(m.id, 'label', e.target.value)}
                    placeholder="What happens"
                    aria-label="Milestone name"
                  />
                  <input
                    type="date"
                    className="define-input field-input detective-milestone-date"
                    value={m.date}
                    onChange={(e) => updateMilestone?.(m.id, 'date', e.target.value)}
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

        {/* Below the milestones, above the recent-task snapshot. Scope is
            agreed once and then referred back to, so it does not earn a place
            in front of the anti-stall control the way milestones do. */}
        <ScopePanel
          activeProject={activeProject}
          onOpenChapter={scrollToChapter}
          flashMicro={flashMicro}
        />

        {deskTasks.length > 0 && (
          <div className="define-secondary field-block">
            <label className="define-field-label">Recent tasks</label>
            <ul className="desk-snapshot">
              {deskTasks.slice(0, 5).map((t) => (
                <li key={t.id} className={t.completed ? 'is-done' : undefined}>
                  <span className="desk-snapshot-mark" aria-hidden="true">
                    {t.completed ? '✓' : '·'}
                  </span>
                  <span>{t.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div
        className="define-split"
        data-define-layout="form-only"
      >
        <div className="define-split-form" role="region" aria-label="Brief questions">
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
              projectDeadline={projectDeadline}
              setProjectDeadline={setProjectDeadline}
            />
          </Suspense>
        </div>
      </div>

      <div className="path-continue-row">
        <button
          type="button"
          className="btn btn-primary work-path-next"
          onClick={() => setActiveView?.(journeyNext?.view || 'studio')}
        >
          {`Next · ${journeyNext?.label || labelForStepId('research')}`}
        </button>
      </div>
    </div>
  )
}
