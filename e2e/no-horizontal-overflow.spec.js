import { test, expect } from '@playwright/test'
import { unlockAndOnboard, skipIfCloud, JOURNEY_STEPS } from './helpers.js'

/**
 * The shell must never be wider than the screen.
 *
 * This guards the defect in docs/VISUAL_AUDIT_2026-08-07.md: the header set a
 * min-content floor of up to 475px at a 390px viewport, and `overflow-x:
 * hidden` on the ancestor chain silently amputated the difference. 42-85px of
 * every mobile path stop was unreachable — no scroll, no scrollbar, no symptom.
 *
 * Why this needs its own spec rather than an assertion on
 * `documentElement.scrollWidth`: while the clipping was in place, that value
 * stayed at exactly the viewport width. The bug hid its own evidence at the
 * document level. `.app` is the element that actually knew, and it only knew
 * via `scrollWidth > clientWidth` — which is the assertion below.
 *
 * `overflow-x: hidden` is gone from the chain now, so a regression shows up as
 * a real horizontal scrollbar too. This keeps it from being merely visible and
 * makes it fail the build.
 */

const WIDTHS = [
  { name: 'iPhone SE', width: 320 },
  { name: 'iPhone 12/13/14', width: 390 },
  { name: 'large phone', width: 430 },
]

test.describe('no horizontal overflow', () => {
  for (const { name, width } of WIDTHS) {
    test(`shell fits the viewport at ${width}px (${name})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      const gate = await unlockAndOnboard(page)
      skipIfCloud(test, gate)

      for (const step of JOURNEY_STEPS) {
        await page.evaluate((v) => localStorage.setItem('cc-active-view', v), step.view)
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        const m = await page.evaluate(() => {
          const app = document.querySelector('.app')
          const de = document.documentElement
          return {
            appScrollW: app ? app.scrollWidth : 0,
            appClientW: app ? app.clientWidth : 0,
            docScrollW: de.scrollWidth,
            docClientW: de.clientWidth,
          }
        })

        expect(
          m.appScrollW,
          `.app overflows at ${width}px on "${step.label}" — ` +
            `${m.appScrollW}px of content in a ${m.appClientW}px shell. ` +
            `Something in the chrome is refusing to shrink; find it with ` +
            `min-width: 0 rather than by hiding the overflow.`
        ).toBeLessThanOrEqual(m.appClientW + 1)

        expect(
          m.docScrollW,
          `document scrolls horizontally at ${width}px on "${step.label}"`
        ).toBeLessThanOrEqual(m.docClientW + 1)
      }
    })
  }

  /**
   * The project name is the only answer to "which project am I in" on a phone:
   * the wordmark is hidden at this width and the back link names the PREVIOUS
   * stop. It used to be collapsed to width 0 by the workaround that kept the
   * header from widening the grid, so the answer was absent on every path view.
   */
  test('the project name survives at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const gate = await unlockAndOnboard(page)
    skipIfCloud(test, gate)

    for (const step of JOURNEY_STEPS) {
      await page.evaluate((v) => localStorage.setItem('cc-active-view', v), step.view)
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const w = await page.evaluate(() => {
        const el = document.querySelector('.header-context')
        return el ? Math.round(el.getBoundingClientRect().width) : null
      })
      if (w === null) continue // not a project-scoped screen
      expect(w, `project name collapsed on "${step.label}"`).toBeGreaterThan(0)
    }
  })
})
