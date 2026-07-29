import { test, expect } from '@playwright/test'
import {
  unlockAndOnboard,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  headingForStep,
  JOURNEY_STEPS,
} from './helpers.js'

/**
 * Lightweight path a11y checks (no axe dependency):
 * landmarks, skip link target, journey labels, dialogs.
 */
test.describe('Path accessibility', () => {
  test('landmarks and path after unlock', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'A11y Project',
      testerName: 'A11y Tester',
      expectOnboardDialog: true,
    })
    skipIfCloud(test, gate)

    await expect(page.locator('main#main-content')).toBeVisible()
    await expect(page.locator('header').first()).toBeVisible()
    await expect(page.locator('footer[role="contentinfo"]')).toBeVisible()

    const path = await pathNav(page)
    await expect(path).toBeVisible()
    /* Walked from JOURNEY_STEPS rather than a frozen list of seven. The
       old copy named Define/Ideate/Sketch/Design/Review, none of which are
       path stops now, so this failed while the app was correct. */
    for (const step of JOURNEY_STEPS) {
      await expect(stepByIdIn(path, step.id)).toBeVisible()
    }

    await expect(page.locator('a.skip-link')).toHaveAttribute(
      'href',
      '#main-content'
    )

    await expect(page.getByRole('button', { name: 'Tools' })).toHaveAttribute(
      'aria-haspopup',
      'menu'
    )
  })

  test('each path step has a page heading', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'A11y Project',
      testerName: 'A11y Tester',
      expectOnboardDialog: true,
    })
    skipIfCloud(test, gate)
    const path = await pathNav(page)
    for (const step of JOURNEY_STEPS) {
      await stepByIdIn(path, step.id).click()
      await page.waitForTimeout(200)
      await expect(headingForStep(page, step.id).first()).toBeVisible({
        timeout: 8000,
      })
    }
  })
})
