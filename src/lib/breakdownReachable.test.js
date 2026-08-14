import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The Break down wizard has a door.
 *
 * THE FAILURE THIS GUARDS, stated exactly, because it is a class and not an
 * incident. `openBreakdown` is the only function that sets `showBreakdown` to
 * true. A screen rebuild deleted both buttons that called it and relocated
 * neither — and after that the only reference left in the whole app was the
 * wizard's own "start over" prop, which can only run once the wizard is
 * already open. So a lazy-loaded, fully working, five-screen tool with its
 * own focus trap, its own Escape handling and its own store action became
 * unreachable by every route: no stop, no menu, no shortcut, no link.
 *
 * Nothing caught it. The build was clean. The unit suite was green. The
 * component still rendered perfectly when something opened it, and nothing did.
 * That is what an orphaned feature looks like from the inside, and it is worth
 * a cheap string test: the only structural signature is "the sole writer of a
 * state flag has lost its last live caller".
 */

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const app = read('src/App.jsx')
const outlet = read('src/app/MainOutlet.jsx')
const desk = read('src/views/DeskView.jsx')

describe('the breakdown wizard is reachable', () => {
  it('has exactly one function that opens it', () => {
    /* One writer, so there is one thing to keep a caller for — and so a
       second wizard cannot appear beside the first. */
    const writers = app.match(/setShowBreakdown\(true\)/g) || []
    expect(writers).toHaveLength(1)
  })

  it('that function is called from somewhere other than the wizard itself', () => {
    /* The exact shape of the regression: every remaining mention was
       `onRestart={openBreakdown}`, inside the block that only renders when the
       wizard is already open. A closed loop reads as "still referenced". */
    const mentions = (app.match(/openBreakdown/g) || []).length
    const selfReferences = (app.match(/onRestart=\{openBreakdown\}/g) || []).length
    const declaration = 1
    expect(mentions - selfReferences - declaration).toBeGreaterThan(0)
  })

  it('is wired from App through the outlet to the Desk', () => {
    expect(app).toContain('openBreakdown={openBreakdown}')
    expect(outlet).toContain('onBreakDownProject={openBreakdown}')
    expect(desk).toContain('onBreakDownProject')
  })

  it('puts the trigger in the Desk Project panel, beside the other project actions', () => {
    const panel = desk.slice(desk.indexOf('desk-project-actions'))
    const slice = panel.slice(0, 2200)
    expect(slice).toContain('Break down project')
    expect(slice).toContain('onBreakDownProject')
    /* Still beside the actions it was filed with, not off on its own. */
    expect(slice).toContain('Archive project')
    expect(slice).toContain('Delete project')
  })

  it('does not hide behind a disclosure', () => {
    /* The entry point it replaces was inside a per-step `<details>`, which is
       the reason it could not be reached on a project with no steps. */
    const panel = desk.slice(desk.indexOf('desk-project-actions'))
    const slice = panel.slice(0, 2200)
    expect(slice).not.toContain('<details')
    expect(slice).not.toContain('<summary')
  })

  it('renders where a stage cannot hide it', () => {
    /* It commits its steps and then navigates, which opens a stage. Rendered
       inside `#root` it would vanish mid-run at exactly the moment it reports
       what it just did. */
    const i = app.indexOf('<TaskBreakdown')
    const opened = app.lastIndexOf('<OverlayLayer', i)
    const closed = app.lastIndexOf('</OverlayLayer>', i)
    expect(opened).toBeGreaterThan(-1)
    expect(opened).toBeGreaterThan(closed)
  })
})
