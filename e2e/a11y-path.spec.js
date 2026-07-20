import { test, expect } from '@playwright/test'
import { unlockAndOnboard, pathNav, skipIfCloud } from './helpers.js'

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
    for (const label of [
      /Step 1: Define/i,
      /Step 2: Research/i,
      /Step 3: Ideate/i,
      /Step 4: Sketch/i,
      /Step 5: Design/i,
      /Step 6: Review/i,
      /Step 7: Deliver/i,
    ]) {
      await expect(path.getByRole('button', { name: label })).toBeVisible()
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
    const steps = [
      [/Step 1: Define/i, 'Define'],
      [/Step 2: Research/i, 'Research'],
      [/Step 3: Ideate/i, 'Ideate'],
      [/Step 4: Sketch/i, 'Sketch'],
      [/Step 5: Design/i, 'Design'],
      [/Step 6: Review/i, 'Review'],
      [/Step 7: Deliver/i, 'Deliver'],
    ]
    for (const [nav, heading] of steps) {
      await path.getByRole('button', { name: nav }).click()
      await page.waitForTimeout(200)
      if (heading) {
        await expect(
          page.getByRole('heading', { name: heading }).first()
        ).toBeVisible({ timeout: 8000 })
      }
    }
  })
})
