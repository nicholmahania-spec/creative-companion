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
      page.locator('h1.page-title', { hasText: labelForStep('deliver') })
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
    /* Was asserting a Settings row here. Settings left this menu when the
       header split — it is a labelled button in the header now, and the copy
       that remains in this menu is `.more-menu-item-mobile-only`, hidden above
       767px. Any still-present row proves the menu opened; Print is the first
       one under "This project". */
    await expect(
      page.locator('#tools-menu').getByRole('menuitem', { name: /Print/i })
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
      page.locator('h1.page-title', { hasText: labelForStep('deliver') })
    ).toBeVisible({ timeout: 10000 })
    await page
      .locator('.deliver-advanced summary', { hasText: 'More formats' })
      .click()
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    await expect(
      page.getByRole('dialog', { name: /Brand direction pack/i })
    ).toBeVisible({ timeout: 8000 })
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('dialog', { name: /Brand direction pack/i })
    ).toHaveCount(0)
  })
})
