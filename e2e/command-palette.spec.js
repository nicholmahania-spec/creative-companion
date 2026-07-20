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
    // Actions group first — G is not buried under path 1–5
    await expect(page.locator('.command-section-label').first()).toHaveText(
      /Actions/i
    )
    await expect(
      page.getByRole('option', { name: /Fix next process gap \(\d+\/7\)/i })
    ).toBeVisible({ timeout: 5000 })
    // Path section + spaced step labels
    await expect(
      page.locator('.command-section-label', { hasText: /^Path$/i })
    ).toBeVisible()
    await expect(
      page.getByRole('option', { name: /1\s*·\s*Define/i })
    ).toBeVisible()
    await input.fill('Fix next')
    await page.keyboard.press('Enter')
    await expect(page.locator('h1.page-title').first()).toBeVisible({
      timeout: 8000,
    })
  })

  test('lists Download brand kit and jumps to Deliver', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'E2E Kit Palette',
      step: 'Kit command',
    })
    skipIfCloud(test, gate)

    await page.keyboard.press('Control+k')
    await expect(
      page.getByRole('dialog', { name: /Command palette/i })
    ).toBeVisible({ timeout: 5000 })
    const input = page.locator(
      'input.command-input, input[aria-label="Filter commands"]'
    )
    await input.fill('brand kit')
    await expect(
      page.getByRole('option', { name: /Download brand kit/i })
    ).toBeVisible({ timeout: 5000 })
    // Selecting kit opens Deliver (export may show toast / download)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Deliver' })).toBeVisible({
      timeout: 10000,
    })
  })
})
