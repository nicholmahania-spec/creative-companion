import { test, expect } from '@playwright/test'
import { unlockAndOnboard, skipIfCloud } from './helpers.js'

/**
 * ⌘K / Ctrl+K command palette process actions.
 */
test.describe('Command palette', () => {
  test('opens with Control+K and jumps to Define detective', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'E2E Command',
      step: 'Palette jump',
    })
    skipIfCloud(test, gate)

    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog', { name: /Command palette/i })).toBeVisible({
      timeout: 5000,
    })
    const input = page.locator('input.command-input, input[aria-label="Filter commands"]')
    await expect(input).toBeVisible()
    await input.fill('Detective')
    await page.keyboard.press('Enter')

    await expect(page.getByRole('heading', { name: 'Define' })).toBeVisible({
      timeout: 8000,
    })
    await expect(page.locator('#detective-goal')).toBeVisible({ timeout: 8000 })
  })

  test('Fix next process gap via palette', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'E2E Gap',
      step: 'Gap jump',
    })
    skipIfCloud(test, gate)

    await page.keyboard.press('Control+k')
    await expect(
      page.getByRole('dialog', { name: /Command palette/i })
    ).toBeVisible({ timeout: 5000 })
    const input = page.locator(
      'input.command-input, input[aria-label="Filter commands"]'
    )
    // Wave: palette shows N/7 progress in gap action label
    await expect(
      page.getByRole('option', { name: /Fix next process gap \(\d+\/7\)/i })
    ).toBeVisible({ timeout: 5000 })
    await input.fill('Fix next')
    await page.keyboard.press('Enter')
    await expect(page.locator('h1.page-title').first()).toBeVisible({
      timeout: 8000,
    })
  })
})
