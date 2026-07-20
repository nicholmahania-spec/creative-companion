import { test, expect } from '@playwright/test'
import { unlockAndOnboard, pathNav, skipIfCloud } from './helpers.js'

/**
 * Desk reliability: local unlock → path → Pack dual export · Esc overlays.
 */
test.describe('Desk reliability', () => {
  test('Pack shows Download PDF and Print / Save as PDF', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'E2E Reliability',
      step: 'Ship one step',
    })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await expect(path).toBeVisible()
    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole('button', { name: 'Print / Save as PDF', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: /Download (brand book|vector) PDF/i,
      })
    ).toBeVisible()
    await expect(
      page
        .locator('.pack-export-hint')
        .filter({ hasText: /brand book|vector PDF|pages/i })
    ).toBeVisible()
  })

  test('Esc closes Tools menu', async ({ page }) => {
    const gate = await unlockAndOnboard(page, { name: 'E2E Reliability' })
    skipIfCloud(test, gate)
    await page.getByRole('button', { name: 'Tools' }).click()
    await expect(page.locator('#tools-menu, .more-menu')).toBeVisible()
    await expect(
      page.locator('#tools-menu').getByRole('menuitem', { name: /Settings/i })
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('#tools-menu, .more-menu')).toHaveCount(0)
  })

  test('Esc closes export preview overlay', async ({ page }) => {
    const gate = await unlockAndOnboard(page, { name: 'E2E Reliability' })
    skipIfCloud(test, gate)
    const path = await pathNav(page)
    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })
    await page
      .locator('summary.pack-more-summary, details.pack-more-actions summary')
      .first()
      .click()
    await page.getByRole('button', { name: 'Preview full' }).click()
    await expect(
      page.getByRole('dialog', { name: /Brand direction pack/i })
    ).toBeVisible({ timeout: 8000 })
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('dialog', { name: /Brand direction pack/i })
    ).toHaveCount(0)
  })
})
