/**
 * Define step — detective sheet, direction kits, project fields, readiness.
 */
import { Suspense, lazy } from 'react'
import useAppStore from '../store/useAppStore'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
} from '../lib/i18n'
import { JOURNEY_STEPS } from '../lib/journey'
import { formatShortDate } from '../lib/dates'

const DetectiveSheet = lazy(() => import('./DetectiveSheet'))

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
    applyBrandKit,
    BrandKitsGrid,
    setProjectDeadline,
    handleDeleteProject,
    renameProject,
    createNewProject,
    selectProject,
    goSystemSection,
    completedCount = 0,
    projectPills = null,
    projectDeadline = '',
    quickInput = '',
    setQuickInput,
    addQuickTask,
  } = props

  const locale = normalizeLocale(localeProp)
  const updateProjectBrief = useAppStore((s) => s.updateProjectBrief)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const setProjectPalette = useAppStore((s) => s.setProjectPalette)
  const archiveProject = useAppStore((s) => s.archiveProject)
  const unarchiveProject = useAppStore((s) => s.unarchiveProject)

  const activeProjects = (projects || []).filter((p) => !p.archived)
  const archivedProjects = (projects || []).filter((p) => p.archived)

  const commitProjectRename = () => {
    if (!activeProject) return
    const next = String(projectNameDraft || '').trim()
    if (!next || next === activeProject.name) {
      setProjectNameDraft?.(activeProject.name || '')
      return
    }
    renameProject?.(activeProject.id, next)
    flashToast?.(i18nT(locale, 'ui.projectRenamed'))
  }

  return (
          <div className="project-view surface-desk view-enter" data-nav-dir={navDir}>
            <div className="flow-top">
              <div>
                <h1 className="page-title">
                  {i18nT(locale, 'path.define')}
                </h1>
                <p className="page-sub">
                  {i18nT(locale, 'ui.projectSub')}
                </p>
              </div>
              <div className="finish-secondary-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveView('studio')}
                >
                  {tFormat(locale, 'ui.continueNext', {
                    label: pathLabel(locale, 'research') || 'Research',
                  })}
                </button>
              </div>
            </div>

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

            <Suspense fallback={null}>
              <DetectiveSheet
                detective={activeProject?.detective}
                updateDetective={updateDetective}
                applyDetectiveToBrief={applyDetectiveToBrief}
                flashToast={flashToast}
              />
            </Suspense>

            <section className="panel brand-section brand-kits-panel">
              <div className="brand-section-label">
                Quick-start colors &amp; voice
              </div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                Pick one to instantly fill in your colors, fonts, and voice
                on Design — this replaces anything you&apos;ve already set
                there.
              </p>
              <Suspense
                fallback={
                  <p className="panel-hint" style={{ margin: 0 }}>
                    Loading kits…
                  </p>
                }
              >
                <BrandKitsGrid onPick={applyBrandKit} />
              </Suspense>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">
                {i18nT(locale, 'ui.pathReadiness')}
              </div>
              {(() => {
                const det = activeProject?.detective || {}
                const checks = [
                  !!(det.goal?.trim() || activeProject?.brief?.trim()),
                  !!det.audience?.trim(),
                  deskMood.some((m) => m.inPack),
                  !!activeProject?.tagline?.trim(),
                  (projectPalette || []).length >= 2,
                ]
                return (
                  <>
                    <ul className="pack-ready-list project-ready-list">
                      <li className={checks[0] ? 'is-ok' : 'is-miss'}>
                        {checks[0] ? (
                          <span>✓ One-sentence goal (detective or brief)</span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() =>
                              document.getElementById('detective-goal')?.focus()
                            }
                          >
                            ○ One-sentence goal — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[1] ? 'is-ok' : 'is-miss'}>
                        {checks[1] ? (
                          <span>✓ Audience named</span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() =>
                              document
                                .getElementById('detective-audience')
                                ?.focus()
                            }
                          >
                            ○ Audience — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[2] ? 'is-ok' : 'is-miss'}>
                        {checks[2] ? (
                          <span>
                            ✓ Starred leave-behind pins (
                            {deskMood.filter((m) => m.inPack).length}/6)
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() => setActiveView('studio')}
                          >
                            ○ Star pins on Research — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[3] ? 'is-ok' : 'is-miss'}>
                        {checks[3] ? (
                          <span>✓ Tagline</span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() => goSystemSection('essentials')}
                          >
                            ○ Tagline — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[4] ? 'is-ok' : 'is-miss'}>
                        {checks[4] ? (
                          <span>✓ Palette</span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() => goSystemSection('colors')}
                          >
                            ○ Palette — fix
                          </button>
                        )}
                      </li>
                    </ul>
                    <p className="panel-hint" style={{ marginBottom: '0.85rem' }}>
                      {completedCount}/{deskTasks.length || 0} steps done · detective
                      sheet feeds brief &amp; brand book.
                    </p>
                  </>
                )
              })()}
              {projectPills}
            </section>
            <section className="panel brand-section">
              <div className="brand-section-label">Active project</div>
              <div className="panel-head" style={{ marginBottom: '0.85rem' }}>
                <div>
                  <p className="panel-hint" style={{ marginBottom: '0.35rem' }}>
                    {deskTasks.filter((t) => !t.completed).length} open on desk
                  </p>
                </div>
              </div>

              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="project-name">
                  Name
                </label>
                <div className="capture-row">
                  <input
                    id="project-name"
                    className="field-input"
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
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={commitProjectRename}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="project-brief">
                  Brief / positioning
                </label>
                <textarea
                  id="project-brief"
                  className="field-input project-brief-input"
                  rows={4}
                  value={activeProject?.brief || ''}
                  onChange={(e) => updateProjectBrief(e.target.value)}
                  placeholder="Who is it for? What should they feel or do? One clear goal."
                  aria-label="Brief and positioning"
                />
                <p className="panel-hint" style={{ marginTop: '0.35rem' }}>
                  Feeds Design positioning and the pack leave-behind.
                </p>
              </div>

              <div className="project-actions-row" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
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
                      /* quiet restore */
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

              <div className="field-block" style={{ marginBottom: '1rem' }}>
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
                    className="btn btn-ghost"
                    onClick={() => setActiveView('calendar')}
                  >
                    Calendar
                  </button>
                </div>
              </div>

              <details className="project-quick-add" style={{ marginBottom: '1.15rem' }}>
                <summary className="text-link">Quick add to desk</summary>
                <div className="capture-row" style={{ marginTop: '0.5rem' }}>
                  <input
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addQuickTask()}
                    placeholder="Quick add to this desk…"
                    aria-label="Add to desk"
                  />
                  <button
                    type="button"
                    onClick={addQuickTask}
                    className="btn btn-secondary"
                  >
                    Add
                  </button>
                </div>
              </details>

              <div className="project-danger-zone">
                <button
                  type="button"
                  className="btn btn-ghost settings-danger"
                  disabled={projects.length <= 1}
                  onClick={handleDeleteProject}
                >
                  Delete this project
                </button>
                {projects.length <= 1 && (
                  <span className="panel-hint" style={{ margin: 0 }}>
                    Keep at least one project
                  </span>
                )}
              </div>
            </section>

            <section className="panel panel-compact">
              <p className="list-heading">On the desk</p>
              {deskTasks.length === 0 ? (
                <p className="empty-state-body" style={{ margin: 0 }}>
                  Nothing open. Add an idea above.
                </p>
              ) : (
                <ul className="desk-snapshot">
                  {deskTasks.slice(0, 5).map((t) => (
                    <li
                      key={t.id}
                      className={t.completed ? 'is-done' : undefined}
                    >
                      <span className="desk-snapshot-mark" aria-hidden="true">
                        {t.completed ? '✓' : '·'}
                      </span>
                      <span>{t.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
  )
}
