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

/**
 * Open the Deliver disclosure that CONTAINS a given control.
 *
 * These tests used to click `.deliver-advanced summary` filtered by the text
 * "More formats". That disclosure is now "Extras · print, ZIP, backup", so the
 * click waited on a summary that does not exist and both tests died on a
 * 60s timeout — while the controls they were reaching for were present and
 * working the whole time.
 *
 * Deliver has four `.deliver-advanced` disclosures and their labels are
 * ordinary product copy, which is free to change. What is NOT free to change
 * is that Print lives behind a disclosure — that is the behaviour under test.
 * So find the section by what it holds, not by what it is called.
 *
 * `label` must be matched with a DOM locator, NOT `getByRole`. Role queries
 * resolve against the accessibility tree, and a CLOSED <details> hides its
 * children from that tree — so a role-based filter matches nothing here and
 * the click waits forever on a section that is right there. The children are
 * still in the DOM, which is why a plain `button` locator finds them.
 */
async function openDeliverSectionWith(page, label) {
  const control = page.locator('button', { hasText: label })
  const section = page.locator('.deliver-advanced').filter({ has: control })
  await section.first().locator('summary').first().click()
}
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
    await openDeliverSectionWith(page, /^Print$/)
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
