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
import { Suspense, lazy, useMemo, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { normalizeLocale, t as i18nT } from '../lib/i18n'
import HeaderIcon from '../components/HeaderIcon'

const DetectiveSheet = lazy(() => import('./DetectiveSheet'))

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
    quickInput = '',
    setQuickInput,
    addQuickTask,
  } = props

  const locale = normalizeLocale(localeProp)

  const addMilestone = useAppStore((s) => s.addMilestone)
  const updateMilestone = useAppStore((s) => s.updateMilestone)
  const removeMilestone = useAppStore((s) => s.removeMilestone)

  const [openChapter, setOpenChapter] = useState('core')

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
            value={projectDeadline}
            onChange={(e) => setProjectDeadline(e.target.value)}
          />
          {deadlineRelative && (
            <span className="define-deadline-relative">{deadlineRelative}</span>
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
      </div>

      <div
        className="define-split"
        data-define-layout="form-only"
      >
        <div className="define-split-form" aria-label="Brief questions">
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
              addMilestone={addMilestone}
              updateMilestone={updateMilestone}
              removeMilestone={removeMilestone}
              splitMode
              openChapter={openChapter}
              onOpenChapter={setOpenChapter}
            />
          </Suspense>

          <div className="define-secondary field-block">
            <label className="field-label" htmlFor="define-desk-add">
              Add a task
            </label>
            <div className="capture-row">
              <input
                id="define-desk-add"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addQuickTask()}
                aria-label="Add a task"
              />
              <button type="button" onClick={addQuickTask} className="btn btn-secondary">
                Add
              </button>
            </div>
            {deskTasks.length > 0 && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
