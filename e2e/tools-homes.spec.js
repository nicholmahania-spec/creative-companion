import { test, expect } from '@playwright/test'
import {
  JOURNEY_STEPS,
  pathNav,
  skipIfCloud,
  toShell,
  unlockAndOnboard,
} from './helpers.js'

/**
 * Canonical homes after the Tools overlay was dissolved.
 * Timer is Studio. Review is This project, beside Desk. The overlay is gone.
 */
test.describe('Tools homes', () => {
  test('Timer is a Studio destination and still starts', async ({ page }) => {
    const gate = await unlockAndOnboard(page, { name: 'Timer Home' })
    skipIfCloud(test, gate)
    await toShell(page)

    await expect(page.locator('#tools-menu-button')).toHaveCount(0)
    await expect(page.locator('#tools-menu')).toHaveCount(0)

    await page.getByRole('button', { name: /^Timer$/ }).first().click()
    await expect(page.locator('.app.view-insights')).toBeAttached({
      timeout: 8000,
    })
    await expect(page.getByRole('heading', { name: 'Timer' })).toBeVisible()
    await page.getByRole('button', { name: /^25$/ }).first().click()
    await expect(page.locator('.insights-focus-actions')).toBeVisible()
  })

  test('Review sits beside Desk and is not a path stop', async ({ page }) => {
    const gate = await unlockAndOnboard(page, { name: 'Review Home' })
    skipIfCloud(test, gate)
    await toShell(page)

    const thisProject = page.locator('.journey-path-section')
    await expect(
      thisProject.getByRole('button', { name: /^Desk$/ })
    ).toBeVisible()
    await expect(
      thisProject.getByRole('button', { name: /^Review$/ })
    ).toBeVisible()

    await thisProject.getByRole('button', { name: /^Review$/ }).click()
    await expect(page.locator('.app.view-review')).toBeAttached({
      timeout: 8000,
    })
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()

    const path = await pathNav(page)
    await expect(path.getByRole('button', { name: /^Review$/ })).toHaveCount(0)
    await expect(
      page.locator('nav.step-rail .step-rail-step')
    ).toHaveCount(JOURNEY_STEPS.length)
  })
})
