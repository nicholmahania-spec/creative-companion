/**
 * Define — split-screen studio: brief form (60%) + mood board (40%).
 *
 * ADHD: side-by-side kills “tab-switching amnesia.” Inspiration stays pinned
 * next to the questions so users don’t leave the page to look at refs and
 * forget what they were answering. Do not collapse to form-only.
 *
 * Calm chapter nav — no XP / game HUD.
 */
import { Suspense, lazy, useState } from 'react'
import useAppStore from '../store/useAppStore'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
} from '../lib/i18n'
import useIsMobile from '../lib/useIsMobile'
import { trackWorkflowTransition, trackFeatureUsage } from '../lib/analytics'

const DetectiveSheet = lazy(() => import('./DetectiveSheet'))
const DefineMoodCanvas = lazy(() => import('./DefineMoodCanvas'))

export default function DefineView(props) {
  const {
    locale: localeProp = 'en',
    navDir = 'none',
    activeProject = null,
    deskMood = [],
    deskTasks = [],
    projectPalette = [],
    projects = [],
    projectNameDraft = '',
    setProjectNameDraft,
    setActiveView,
    flashToast,
    flashMicro,
    updateDetective,
    applyDetectiveToBrief,
    setProjectDeadline,
    handleDeleteProject,
    renameProject,
    selectProject,
    projectDeadline = '',
    quickInput = '',
    setQuickInput,
    addQuickTask,
  } = props

  const locale = normalizeLocale(localeProp)
  const archiveProject = useAppStore((s) => s.archiveProject)
  const unarchiveProject = useAppStore((s) => s.unarchiveProject)
  const addMilestone = useAppStore((s) => s.addMilestone)
  const updateMilestone = useAppStore((s) => s.updateMilestone)
  const removeMilestone = useAppStore((s) => s.removeMilestone)

  const [openChapter, setOpenChapter] = useState('core')
  /** Mobile only: 'form' inputs vs 'refs' mood board — one at a time */
  const [mobilePane, setMobilePane] = useState('form')
  const isMobile = useIsMobile()

  const activeProjects = (projects || []).filter((p) => !p.archived)
  const archivedProjects = (projects || []).filter((p) => p.archived)

  const commitProjectRename = () => {
    if (!activeProject) return
    const next = String(projectNameDraft || '').trim()
    if (!next) {
      setProjectNameDraft?.(activeProject.name || '')
      return
    }
    if (next === activeProject.name) return
    renameProject?.(activeProject.id, next)
    trackFeatureUsed('project_rename', { projectId: activeProject.id, projectName: next })
    flashMicro?.(i18nT(locale, 'ui.projectRenamed') || 'Name saved')
  }

  /** One brief instrument: detective answers compose project.brief on continue */
  const goResearch = () => {
    applyDetectiveToBrief?.()
    setActiveView('studio')
  }

  return (
    <div
      className="project-view surface-desk view-enter define-studio define-dashboard"
      data-nav-dir={navDir}
    >
      <header className="define-dashboard-head">
        <div className="define-head-row">
          <h1 className="page-title define-studio-title">
            {i18nT(locale, 'path.define')}
          </h1>
          <input
            id="project-name"
            className="define-input field-input define-name-inline"
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
      </header>

      <div
        className="define-split"
        data-define-layout="form-board"
        data-mobile-pane={mobilePane}
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
              applyDetectiveToBrief={applyDetectiveToBrief}
              flashToast={flashToast}
              addMilestone={addMilestone}
              updateMilestone={updateMilestone}
              removeMilestone={removeMilestone}
              splitMode
              openChapter={openChapter}
              onOpenChapter={setOpenChapter}
              onContinue={goResearch}
              continueLabel={tFormat(locale, 'ui.continueNext', {
                label: pathLabel(locale, 'research') || 'Research',
              })}
            />
          </Suspense>

          <details className="define-secondary define-admin">
            <summary>Tools</summary>
            <div className="define-admin-body">
              <div className="field-block" style={{ marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveView('define-focus')}
                >
                  Try Focus Mode (beta)
                </button>
              </div>
              <div className="field-block" style={{ marginBottom: '0.75rem' }}>
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
              <div className="project-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!activeProject || activeProjects.length < 2}
                  onClick={() => {
                    if (!activeProject) return
                    const r = archiveProject(activeProject.id)
                    if (!r.ok) flashToast(r.error || i18nT(locale, 'ui.archiveFail'))
                  }}
                >
                  Archive
                </button>
                {archivedProjects.length > 0 && (
                  <select
                    className="header-project-select"
                    defaultValue=""
                    onChange={(e) => {
                      const id = e.target.value
                      if (!id) return
                      unarchiveProject(Number(id) || id)
                      selectProject(Number(id) || id)
                      e.target.value = ''
                    }}
                    aria-label="Restore archived project"
                  >
                    <option value="">Restore archived…</option>
                    {archivedProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <details className="project-quick-add">
                <summary className="text-link">Quick add to desk</summary>
                <div className="capture-row" style={{ marginTop: '0.5rem' }}>
                  <input
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addQuickTask()}
                    aria-label="Add to desk"
                  />
                  <button type="button" onClick={addQuickTask} className="btn btn-secondary">
                    Add
                  </button>
                </div>
              </details>
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
              <div className="project-danger-zone">
                <button
                  type="button"
                  className="btn btn-ghost settings-danger"
                  disabled={projects.length <= 1}
                  onClick={handleDeleteProject}
                >
                  Delete this project
                </button>
              </div>
            </div>
          </details>
        </div>

        {/* RIGHT: pinned inspiration — same project pins as Research */}
        <div className="define-split-mood" aria-label="Inspiration beside the brief">
          <Suspense fallback={<div className="define-mood define-mood-loading">Loading board…</div>}>
            <DefineMoodCanvas
              deskMood={deskMood}
              projectId={activeProject?.id}
              projectPalette={projectPalette}
              flashToast={flashToast}
              flashMicro={flashMicro}
            />
          </Suspense>
        </div>
      </div>

      {/* Mobile-only: toggle focus between inputs and refs (no cramped split) */}
      {isMobile && (
        <nav className="define-mobile-tabs" aria-label="Define panel switch">
          <button
            type="button"
            className={`define-mobile-tab${mobilePane === 'form' ? ' is-active' : ''}`}
            onClick={() => setMobilePane('form')}
            aria-pressed={mobilePane === 'form'}
          >
            <span aria-hidden="true">📝</span> Form
          </button>
          <button
            type="button"
            className={`define-mobile-tab${mobilePane === 'refs' ? ' is-active' : ''}`}
            onClick={() => setMobilePane('refs')}
            aria-pressed={mobilePane === 'refs'}
          >
            <span aria-hidden="true">🖼</span> Refs
          </button>
        </nav>
      )}
    </div>
  )
}
