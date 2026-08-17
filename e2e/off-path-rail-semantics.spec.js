import { test, expect } from '@playwright/test'
import {
  JOURNEY_STEPS,
  gotoView,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * P2 off-path rail semantics: keep the map, stop claiming process position
 * on Library / Timer / Review. Desk and production stops keep the old name.
 *
 * Queries the shell `.step-rail` by class, not by accessible name — the name
 * is the thing under test.
 */
const shellRail = (page) => page.locator('nav.step-rail')

test.describe('off-path rail semantics', () => {
  test('Desk keeps process-position; off-path views keep the same map', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const gate = await unlockAndOnboard(page, { name: 'Rail Semantics' })
    skipIfCloud(test, gate)

    const deskRail = shellRail(page)
    await expect(deskRail).toBeVisible()
    await expect(deskRail).toHaveAccessibleName('Process position')
    await expect(deskRail.locator('.step-rail-step')).toHaveCount(
      JOURNEY_STEPS.length
    )

    for (const view of ['assets', 'insights', 'review']) {
      await gotoView(page, view)
      const rail = shellRail(page)
      await expect(rail).toBeVisible()
      await expect(rail).toHaveAccessibleName('Path stops')
      await expect(rail.locator('.step-rail-step')).toHaveCount(
        JOURNEY_STEPS.length
      )
      await expect(rail.locator('.step-rail-step').first()).toBeEnabled()
    }

    const rail = shellRail(page)
    await stepByIdIn(rail, 'define').click()
    await expect(page.locator('.app.view-project')).toBeAttached({
      timeout: 8000,
    })
  })

  test('mobile 390 keeps 44px targets and no overflow on off-path rails', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 390, height: 844 })
    const gate = await unlockAndOnboard(page, { name: 'Rail Semantics 390' })
    skipIfCloud(test, gate)

    for (const view of ['desk', 'assets', 'insights', 'review']) {
      await gotoView(page, view)
      const rail = shellRail(page)
      await expect(rail).toBeVisible()

      const box = await rail.locator('.step-rail-step').first().boundingBox()
      expect(box, `${view} first stop has a box`).toBeTruthy()
      expect(box.height, `${view} tap height`).toBeGreaterThanOrEqual(44)
      expect(box.width, `${view} tap width`).toBeGreaterThanOrEqual(44)

      const overflow = await page.evaluate(() => {
        const app = document.querySelector('.app')
        return {
          app: app ? app.scrollWidth - app.clientWidth : 0,
          doc:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        }
      })
      expect(overflow.app, `${view} .app overflow`).toBeLessThanOrEqual(0)
      expect(overflow.doc, `${view} document overflow`).toBeLessThanOrEqual(0)
    }
  })
})
