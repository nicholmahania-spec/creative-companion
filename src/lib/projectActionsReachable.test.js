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
 * and absent on touch — but the destination was never built. Tools → This
 * project held Share, Export, Hours and Discovery brief, and nothing else, so
 * on desktop Archive and Delete were reachable from NOWHERE. The comment
 * described an intention as though it were a fact, and nothing checked.
 *
 * This checks. If the sidebar control stays hidden, the Tools group must
 * carry the two actions; if someone un-hides the control later, that is the
 * other valid answer and this says so.
 */

const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(here, '..', p), 'utf8')
const app = read('App.jsx')
const shell = read('styles/shell.css')

/** The Tools → This project group, from its label to the end of the group. */
function projectToolsGroup(src) {
  const start = src.indexOf('id="tools-group-project"')
  expect(start, 'the "This project" tools group must exist').toBeGreaterThan(-1)
  return src.slice(start, start + 4000)
}

describe('project actions are reachable on desktop', () => {
  it('the sidebar row menu is still hidden in the app shell', () => {
    /* Not a change being asked for — just the premise this test depends on.
       If it stops being true, the assertion below is no longer the only way
       to reach the actions and can be revisited deliberately. */
    expect(shell).toContain(
      '.app-shell > .journey-sidebar .journey-project-row-menu-wrap'
    )
  })

  it('Tools → This project offers Archive and Delete', () => {
    const group = projectToolsGroup(app)
    expect(group).toContain('Archive project')
    expect(group).toContain('Delete project')
  })

  it('they call the existing handlers rather than a second delete path', () => {
    const group = projectToolsGroup(app)
    /* One deletion path in the app. `handleDeleteProjectById` is the one that
       carries the undo toast and the "Project not found" reporting. */
    expect(group).toContain('handleDeleteProjectById(')
    expect(group).toContain('archiveProject(')
    /* And no inline reimplementation sneaking in beside them. */
    expect(group).not.toContain('deleteProject(')
    expect(group).not.toMatch(/projects\.filter\(/)
  })

  it('both are real menu items, reachable by keyboard like their siblings', () => {
    const group = projectToolsGroup(app)
    const items = group.match(/role="menuitem"/g) || []
    /* Export, Hours, Discovery brief, Archive, Delete.
       Was six: "Share Strategy form" sat here too, a second door to the panel
       the Brief's own masthead already opens, and it still used the retired
       name Strategy (DESIGN_GRAMMAR G1). Removed in the wayfinding pass, so
       the inventory below is five.

       The count is incidental to what this test guards — that Archive and
       Delete are real `role="menuitem"` siblings rather than something only a
       mouse can reach. That guarantee, and the danger class beside it, are
       unchanged. */
    expect(items.length).toBeGreaterThanOrEqual(5)
    expect(group).toContain('more-menu-danger')
  })

  it('every tools item still carries an icon', () => {
    /* The group is a list of icon + label rows; a bare label would read as a
       different kind of thing. */
    const group = projectToolsGroup(app)
    const labels = ['Archive project', 'Delete project']
    for (const label of labels) {
      const at = group.indexOf(label)
      const before = group.slice(Math.max(0, at - 200), at)
      expect(before, `${label} needs an icon`).toContain('<HeaderIcon name=')
    }
  })
})

describe('the icons exist', () => {
  it('archive and trash are in the shared icon set', () => {
    const icons = read('components/HeaderIcon.jsx')
    expect(icons).toMatch(/^\s{2}archive: \(/m)
    expect(icons).toMatch(/^\s{2}trash: \(/m)
    /* Line art in currentColor, like every other icon here — an emoji would
       render as a colour platform glyph and break the flat grayscale set. */
    for (const name of ['archive', 'trash']) {
      const at = icons.indexOf(`  ${name}: (`)
      const body = icons.slice(at, at + 900)
      expect(body).toContain('stroke="currentColor"')
      expect(body).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
    }
  })
})
