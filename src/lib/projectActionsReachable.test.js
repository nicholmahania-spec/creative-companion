import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * AN ACTION HAS TO BE REACHABLE FROM SOMEWHERE.
 *
 * The sidebar's per-project `⋯` is hidden in the app shell:
 *
 *   .app-shell > .journey-sidebar .journey-project-row-menu-wrap {
 *     // Archive and Delete now live in Tools → This project.
 *     display: none !important;
 *   }
 *
 * The reasoning was right — a hover-only affordance is invisible at a glance
 * and absent on touch — but the destination was never built, so for a while
 * Archive and Delete were reachable from NOWHERE on desktop. The comment
 * described an intention as though it were a fact, and nothing checked.
 *
 * WHERE THEY LIVE NOW, AND WHY THIS FILE MOVED WITH THEM. The original
 * version of this test asserted the Tools menu, and said in as many words
 * that a different home was "the other valid answer". That is what happened:
 * the wayfinding pass moved project administration onto the Desk, beside the
 * project it acts on, because a drawer of cross-project tools was the wrong
 * shelf for three actions that only ever touch the project you are looking
 * at. So the assertions point at DeskView now.
 *
 * WHAT IS UNCHANGED, and is the actual guarantee: both actions exist, they
 * are real controls rather than hover-only affordances, deletion still goes
 * through the ONE handler that carries the undo toast, and Delete still
 * carries its own visual weight. None of that was relaxed to let the move
 * through — only the address changed.
 */

const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(here, '..', p), 'utf8')
const app = read('App.jsx')
const desk = read('views/DeskView.jsx')
const shell = read('styles/shell.css')

/** The Desk's project-administration panel, from its label to its close. */
function deskProjectPanel(src) {
  const start = src.indexOf('desk-project-actions')
  expect(start, 'the Desk project-actions panel must exist').toBeGreaterThan(-1)
  return src.slice(start, start + 2000)
}

describe('project actions are reachable on desktop', () => {
  it('the sidebar row menu is still hidden in the app shell', () => {
    /* Not a change being asked for — just the premise this test depends on.
       If it stops being true, the assertions below are no longer the only way
       to reach the actions and can be revisited deliberately. */
    expect(shell).toContain(
      '.app-shell > .journey-sidebar .journey-project-row-menu-wrap'
    )
  })

  it('the Desk offers Archive and Delete', () => {
    const panel = deskProjectPanel(desk)
    expect(panel).toContain('Archive project')
    expect(panel).toContain('Delete project')
  })

  it('they are real controls, not a hover-only affordance', () => {
    /* The failure this whole file exists for: an action you can only reach by
       hovering the right row is not reachable on touch and is invisible at a
       glance. These are ordinary buttons in a labelled panel. */
    const panel = deskProjectPanel(desk)
    const buttons = panel.match(/type="button"/g) || []
    expect(buttons.length).toBeGreaterThanOrEqual(3)
    expect(panel).toContain('aria-label="Project"')
    expect(panel).toContain('desk-action-danger')
  })

  it('they call the existing handlers rather than a second delete path', () => {
    const panel = deskProjectPanel(desk)
    /* The Desk calls props; App owns the implementations. Both halves are
       checked so a future inline reimplementation on either side fails here. */
    expect(panel).toContain('onArchiveProject')
    expect(panel).toContain('onDeleteProject')
    /* One deletion path in the app. `handleDeleteProjectById` is the one that
       carries the undo toast and the "Project not found" reporting. */
    expect(app).toContain('const deleteCurrentProject = () => {')
    expect(app).toContain('handleDeleteProjectById(')
    expect(app).toContain('const archiveCurrentProject = () => {')
    expect(app).toContain('archiveProject(')
    /* And no second delete sneaking in beside them. */
    expect(panel).not.toContain('deleteProject(')
    expect(panel).not.toMatch(/projects\.filter\(/)
  })

  it('Tools no longer carries project administration', () => {
    /* The point of the move: Tools is for tools. If an administration action
       reappears there, it is a second home for something that already has
       one — the duplication this pass removed. */
    const start = app.indexOf('id="tools-group-project"')
    expect(start, 'the "This project" tools group must exist').toBeGreaterThan(-1)
    const group = app.slice(start, start + 4000)
    for (const label of ['Archive project', 'Delete project', 'Hours &amp; invoice']) {
      const at = group.indexOf(label)
      /* Named in the note that records the move, never as a menu item. */
      if (at > -1) {
        const before = group.slice(Math.max(0, at - 400), at)
        expect(before, `${label} must not be a live Tools item`).not.toContain(
          'role="menuitem"'
        )
      }
    }
  })
})
