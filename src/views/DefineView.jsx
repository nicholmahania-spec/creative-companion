/**
 * Define — split-screen studio: brief form (60%) + mood board (40%).
 *
 * ADHD: side-by-side kills “tab-switching amnesia.” Inspiration stays pinned
 * next to the questions so users don’t leave the page to look at refs and
 * forget what they were answering. Do not collapse to form-only.
 *
 * Calm chapter nav — no XP / game HUD.
 */
import { Suspense, lazy, useState, useMemo } from 'react'
import useAppStore from '../store/useAppStore'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
} from '../lib/i18n'
import { getDetectiveProgress } from '../lib/detectiveBrief'

const DetectiveSheet = lazy(() => import('./DetectiveSheet'))
const DefineMoodCanvas = lazy(() => import('./DefineMoodCanvas'))

/** Quiet chapter switcher — framed steps, desk tool not a game HUD */
function DefineChapterNav({ progress, openChapter, onSelectChapter }) {
  const { chapters = [], filledCount = 0, fieldTotal = 0 } = progress || {}
  const activeCh = chapters.find((c) => c.id === openChapter) || chapters[0]

  return (
    <nav className="define-chapter-frame" aria-label="Brief chapters">
      <ol className="define-chapter-nav-list">
        {chapters.map((ch) => {
          const active = openChapter === ch.id
          return (
            <li key={ch.id}>
              <button
                type="button"
                className={`define-chapter-nav-btn${active ? ' is-active' : ''}${
                  ch.complete ? ' is-complete' : ''
                }`}
                onClick={() => onSelectChapter?.(ch.id)}
                aria-current={active ? 'step' : undefined}
                aria-label={`${ch.title}: ${ch.done} of ${ch.total}${
                  ch.complete ? ', complete' : ''
                }`}
              >
                <span className="define-chapter-nav-num" aria-hidden="true">
                  {ch.complete ? '✓' : ch.num}
                </span>
                <span className="define-chapter-nav-label">{ch.title}</span>
                <span className="define-chapter-nav-count">
                  {ch.done}/{ch.total}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      {activeCh && (
        <p className="define-chapter-frame-now" role="status">
          <span className="define-chapter-frame-now-title">{activeCh.title}</span>
          <span className="define-chapter-frame-now-meta">
            {activeCh.done}/{activeCh.total}
            {` · ${filledCount}/${fieldTotal}`}
          </span>
        </p>
      )}
    </nav>
  )
}

export default function DefineView(props) {
  const {
    locale: localeProp = 'en',
    navDir = 'none',
    activeProject = null,
    nextTask = null,
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
    projectPills = null,
    projectDeadline = '',
    quickInput = '',
    setQuickInput,
    addQuickTask,
  } = props

  const locale = normalizeLocale(localeProp)
  const updateProjectBrief = useAppStore((s) => s.updateProjectBrief)
  const archiveProject = useAppStore((s) => s.archiveProject)
  const unarchiveProject = useAppStore((s) => s.unarchiveProject)
  const addMilestone = useAppStore((s) => s.addMilestone)
  const updateMilestone = useAppStore((s) => s.updateMilestone)
  const removeMilestone = useAppStore((s) => s.removeMilestone)

  const [metaFocus, setMetaFocus] = useState(null)
  const [openChapter, setOpenChapter] = useState('core')

  const progress = useMemo(
    () => getDetectiveProgress(activeProject?.detective),
    [activeProject?.detective]
  )

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
    // Local rename always sticks; cloud chip is separate if sync fails
    flashMicro?.(i18nT(locale, 'ui.projectRenamed') || 'Name saved')
  }

  return (
    <div
      className="project-view surface-desk view-enter define-studio define-dashboard"
      data-nav-dir={navDir}
    >
      <header className="define-dashboard-head">
        <div>
          <h1 className="page-title define-studio-title">
            {i18nT(locale, 'path.define')}
          </h1>
        </div>
      </header>

      <DefineChapterNav
        progress={progress}
        openChapter={openChapter}
        onSelectChapter={setOpenChapter}
      />

      {nextTask && (
        <div className="define-first-step-chip" role="status">
          <p className="panel-hint" style={{ margin: 0 }}>
            {i18nT(locale, 'ui.firstStepWaiting')}{' '}
            <strong>
              {String(nextTask.title).slice(0, 64)}
              {String(nextTask.title).length > 64 ? '…' : ''}
            </strong>
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveView('flow')}
          >
            {i18nT(locale, 'ui.openSketchStep') || 'Open Sketch step'}
          </button>
        </div>
      )}

      <div
        className="define-split"
        data-define-layout="form-board"
        title="Brief and mood board stay side by side"
      >
        {/* LEFT: questions — board stays visible so focus doesn’t leave the page */}
        <div className="define-split-form" aria-label="Brief questions">
          <section
            className={`define-meta-card${metaFocus ? ' has-focus' : ''}`}
            aria-label="Project essentials"
          >
            <div
              className={`define-meta-field${
                metaFocus === 'name' ? ' is-focused' : ''
              }${metaFocus && metaFocus !== 'name' ? ' is-dimmed' : ''}`}
            >
              <div className="define-field-label-row">
                <span className="define-field-icon define-icon-frame" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                    <path d="M4 7h16M4 12h16M4 17h10" />
                  </svg>
                </span>
                <label className="define-field-label" htmlFor="project-name">
                  Project name
                </label>
              </div>
              <div className="define-meta-row">
                <input
                  id="project-name"
                  className="define-input field-input"
                  value={projectNameDraft}
                  onChange={(e) => setProjectNameDraft(e.target.value)}
                  onFocus={() => setMetaFocus('name')}
                  onBlur={() => {
                    setMetaFocus(null)
                    commitProjectRename()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitProjectRename()
                      e.currentTarget.blur()
                    }
                  }}
                  placeholder="Client name"
                  aria-label="Project name"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={commitProjectRename}
                >
                  Save
                </button>
              </div>
            </div>

            <div
              className={`define-meta-field${
                metaFocus === 'brief' ? ' is-focused' : ''
              }${metaFocus && metaFocus !== 'brief' ? ' is-dimmed' : ''}`}
            >
              <div className="define-field-label-row">
                <span className="define-field-icon define-icon-spark" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2.5 13.8 9l6.7.3-5.2 4.2 1.8 6.5L12 16.5 6.9 20l1.8-6.5L3.5 9.3 10.2 9 12 2.5Z" />
                  </svg>
                </span>
                <label className="define-field-label" htmlFor="project-brief">
                  Brief / positioning
                </label>
              </div>
              <textarea
                id="project-brief"
                className="define-input field-input project-brief-input"
                rows={2}
                value={activeProject?.brief || ''}
                onChange={(e) => updateProjectBrief(e.target.value)}
                onFocus={() => setMetaFocus('brief')}
                onBlur={() => setMetaFocus(null)}
                placeholder="Goal + audience"
                aria-label="Brief and positioning"
              />
            </div>

            <div
              className={`define-meta-field define-meta-deadline${
                metaFocus === 'deadline' ? ' is-focused' : ''
              }${metaFocus && metaFocus !== 'deadline' ? ' is-dimmed' : ''}`}
            >
              <div className="define-field-label-row">
                <span className="define-field-icon define-icon-flag" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                    <path d="M6 21V4.5h.5c2.5 0 3.5 1.5 6 1.5s3.5-1.5 6-1.5V14c-2.5 0-3.5 1.5-6 1.5s-3.5-1.5-6-1.5H6" />
                  </svg>
                </span>
                <label className="define-field-label" htmlFor="proj-deadline-field">
                  Deadline
                </label>
              </div>
              <div className="deadline-edit-row">
                <input
                  id="proj-deadline-field"
                  type="date"
                  className="define-input field-input"
                  value={projectDeadline}
                  onChange={(e) => setProjectDeadline(e.target.value)}
                  onFocus={() => setMetaFocus('deadline')}
                  onBlur={() => setMetaFocus(null)}
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
          </section>

          <Suspense
            fallback={
              <div className="define-workbook define-workbook-loading">
                Loading brief builder…
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
              onContinue={() => setActiveView('studio')}
              continueLabel={tFormat(locale, 'ui.continueNext', {
                label: pathLabel(locale, 'research') || 'Research',
              })}
            />
          </Suspense>

          {projectPills && (
            <section className="define-secondary panel brand-section">
              {projectPills}
            </section>
          )}

          <a className="define-board-anchor" href="#define-mood-board">
            Mood board on this page
          </a>

          <details className="define-secondary define-admin">
            <summary>Project tools · desk · archive</summary>
            <div className="define-admin-body">
              <p className="panel-hint" style={{ marginTop: 0 }}>
                {deskTasks.filter((t) => !t.completed).length} open on desk
              </p>
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
                  Archive project
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
    </div>
  )
}
