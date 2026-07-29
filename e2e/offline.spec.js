import { test, expect } from '@playwright/test'
import {
  headingForStep,
  labelForStep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * Offline desk (honest scope):
 * After path chunks are *warmed while online*, SPA hops still work offline.
 * This does NOT prove a cold offline install or full PWA precache — only
 * in-session navigation + already-fetched modules + local desk data.
 */
test.describe('Offline desk', () => {
  test('warmed SPA path navigation works while offline', async ({ page, context }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Offline Project',
      testerName: 'Offline Tester',
    })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await expect(path).toBeVisible()

    // Warm lazy path chunks while online so offline SPA hops still work
    await stepByIdIn(path, 'research').click()
    await expect(headingForStep(page, 'research').first()).toBeVisible()
    await stepByIdIn(path, 'sketch').click()
    await expect(
      page.locator('#current-step, #desk-capture, .step-focus-panel').first()
    ).toBeVisible({ timeout: 10000 })
    await stepByIdIn(path, 'define').click()
    await expect(headingForStep(page, 'define').first()).toBeVisible()
    await stepByIdIn(path, 'deliver').click()
    await expect(
      page.locator('h1.page-title', { hasText: labelForStep('deliver') })
    ).toBeVisible({ timeout: 10000 })

    await context.setOffline(true)

    await stepByIdIn(path, 'sketch').click()
    await expect(
      page.locator('#current-step, #desk-capture, .step-focus-panel').first()
    ).toBeVisible({ timeout: 8000 })

    await stepByIdIn(path, 'define').click()
    await expect(headingForStep(page, 'define').first()).toBeVisible()

    await stepByIdIn(path, 'deliver').click()
    await expect(
      page.locator('h1.page-title', { hasText: labelForStep('deliver') })
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: /Brand book PDF/i,
      })
    ).toBeVisible()

    await expect(
      page.getByText(/Ready|Download PDF|Thin pack|leave-behind|client pack|brand book|Not ready/i).first()
    ).toBeVisible()

    await context.setOffline(false)
  })
})
