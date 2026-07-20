import { test, expect } from '@playwright/test'
import { unlockAndOnboard, pathNav, skipIfCloud } from './helpers.js'

/**
 * Offline desk: client-side path works with network down (SPA + local data).
 */
test.describe('Offline desk', () => {
  test('SPA path navigation works while offline', async ({ page, context }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Offline Project',
      testerName: 'Offline Tester',
    })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await expect(path).toBeVisible()

    // Warm lazy path chunks while online so offline SPA hops still work
    await path.getByRole('button', { name: /Step 2: Research/i }).click()
    await expect(page.getByRole('heading', { name: 'Research' })).toBeVisible()
    await path.getByRole('button', { name: /Step 4: Sketch/i }).click()
    await expect(
      page.locator('#current-step, #desk-capture, .step-focus-panel').first()
    ).toBeVisible({ timeout: 10000 })
    await path.getByRole('button', { name: /Step 1: Define/i }).click()
    await expect(page.getByRole('heading', { name: 'Define' })).toBeVisible()
    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })

    await context.setOffline(true)

    await path.getByRole('button', { name: /Step 4: Sketch/i }).click()
    await expect(
      page.locator('#current-step, #desk-capture, .step-focus-panel').first()
    ).toBeVisible({ timeout: 8000 })

    await path.getByRole('button', { name: /Step 1: Define/i }).click()
    await expect(page.getByRole('heading', { name: 'Define' })).toBeVisible()

    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: /Download (brand book|vector) PDF/i,
      })
    ).toBeVisible()

    await expect(
      page.getByText(/Ready|Download PDF|Thin pack|leave-behind|client pack|brand book|Not ready/i).first()
    ).toBeVisible()

    await context.setOffline(false)
  })
})
