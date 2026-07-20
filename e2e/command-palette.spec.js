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
})
