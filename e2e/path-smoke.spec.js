import { test, expect } from '@playwright/test'
import { unlockAndOnboard, pathNav, skipIfCloud } from './helpers.js'

/**
 * Path smoke: unlock → walk process; gap chrome = N/7 pill always, quiet
 * G strip only while ON the earliest empty step (never shouts elsewhere).
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
    // Single next-gap chrome: N/7 pill (strip appears only on the gap step)
    await expect(page.locator('.journey-progress-pill')).toBeVisible()
    await expect(page.locator('.journey-progress-pill')).toContainText(/\/7/)
    // Still-thin list + step-fill chip intentionally removed (pill checkmarks own that signal)
    await expect(page.locator('.journey-still-thin')).toHaveCount(0)
    await expect(page.locator('.step-fill-chip')).toHaveCount(0)

    await path.getByRole('button', { name: /Step 1: Define/i }).click()
    await expect(page.getByRole('heading', { name: 'Define' })).toBeVisible()
    // Named project fills Define, so the quiet strip stays off this step
    await expect(page.locator('.journey-gap-strip')).toHaveCount(0)
    // No per-step Gap · G after chrome collapse
    await expect(page.getByRole('button', { name: /^Gap · G$/i })).toHaveCount(0)

    await path.getByRole('button', { name: /Step 2: Research/i }).click()
    await expect(page.getByRole('heading', { name: 'Research' })).toBeVisible()
    // Research is the earliest gap → quiet G strip shows here only
    await expect(page.locator('.journey-gap-strip.is-on-gap')).toBeVisible()
    await expect(page.locator('.journey-gap-strip-btn.is-quiet')).toBeVisible()
    await expect(page.locator('.journey-gap-strip-btn.is-quiet')).toHaveText('G')
    // Empty board: upload affordance, no second still-thin lecture
    await expect(page.getByText(/0 pins|Upload images/i).first()).toBeVisible()
    await expect(page.locator('.research-still-thin')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Gap · G$/i })).toHaveCount(0)

    // Quiet G jumps to (stays on) the earliest gap
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
      // Pill stays; the strip never shouts while working later steps
      await expect(page.locator('.journey-progress-pill')).toBeVisible()
    }

    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Pack · \d+\/\d+/i).first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Brand book PDF/i })
    ).toBeVisible()
    // Print lives under More formats now
    await page.locator('.deliver-advanced summary', { hasText: 'More formats' }).click()
    await expect(
      page.getByRole('button', { name: 'Print', exact: true })
    ).toBeVisible()

    await page.keyboard.press('4')
    await expect(page.getByRole('heading', { name: 'Sketch' })).toBeVisible({
      timeout: 8000,
    })
  })
})
