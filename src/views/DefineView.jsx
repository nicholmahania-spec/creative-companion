/**
 * Define — split-screen studio: brief form (60%) + mood board (40%).
 *
 * ADHD: side-by-side kills “tab-switching amnesia.” Inspiration stays pinned
 * next to the questions so users don’t leave the page to look at refs and
 * forget what they were answering. Do not collapse to form-only.
 *
 * Calm chapter nav — no XP / game HUD.
 */
import { Suspense, lazy, useMemo, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { normalizeLocale, t as i18nT } from '../lib/i18n'
import { trackFeatureUsage } from '../lib/analytics'

const DetectiveSheet = lazy(() => import('./DetectiveSheet'))

export default function DefineView(props) {
  const {
    locale: localeProp = 'en',
    navDir = 'none',
    activeProject = null,
    deskTasks = [],
    projectNameDraft = '',
    setProjectNameDraft,
    setActiveView,
    flashMicro,
    updateDetective,
    applyDetectiveToBrief,
    setProjectDeadline,
    renameProject,
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

  const commitProjectRename = () => {
    if (!activeProject) return
    const next = String(projectNameDraft || '').trim()
    if (!next) {
      setProjectNameDraft?.(activeProject.name || '')
      return
    }
    if (next === activeProject.name) return
    renameProject?.(activeProject.id, next)
    trackFeatureUsage('project_rename', { projectId: activeProject.id, projectName: next })
    flashMicro?.(i18nT(locale, 'ui.projectRenamed') || 'Name saved')
  }

  /** Save composes detective answers into project.brief. Deliberately does
   * not navigate anywhere — moving to Research stays the user's own call
   * (sidebar), never something a "Save" click pushes them into. */
  const saveBrief = () => {
    applyDetectiveToBrief?.()
    flashMicro?.(i18nT(locale, 'ui.briefSaved') || 'Saved')
  }

  return (
    <div
      className="brand-layout surface-document define-studio define-dashboard view-enter"
      data-nav-dir={navDir}
    >
      <div className="brand-template-top">
        <div>
          <h1 className="page-title">
            {i18nT(locale, 'path.define')}
          </h1>
          <input
            id="project-name"
            className="define-name-inline"
            value={projectNameDraft}
            onChange={(e) => setProjectNameDraft(e.target.value)}
            onBlur={commitProjectRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitProjectRename()
                e.currentTarget.blur()
              }
            }}
            placeholder="Project name"
            aria-label="Project name"
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={saveBrief}>
          Save
        </button>
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
            <label className="field-label" htmlFor="proj-deadline-field">
              Deadline
            </label>
            <div className="deadline-edit-row">
              <input
                id="proj-deadline-field"
                type="date"
                className="field-input"
                value={projectDeadline}
                onChange={(e) => setProjectDeadline(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveView('calendar')}
              >
                Calendar
              </button>
            </div>
          </div>

          <div className="define-secondary field-block">
            <label className="field-label" htmlFor="define-desk-add">
              Add a step to this project
            </label>
            <div className="capture-row">
              <input
                id="define-desk-add"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addQuickTask()}
                aria-label="Add a step to this project"
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
