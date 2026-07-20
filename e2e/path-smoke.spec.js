import { test, expect } from '@playwright/test'
import { unlockAndOnboard, pathNav, skipIfCloud } from './helpers.js'

/**
 * Path smoke: unlock → walk process; gap chrome = pill + strip (not per-step Gap · G).
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
    // Single next-gap chrome: N/7 pill + gap strip
    await expect(page.locator('.journey-progress-pill')).toBeVisible()
    await expect(page.locator('.journey-progress-pill')).toContainText(/\/7/)
    await expect(page.locator('.journey-gap-strip')).toBeVisible()
    await expect(page.locator('.journey-gap-strip-btn')).toBeVisible()
    await expect(page.locator('.journey-gap-strip-btn')).toContainText(
      /Next gap ·|Ship · brand book/i
    )
    await expect(page.locator('.journey-still-thin')).toBeVisible()
    await expect(page.locator('.journey-still-thin-link').first()).toBeVisible()

    // Click first still-thin link → jump that step + focus
    await page.locator('.journey-still-thin-link').first().click()
    await expect(page.locator('h1.page-title').first()).toBeVisible({
      timeout: 8000,
    })

    await path.getByRole('button', { name: /Step 1: Define/i }).click()
    await expect(page.getByRole('heading', { name: 'Define' })).toBeVisible()
    await expect(page.locator('.step-fill-chip')).toBeVisible()
    // Onboard first step waits on Sketch
    await expect(page.locator('.define-first-step-chip')).toBeVisible()
    await expect(page.locator('.define-first-step-chip')).toContainText(
      /first step|Sketch/i
    )
    // No per-step Gap · G after chrome collapse
    await expect(page.getByRole('button', { name: /^Gap · G$/i })).toHaveCount(0)

    await path.getByRole('button', { name: /Step 2: Research/i }).click()
    await expect(page.getByRole('heading', { name: 'Research' })).toBeVisible()
    await expect(page.locator('.research-still-thin')).toBeVisible()
    await expect(page.locator('.research-still-thin')).toContainText(
      /Pin at least one ref/i
    )
    await expect(page.getByRole('button', { name: /^Gap · G$/i })).toHaveCount(0)

    await page.locator('.journey-gap-strip-btn').click()
    await expect(page.locator('h1.page-title').first()).toBeVisible({
      timeout: 8000,
    })

    for (const step of [
      [/Step 3: Ideate/i, 'Ideate'],
      [/Step 4: Sketch/i, 'Sketch'],
      [/Step 5: Design/i, 'Design'],
      [/Step 6: Review/i, 'Review'],
    ]) {
      await path.getByRole('button', { name: step[0] }).click()
      await expect(page.getByRole('heading', { name: step[1] })).toBeVisible()
      await expect(page.locator('.journey-gap-strip')).toBeVisible()
    }

    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByText(/Process · \d+ of 7 steps have content/i)
    ).toBeVisible()
    // Panel chips only — no Fix next gap button (strip owns it)
    await expect(
      page.getByLabel('Process progress').getByRole('button', {
        name: /^Fix next gap/i,
      })
    ).toHaveCount(0)
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
