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
import { DETECTIVE_CHAPTERS, getDetectiveProgress } from '../lib/detectiveBrief'
import DefineStartHere from '../components/DefineStartHere'

const DetectiveSheet = lazy(() => import('./DetectiveSheet'))


export default function DefineView(props) {
  const {
    locale: localeProp = 'en',
    navDir = 'none',
    activeProject = null,
    deskTasks = [],
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

        {/* Above the milestone list, not below it: the milestone rows are a
            quicker, more satisfying task than answering a brief question, and
            sitting them in front of the only anti-stall control on the page
            let the cheap task intercept the intended one. Its position is
            also fixed now — it used to slide down as milestones were added. */}
        <DefineStartHere
          detective={activeProject?.detective}
          onOpenChapter={setOpenChapter}
        />

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
              showStartHere={false}
              projectDeadline={projectDeadline}
              setProjectDeadline={setProjectDeadline}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
