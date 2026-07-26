/**
 * Define — brief form studio.
 *
 * NOTE: this used to be a 60/40 split with a mood board pinned beside the
 * questions, and the header comment still claimed that was an ADHD guarantee
 * long after `data-define-layout` was hardcoded to "form-only" and the board
 * stopped rendering at all. The claim is removed rather than left lying:
 * restoring the board is a separate, deliberate piece of work.
 *
 * Calm chapter nav — no XP / game HUD.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { normalizeLocale, t as i18nT } from '../lib/i18n'
import HeaderIcon from '../components/HeaderIcon'
import { DETECTIVE_CHAPTERS, getDetectiveProgress } from '../lib/detectiveBrief'

const DetectiveSheet = lazy(() => import('./DetectiveSheet'))

/** How long a removed milestone stays undoable before the delete actually commits. */
const MILESTONE_UNDO_MS = 8000

export default function DefineView(props) {
  const {
    locale: localeProp = 'en',
    navDir = 'none',
    activeProject = null,
    deskTasks = [],
    setActiveView,
    updateDetective,
    onOpenShare,
    setProjectDeadline,
    projectDeadline = '',
  } = props

  const locale = normalizeLocale(localeProp)

  const addMilestone = useAppStore((s) => s.addMilestone)
  const updateMilestone = useAppStore((s) => s.updateMilestone)
  const removeMilestone = useAppStore((s) => s.removeMilestone)
  const setDefineOpenChapter = useAppStore((s) => s.setDefineOpenChapter)

  const projectId = activeProject?.id
  const storedOpenChapter = activeProject?.defineOpenChapter

  /** Unset for a project → open the first chapter that still needs a
   * required answer, or the first chapter overall once everything required
   * is filled. Once the user taps a chapter, the store field takes over. */
  const openChapter = useMemo(() => {
    if (storedOpenChapter) return storedOpenChapter
    const progress = getDetectiveProgress(activeProject?.detective)
    const firstIncomplete = progress.chapters.find((c) => !c.requiredDone)
    return firstIncomplete ? firstIncomplete.id : DETECTIVE_CHAPTERS[0].id
  }, [storedOpenChapter, activeProject?.detective])

  const setOpenChapter = useCallback(
    (chapterId) => {
      if (projectId) setDefineOpenChapter(projectId, chapterId)
    },
    [projectId, setDefineOpenChapter]
  )

  const milestones = activeProject?.detective?.milestones || []
  /** Milestone rows queued for removal: id -> timeout handle. Purely
   * transient UI state — never belongs in the store. */
  const [pendingRemovals, setPendingRemovals] = useState({})
  const pendingRemovalsRef = useRef(pendingRemovals)
  pendingRemovalsRef.current = pendingRemovals

  const scheduleRemoveMilestone = useCallback(
    (id) => {
      const timeoutId = setTimeout(() => {
        removeMilestone?.(id)
        setPendingRemovals((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }, MILESTONE_UNDO_MS)
      setPendingRemovals((prev) => ({ ...prev, [id]: timeoutId }))
    },
    [removeMilestone]
  )

  const undoRemoveMilestone = useCallback((id) => {
    setPendingRemovals((prev) => {
      const timeoutId = prev[id]
      if (timeoutId) clearTimeout(timeoutId)
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // If this view unmounts with removals still pending, commit them now
  // instead of leaking the timers (and instead of silently un-deleting).
  useEffect(() => {
    return () => {
      Object.keys(pendingRemovalsRef.current).forEach((id) => {
        clearTimeout(pendingRemovalsRef.current[id])
        removeMilestone?.(id)
      })
    }
  }, [removeMilestone])

  /** Plain-language deadline beside the date input. A read-only signal, not
   * a second control — an ISO date carries no felt urgency. */
  const deadlineRelative = useMemo(() => {
    if (!projectDeadline) return ''
    const due = new Date(`${projectDeadline}T00:00:00`)
    if (Number.isNaN(due.getTime())) return ''
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = Math.round((due - today) / 86400000)
    if (days < -1) return 'Overdue'
    if (days === -1) return 'Was due yesterday'
    if (days === 0) return 'Due today'
    if (days === 1) return 'Due tomorrow'
    if (days <= 6) return 'Due this week'
    if (days <= 13) return 'Due next week'
    if (days <= 31) return 'Due in a few weeks'
    return 'Due later on'
  }, [projectDeadline])

  return (
    <div
      className="brand-layout surface-document define-studio define-dashboard view-enter"
      data-nav-dir={navDir}
    >
      <div className="brand-template-top">
        <div className="define-title-row">
          <h1 className="page-title">
            {i18nT(locale, 'path.define')}
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
        <div className="define-deadline-inline">
          <label htmlFor="proj-deadline-field">Deadline</label>
          <input
            id="proj-deadline-field"
            type="date"
            className="field-input"
            aria-describedby="proj-deadline-relative"
            value={projectDeadline}
            onChange={(e) => setProjectDeadline(e.target.value)}
          />
          {deadlineRelative && (
            <span
              id="proj-deadline-relative"
              className="define-deadline-relative"
              aria-live="polite"
            >
              {deadlineRelative}
            </span>
          )}
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setActiveView('calendar')}
            title="Calendar"
            aria-label="Calendar"
          >
            <HeaderIcon name="calendar" />
          </button>
        </div>

        <div className="define-milestones-compact">
          <span className="define-field-label">Milestones</span>
          <div className="define-milestones-list">
            {milestones.map((m) => {
              const isPending = Boolean(pendingRemovals[m.id])
              if (isPending) {
                return (
                  <div key={m.id} className="detective-milestone-row is-pending-removal">
                    <span>Removed</span>
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
              openChapter={openChapter}
              onOpenChapter={setOpenChapter}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
