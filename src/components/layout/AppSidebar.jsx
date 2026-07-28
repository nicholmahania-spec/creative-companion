/**
 * AppSidebar — layout chrome extracted from App.jsx (memoized).
 * Receives a props bag `p` from App so the shell can split re-renders.
 */
import { memo, Suspense, lazy } from 'react'

import { JOURNEY_STEPS } from '../../lib/journey'
import { pathLabel, pathPlain, t as i18nT } from '../../lib/i18n'
import PathStepIcon from '../PathStepIcon'
import { pathStepHasContent } from '../../lib/journeyProgress'


function AppSidebar(p) {
  return (
    <>
    <nav
      className={`journey-sidebar${p.journeyActive ? '' : ' is-tools'}`}
      aria-label={i18nT(p.locale, 'pathAria')}
      /* Parked off-canvas on mobile, its 10 buttons stayed keyboard-
         reachable — Tab from the header walked into an invisible drawer.
         inert only applies below 768px, where the drawer is closed. */
      /* `true`, not '': React treats an empty string as false for boolean
         attributes, so the drawer was never actually inert and the bug
         this comment describes was still live. */
      inert={p.isMobileViewport && !p.navOpen ? true : undefined}
    >
        <div className="journey-projects-section" aria-label="Your p.projects">
          <div className="journey-projects-head">
            <span className="journey-projects-heading">Projects</span>
            <button
              type="button"
              className="journey-projects-add"
              onClick={() => {
                p.createNewProject()
                p.notifyAction('New project', 'project_create', {
                  label: 'New project',
                })
                p.setActiveView('project')
                p.setNavOpen(false)
              }}
              aria-label="New project"
              title="New project"
            >
              +
            </button>
          </div>
          <ul className="journey-projects-list">
            {p.projectsSummary.map(({ project: p, doneCount, nextGap }) => {
              const isActive = p.id === p.activeProjectId
              const menuOpen = p.openProjectMenuId === p.id
              // A named next action beats a ratio: "1/7" has to be decoded
              // into a meaning and still doesn't say what to do.
              const nextLabel = nextGap
                ? `Next: ${pathLabel(p.locale, nextGap.id) || nextGap.label}`
                : 'Ready to deliver'
              return (
                <li key={p.id} className="journey-project-row-wrap">
                  <button
                    type="button"
                    className={`journey-project-row${isActive ? ' is-active' : ''}`}
                    onClick={() => p.openProjectWhereLeftOff(id)}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className="journey-project-row-name">{p.name}</span>
                    <span className="journey-project-row-next">{nextLabel}</span>
                    <span className="journey-project-row-count">
                      {doneCount}/7
                    </span>
                  </button>
                  <div className="journey-project-row-menu-wrap">
                    <button
                      type="button"
                      className="journey-project-row-menu-btn"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      aria-label={`Project actions for “${p.name}”`}
                      title="Project actions"
                      onClick={(e) => {
                        e.stopPropagation()
                        p.setOpenProjectMenuId(menuOpen ? null : p.id)
                      }}
                    >
                      ⋯
                    </button>
                    {menuOpen && (
                      <div
                        className="journey-project-row-menu"
                        role="menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="project-menu-item"
                          disabled={p.activeProjects.length < 2}
                          onClick={() => {
                            const r = p.archiveProject(id)
                            if (!r.ok) p.flashToast(error || i18nT(p.locale, 'ui.archiveFail'))
                            p.setOpenProjectMenuId(null)
                          }}
                        >
                          Archive project
                        </button>
                        {p.activeProjects.length < 2 && (
                          <p className="project-menu-note">
                            Needs a second active project to switch to.
                          </p>
                        )}
                        <button
                          type="button"
                          role="menuitem"
                          className="project-menu-item project-menu-danger"
                          disabled={p.projects.length <= 1}
                          onClick={() => {
                            p.setOpenProjectMenuId(null)
                            p.handleDeleteProjectById(id, p.name)
                          }}
                        >
                          Delete project
                        </button>
                        {p.projects.length <= 1 && (
                          <p className="project-menu-note">
                            This is your only project.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          {p.archivedProjects.length > 0 && (
            <select
              className="journey-projects-restore"
              value={p.restoreSelect}
              onChange={(e) => {
                const id = e.target.value
                if (!id) return
                p.unarchiveProject(Number(id) || id)
                p.selectProject(Number(id) || id)
                p.setRestoreSelect('')
              }}
              aria-label="Restore archived project"
            >
              <option value="">Restore archived…</option>
              {p.archivedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <ol className="journey-bar-list">
          {JOURNEY_STEPS.map((step, idx) => {
            const active = p.journeyActive === step.id
            const label = pathLabel(p.locale, step.id) || step.label
            const plain = pathPlain(p.locale, step.id) || step.plain
            const pathCtx = {
              project: p.activeProject,
              moodItems: p.deskMood,
              tasks: p.deskTasks,
              sparkIndex: p.sparkIndex,
              palette: p.projectPalette,
            }
            const hasContent = pathStepHasContent(step.id, pathCtx)
            const prevLit =
              idx > 0 &&
              pathStepHasContent(JOURNEY_STEPS[idx - 1].id, pathCtx)
            return (
              <li
                key={step.id}
                className={`journey-bar-item${active ? ' is-active' : ''}${
                  hasContent && !active ? ' is-done' : ''
                }`}
              >
                {idx > 0 && (
                  <span
                    className={`journey-flow-link${prevLit ? ' is-lit' : ''}`}
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  className={`journey-step${active ? ' is-active' : ''}${
                    hasContent && !active ? ' is-done' : ''
                  }`}
                  onClick={() => {
                    p.setActiveView(step.view)
                    p.setNavOpen(false)
                    // Empty steps: land focus on a useful field
                    if (!hasContent) {
                      focusPathGapTarget(pathGapFocusSelector(step.id))
                    }
                  }}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`Step ${step.num}: ${label}. ${plain}${
                    hasContent ? ' Has content.' : ''
                  } Press ${step.num} to open.`}
                  title={`${plain} · key ${step.num}`}
                >
                  <span className="journey-node" aria-hidden="true">
                    {hasContent && !active ? (
                      <span className="journey-check">✓</span>
                    ) : (
                      <PathStepIcon id={step.id} />
                    )}
                  </span>
                  <span className="journey-num" aria-hidden="true">
                    {hasContent && !active ? '✓' : String(step.num).padStart(2, '0')}
                  </span>
                  <span className="journey-label">{label}</span>
                </button>
              </li>
            )
          })}
        </ol>
        {!p.journeyActive && (
          <span className="journey-tools-pill" role="status" aria-live="polite">
            Tools · {toolsLabelForView(p.activeView)}
          </span>
        )}
    </nav>

    <button
      type="button"
      className="nav-backdrop"
      aria-label="Close menu"
      tabIndex={p.navOpen ? 0 : -1}
      onClick={() => p.setNavOpen(false)}
    />

    </>
  )
}

export default memo(AppSidebar)
