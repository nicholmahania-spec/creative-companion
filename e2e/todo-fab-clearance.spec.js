import { test, expect } from '@playwright/test'
import { pathNav, skipIfCloud, stepByIdIn, unlockAndOnboard } from './helpers.js'

/**
 * The To-do pill must never take a tap that belonged to something underneath.
 *
 * This is the measurement that found the defect, kept as the check that it
 * stays fixed. On a 390x844 phone the pill sat on `Next · Assets` on
 * Touchpoints and on `Back to the desk` on Assets — and the second one was not
 * a mid-scroll accident: `Back to the desk` lives in `.path-continue-row`,
 * which is `position: sticky; bottom: 0`, so it was under the pill at every
 * scroll offset on that view. Nothing caught it because nothing looks at where
 * two fixed things land relative to each other; both render perfectly.
 *
 * THE PREDICATE MATTERS, and the obvious one is wrong. Asking whether
 * `elementsFromPoint` returns any interactive element under the pill
 * over-reports badly: that call returns the whole stack, including controls
 * that some third element already covers. The brief form scrolls live inputs
 * behind an opaque `position: sticky` footer, and those are not reachable by a
 * finger with or without the pill. Chasing them moved the pill 286px up a page
 * where it was already sitting somewhere honest. So the assertion is the real
 * question: take the topmost element that is not the pill, resolve it to the
 * control that would receive its click, and require that there is none.
 *
 * Both halves are asserted, because either alone passes for the wrong reason:
 * a pill that has been deleted steals nothing, and a pill parked over empty
 * space is useless if it is no longer the thing you can press.
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

  for (const step of ['sketch', 'deliver']) {
    test(`the pill steals nothing on "${step}", at every rest position`, async ({
      page,
    }) => {
      const gate = await unlockAndOnboard(page, { name: 'FAB Clearance' })
      skipIfCloud(test, gate)

      const path = await pathNav(page)
      await stepByIdIn(path, step).click()
      await page.waitForTimeout(800)

      const max = await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      )
      /* Sampled down the page rather than only at the top, because the whole
         point is that the answer changes as content slides through the pill's
         column. Capped so a very long view does not turn this into a minute of
         waiting; every stop costs a settle. */
      const stops = 10
      const failures = []
      for (let i = 0; i <= stops; i++) {
        const y = Math.round((max * i) / stops)
        await page.evaluate((to) => window.scrollTo(0, to), y)
        // Past the 90ms re-seat fuse and the 450ms expand, so this is the page
        // genuinely at rest — which is the only state a tap happens in.
        await page.waitForTimeout(750)
        const audit = await page.evaluate(AUDIT, INTERACTIVE)
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
    })
  }

  test('the pill is still the thing you press, and it opens the list', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, { name: 'FAB Clearance Press' })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await stepByIdIn(path, 'deliver').click()
    await page.waitForTimeout(800)
    // `deliver` is the view where the pill is permanently displaced by the
    // sticky continue row, so this proves a displaced pill still works rather
    // than only an undisturbed one.
    await page.evaluate(() => window.scrollTo(0, 400))
    await page.waitForTimeout(750)

    const fab = page.locator('.todo-fab')
    await expect(fab).toBeVisible()
    await expect(fab).toContainText('To-do')
    const lift = await page.evaluate(
      () =>
        parseFloat(
          getComputedStyle(document.querySelector('.todo-fab')).getPropertyValue(
            '--todo-fab-lift'
          )
        ) || 0
    )
    expect(lift, 'the sticky continue row should have moved it').toBeGreaterThan(0)

    await fab.click()
    await expect(page.locator('.running-todo-panel')).toBeVisible({ timeout: 5000 })
  })
})
