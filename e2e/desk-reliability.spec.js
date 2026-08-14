import { test, expect } from '@playwright/test'
import {
  labelForStep,
  openDeliverSectionWith,
  pathNav,
  skipIfCloud,
  toShell,
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
    /* Two h1s answer to the stop's name on a stage — the stage's own sr-only
       heading (Workroom's `aria-labelledby` target) and the masthead display
       title — so take the first rather than tripping strict mode on a page
       that is correct. Same note as `path-smoke.spec.js`. */
    await expect(
      page.getByRole('heading', { level: 1, name: labelForStep('deliver') }).first()
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole('button', { name: /Brand book PDF/i })
    ).toBeVisible()
    await openDeliverSectionWith(page, /^Print$/)
    await expect(
      page.getByRole('button', { name: 'Print', exact: true })
    ).toBeVisible()
  })

  test('Esc closes Tools menu', async ({ page }) => {
    const gate = await unlockAndOnboard(page, { name: 'E2E Reliability' })
    skipIfCloud(test, gate)
    await toShell(page)
    await page.getByRole('button', { name: 'Tools' }).click()
    await expect(page.locator('#tools-menu, .more-menu')).toBeVisible()
    /* What this test is about is Escape, so the menu's contents are only
       evidence that it is open. Naming a specific row made it fail twice for
       reasons that had nothing to do with Escape: Print left Tools for
       Assets/Export, and then Export left too. Tools now carries Timer,
       Review and Discovery notes. Assert that it is open and populated. */
    await expect(
      page.locator('#tools-menu').getByRole('menuitem').first()
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
      page.getByRole('heading', { level: 1, name: labelForStep('deliver') }).first()
    ).toBeVisible({ timeout: 10000 })
    await openDeliverSectionWith(page, /^Preview$/)
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
