import { test, expect } from '@playwright/test'
import {
  labelForStep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * Desk reliability: local unlock → path → Deliver exports · Esc overlays.
 */
test.describe('Desk reliability', () => {
  test('Deliver shows Brand book PDF and Print under More formats', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'E2E Reliability',
      step: 'Ship one step',
    })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await expect(path).toBeVisible()
    await stepByIdIn(path, 'deliver').click()
    await expect(
      page.getByRole('heading', { level: 1, name: labelForStep('deliver') })
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole('button', { name: /Brand book PDF/i })
    ).toBeVisible()
    await page
      .locator('.deliver-advanced summary', { hasText: 'More formats' })
      .click()
    await expect(
      page.getByRole('button', { name: 'Print', exact: true })
    ).toBeVisible()
  })

  test('Esc closes Tools menu', async ({ page }) => {
    const gate = await unlockAndOnboard(page, { name: 'E2E Reliability' })
    skipIfCloud(test, gate)
    await page.getByRole('button', { name: 'Tools' }).click()
    await expect(page.locator('#tools-menu, .more-menu')).toBeVisible()
    /* Print left Tools (lives on Assets/Export). First "This project" row is Export. */
    await expect(
      page.locator('#tools-menu').getByRole('menuitem', { name: /Export/i })
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('#tools-menu, .more-menu')).toHaveCount(0)
  })

  test('Esc closes export preview overlay', async ({ page }) => {
    const gate = await unlockAndOnboard(page, { name: 'E2E Reliability' })
    skipIfCloud(test, gate)
    const path = await pathNav(page)
    await stepByIdIn(path, 'deliver').click()
    await expect(
      page.getByRole('heading', { level: 1, name: labelForStep('deliver') })
    ).toBeVisible({ timeout: 10000 })
    await page
      .locator('.deliver-advanced summary', { hasText: 'More formats' })
      .click()
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    await expect(
      page.getByRole('dialog', { name: /^Export$/i })
    ).toBeVisible({ timeout: 8000 })
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('dialog', { name: /^Export$/i })
    ).toHaveCount(0)
  })
})
