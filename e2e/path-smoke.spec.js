import { test, expect } from '@playwright/test'
import { unlockAndOnboard, pathNav, skipIfCloud } from './helpers.js'

/**
 * Path smoke: unlock → Define → Research → Ideate → Sketch → Design → Review → Deliver
 */
test.describe('Creative Companion path smoke', () => {
  test('walk 7-step design process after local unlock', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'E2E Pack Project',
      step: 'E2E first draft step',
    })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await expect(path).toBeVisible()
    // Wave: path bar N/7 process pill
    await expect(page.locator('.journey-progress-pill')).toBeVisible()
    await expect(page.locator('.journey-progress-pill')).toContainText(/\/7/)

    await path.getByRole('button', { name: /Step 1: Define/i }).click()
    await expect(page.getByRole('heading', { name: 'Define' })).toBeVisible()

    await path.getByRole('button', { name: /Step 2: Research/i }).click()
    await expect(page.getByRole('heading', { name: 'Research' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Gap · G/i })).toBeVisible()

    await path.getByRole('button', { name: /Step 3: Ideate/i }).click()
    await expect(page.getByRole('heading', { name: 'Ideate' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Gap · G/i })).toBeVisible()

    await path.getByRole('button', { name: /Step 4: Sketch/i }).click()
    await expect(page.getByRole('heading', { name: 'Sketch' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Gap · G/i })).toBeVisible()

    await path.getByRole('button', { name: /Step 5: Design/i }).click()
    await expect(page.getByRole('heading', { name: 'Design' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Gap · G/i })).toBeVisible()

    await path.getByRole('button', { name: /Step 6: Review/i }).click()
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Gap · G/i })).toBeVisible()

    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole('button', {
        name: /Download (brand book|vector) PDF/i,
      })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Print / Save as PDF', exact: true })
    ).toBeVisible()

    await page.keyboard.press('4')
    await expect(page.getByRole('heading', { name: 'Sketch' })).toBeVisible({
      timeout: 8000,
    })
  })
})
