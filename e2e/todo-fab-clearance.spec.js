import { test, expect } from '@playwright/test'
import { gotoView, pathNav, skipIfCloud, stepByIdIn, unlockAndOnboard } from './helpers.js'

/**
 * The To-do pill must never take a tap that belonged to something underneath.
 *
 * THE ORIGINAL DEFECT, kept because it is the reason any of this exists. On a
 * 390x844 phone the pill sat on `Next · Assets` on Touchpoints and on `Back to
 * the desk` on Assets — and the second was not a mid-scroll accident: `Back to
 * the desk` lives in `.path-continue-row`, which is `position: sticky;
 * bottom: 0`, so it was under the pill at every scroll offset on that view.
 * Nothing caught it because nothing looks at where two fixed things land
 * relative to each other; both render perfectly. `src/lib/fabClearance.js`
 * is the fix, and its header carries the alternatives that were rejected.
 *
 * THE PREDICATE MATTERS, and the obvious one is wrong. Asking whether
 * `elementsFromPoint` returns any interactive element under the pill
 * over-reports badly: that call returns the whole stack, including controls
 * that some third element already covers. The brief form scrolls live inputs
 * behind an opaque `position: sticky` footer, and those are not reachable by a
 * finger with or without the pill. So the assertion is the real question: take
 * the topmost element that is not the pill, resolve it to the control that
 * would receive its click, and require that there is none.
 *
 * ── WHY THIS SPEC MOVED OFF THE PATH STOPS (2026-08-15) ────────────────────
 *
 * It used to walk `sketch` and `deliver` and require the pill to be visible
 * and pressable there. Both were ordinary shell views when that was written.
 * They are Workroom stages now, and a stage sets `#root` to `inert` +
 * `aria-hidden` + `visibility: hidden` (src/components/Workroom.jsx). The pill
 * renders inside `#root`, deliberately — `lib/overlayHostContract.test.js`
 * pins it OUT of the transient layer, because a launcher that opens an inert
 * panel is worse than no launcher.
 *
 * So the assertions had stopped describing the product. MEASURED on
 * `main@e938779`, at 320 / 390 / 430, on all seven stops:
 *
 *     visibility: hidden · pressable: false · stolen: 0
 *
 * `stolen: 0` is the part that matters. The pill was never overlapping
 * anything on those stops — it was invisible, which is the immersive contract
 * working. The spec had been reporting a hidden shell as a clearance failure.
 *
 * A SECOND STALENESS, in the sampling itself. The loop scrolled the window and
 * called it "every rest position". On a stage `.cc-stage` is `position: fixed`
 * with `overflow: hidden` and `.cc-stage-plane` is the scroller, so
 * `documentElement.scrollHeight - innerHeight` is **0** and all eleven stops
 * sampled one identical state. The tests below scroll the window because the
 * surfaces they visit genuinely are window-scrolled — `shell.css` clears
 * `overflow-x` from html/body/#root/.app precisely so that stays true.
 *
 * ── THE CONTRACT THIS SPEC NOW HOLDS ───────────────────────────────────────
 *
 *   1. Workroom stages hide the pill ON PURPOSE. That is asserted here, not
 *      worked around, so that "the FAB is missing inside Identity" can never
 *      again be mistaken for a bug and fixed by moving it into the stage.
 *   2. The compensating mechanism is the stage edge's To-do count, from
 *      `lib/stageSignals.js`: "Noticing is the job; acting is one Escape
 *      away." Asserted, so removing it would fail here.
 *   3. The clearance invariant applies where the pill is LIVE — Desk and Home,
 *      which are window-scrolled and carry real controls in the pill's column.
 *      That is where the original defect could recur, and it is now the only
 *      place this spec looks for it.
 *
 * IF YOU ARE HERE BECAUSE THE PILL IS MISSING INSIDE A STAGE: that is the
 * design. See `lib/stageSignals.js` and `Workroom.jsx` before changing
 * anything.
 */

const INTERACTIVE =
  'a[href], button, input, select, textarea, summary, [role="button"], [role="link"]'

/** Walk every point of the pill's rect and report anything it would rob. */
const AUDIT = (selector) => {
  const fab = document.querySelector('.todo-fab')
  if (!fab) return { missing: true }
  const cs = getComputedStyle(fab)
  const r = fab.getBoundingClientRect()
  const stolen = new Set()
  for (let x = Math.ceil(r.left) + 1; x < r.right - 1; x += 3) {
    for (let y = Math.ceil(r.top) + 1; y < r.bottom - 1; y += 3) {
      const stack = document.elementsFromPoint(x, y)
      const overPill = stack.some((el) => el === fab || fab.contains(el))
      if (!overPill) continue
      const beneath = stack.find((el) => el !== fab && !fab.contains(el))
      const owner = beneath && beneath.closest(selector)
      if (owner) {
        stolen.add(
          `${owner.tagName}.${String(owner.className).slice(0, 40)} "${(owner.textContent || '').trim().slice(0, 24)}"`
        )
      }
    }
  }
  const centre = document.elementFromPoint(
    Math.round(r.left + r.width / 2),
    Math.round(r.top + r.height / 2)
  )
  return {
    stolen: [...stolen],
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    lift:
      parseFloat(cs.getPropertyValue('--todo-fab-lift')) || 0,
    pressable: !!centre && (centre === fab || fab.contains(centre)),
    labelled: (fab.textContent || '').trim().includes('To-do'),
    onScreen:
      cs.display !== 'none' &&
      cs.visibility !== 'hidden' &&
      Number(cs.opacity) > 0.9 &&
      r.top > 0 &&
      r.bottom < window.innerHeight + 1,
    named: (fab.getAttribute('aria-label') || '').toLowerCase().includes('to-do'),
  }
}

test.describe('To-do pill clearance', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  /* Desk and Home are the surfaces where the pill exists at a phone width:
     both are ordinary shell views, both scroll the window, and both carry
     enough controls in the pill's column for the seating search to have real
     work to do. Desk is listed first because it is the denser of the two —
     measured 5-13 interactive candidates in the column against Home's 5-8. */
  for (const view of ['desk', 'home']) {
    test(`the pill steals nothing on "${view}", at every rest position`, async ({
      page,
    }) => {
      const gate = await unlockAndOnboard(page, { name: 'FAB Clearance' })
      skipIfCloud(test, gate)

      await gotoView(page, view)
      await page.waitForTimeout(800)

      /* The window, and this is checked rather than assumed: if the shell ever
         grows a scroll container the way the stage has one, sampling the
         window would silently stop moving the page and every stop below would
         re-measure the same state — which is exactly the failure that made
         the previous version of this spec meaningless. */
      const max = await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      )
      expect(
        max,
        `"${view}" must scroll the window for the rest positions below to be ` +
          'distinct; if this is 0 the surface has taken scrolling over and ' +
          'this spec needs to scroll whatever now owns it'
      ).toBeGreaterThan(0)

      const stops = 10
      const failures = []
      const lifts = []
      for (let i = 0; i <= stops; i++) {
        const y = Math.round((max * i) / stops)
        await page.evaluate((to) => window.scrollTo(0, to), y)
        // Past the 90ms re-seat fuse and the 450ms expand, so this is the page
        // genuinely at rest — which is the only state a tap happens in.
        await page.waitForTimeout(750)
        const audit = await page.evaluate(AUDIT, INTERACTIVE)
        lifts.push(audit.lift)
        if (
          audit.missing ||
          audit.stolen.length ||
          !audit.pressable ||
          !audit.labelled ||
          !audit.onScreen ||
          !audit.named
        ) {
          failures.push({ scrollY: y, ...audit })
        }
      }

      expect(
        failures,
        'the pill must never own a pixel that a control underneath it would ' +
          'have owned, and must stay visible, labelled and pressable while it ' +
          `avoids them:\n${JSON.stringify(failures, null, 2)}`
      ).toEqual([])

      /* A pill that never moves and never steals may simply have had nothing
         to avoid — which would make the assertion above pass without the
         mechanism running at all. Requiring one real lift somewhere down the
         page is what separates "clearance works" from "clearance was never
         asked". Measured on Desk: 30/78/87px at 390, 131px at 430.

         If this ever fails because the surface stopped putting controls in the
         pill's column, RE-POINT it at a surface that does — do not delete it,
         and do not relax the assertion above to compensate. */
      expect(
        lifts.some((l) => l > 0),
        `the seating mechanism should have engaged at least once on "${view}"; ` +
          `lifts were ${JSON.stringify(lifts)}`
      ).toBe(true)
    })
  }

  test('the pill is still the thing you press, and it opens the list', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, { name: 'FAB Clearance Press' })
    skipIfCloud(test, gate)

    await gotoView(page, 'desk')
    await page.waitForTimeout(800)
    /* Pressed from a DISPLACED seat, not an undisturbed one — the point is
       that a pill which has stepped aside is still the control it was. The
       previous version used `deliver` for this, where a sticky continue row
       guaranteed displacement; on Desk the displacement is earned by real
       content, so the seat is asserted rather than assumed. */
    const max = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    )
    let lift = 0
    for (let i = 1; i <= 10 && lift === 0; i++) {
      await page.evaluate((to) => window.scrollTo(0, to), Math.round((max * i) / 10))
      await page.waitForTimeout(750)
      lift = await page.evaluate(
        () =>
          parseFloat(
            getComputedStyle(document.querySelector('.todo-fab')).getPropertyValue(
              '--todo-fab-lift'
            )
          ) || 0
      )
    }

    const fab = page.locator('.todo-fab')
    await expect(fab).toBeVisible()
    await expect(fab).toContainText('To-do')
    expect(lift, 'the pill should have had to step aside somewhere on Desk').toBeGreaterThan(0)

    await fab.click()
    await expect(page.locator('.running-todo-panel')).toBeVisible({ timeout: 5000 })
  })
})

/**
 * The other half of the same product decision.
 *
 * These exist so the absence of the pill inside a stage reads as a contract
 * rather than as an oversight. Without them, the next person to notice that
 * Identity has no To-do button has nothing to tell them it was deliberate,
 * and the obvious repair — move the pill into `#cc-overlay-root` so it
 * survives the stage — would quietly undo the immersion the Workroom exists
 * for AND break `lib/overlayHostContract.test.js`.
 */
test.describe('a Workroom stage hides the pill on purpose', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the pill is unavailable inside a stage, and the stage says so instead', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, { name: 'FAB Stage Contract' })
    skipIfCloud(test, gate)

    /* One open to-do, so the stage edge has something to report. Captured
       through the pill's own route on Desk rather than written into storage:
       pill → panel → "Add to list" → the capture field. That is the path a
       designer takes, and it also proves the pill is not merely present but
       actually wired to the thing the stage edge later counts. */
    await gotoView(page, 'desk')
    await page.waitForTimeout(600)
    await page.locator('.todo-fab').click()
    const panel = page.locator('.running-todo-panel')
    await expect(panel).toBeVisible({ timeout: 5000 })
    await panel.getByRole('button', { name: 'Add to list' }).click()
    /* Scoped to the capture modal: a bare `Done` also matches the step rail's
       "Step 6: Brand book, done" behind it. */
    const addModal = page.locator('.running-todo-prompt-panel')
    await expect(addModal).toBeVisible({ timeout: 5000 })
    const field = addModal.getByRole('textbox', { name: 'New to-do item' })
    await field.fill('stage signal check')
    await field.press('Enter')
    await page.waitForTimeout(400)
    await addModal.getByRole('button', { name: 'Done', exact: true }).click()
    await page.waitForTimeout(400)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    const path = await pathNav(page)
    await stepByIdIn(path, 'design').click()
    await page.waitForTimeout(900)

    const state = await page.evaluate(() => {
      const stage = document.querySelector('.cc-stage:not(.is-suspended)')
      const root = document.getElementById('root')
      const fab = document.querySelector('.todo-fab')
      const signal = stage ? stage.querySelector('.cc-stage-signals') : null
      return {
        stageOpen: !!stage,
        rootInert: !!root && root.hasAttribute('inert'),
        rootHidden: !!root && getComputedStyle(root).visibility === 'hidden',
        fabInsideRoot: !!root && !!fab && root.contains(fab),
        fabHidden: !!fab && getComputedStyle(fab).visibility === 'hidden',
        signalText: (signal?.textContent || '').trim(),
      }
    })

    expect(state.stageOpen, 'the design stop should own the viewport').toBe(true)
    // The mechanism, asserted so a change to it lands here rather than silently.
    expect(state.rootInert).toBe(true)
    expect(state.rootHidden).toBe(true)
    // The pill is INSIDE the hidden shell, and that placement is the decision.
    expect(state.fabInsideRoot).toBe(true)
    expect(state.fabHidden).toBe(true)
    // And the compensating signal is what the designer gets instead.
    expect(
      state.signalText,
      'the stage edge should carry the open To-do count while the pill is away'
    ).toMatch(/To-do\s*·\s*[1-9]/)
  })
})
