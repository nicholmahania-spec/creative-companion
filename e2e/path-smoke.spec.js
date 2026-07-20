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
    // Wave: path bar N/7 process pill + under-path gap strip
    await expect(page.locator('.journey-progress-pill')).toBeVisible()
    await expect(page.locator('.journey-progress-pill')).toContainText(/\/7/)
    await expect(page.locator('.journey-gap-strip')).toBeVisible()
    await expect(page.locator('.journey-gap-strip-btn')).toBeVisible()
    await expect(page.locator('.journey-gap-strip-btn')).toContainText(
      /Next gap ·|Ship · brand book/i
    )
    // Wave: still-thin summary on strip
    await expect(page.locator('.journey-still-thin')).toBeVisible()
    await expect(page.locator('.journey-still-thin')).toContainText(/Still thin/i)

    await path.getByRole('button', { name: /Step 1: Define/i }).click()
    await expect(page.getByRole('heading', { name: 'Define' })).toBeVisible()
    await expect(page.locator('.step-fill-chip')).toBeVisible()

    await path.getByRole('button', { name: /Step 2: Research/i }).click()
    await expect(page.getByRole('heading', { name: 'Research' })).toBeVisible()
    await expect(
      page.locator('.finish-secondary-row .btn, .flow-top .btn-ghost').filter({
        hasText: /Gap · G/i,
      }).first()
    ).toBeVisible()
    // Fresh project has no pins — Research empty still-thin callout
    await expect(page.locator('.research-still-thin')).toBeVisible()
    await expect(page.locator('.research-still-thin')).toContainText(
      /Pin at least one ref/i
    )

    // Gap strip Next gap jumps toward earliest incomplete step
    await page.locator('.journey-gap-strip-btn').click()
    await expect(page.locator('h1.page-title').first()).toBeVisible({
      timeout: 8000,
    })

    await path.getByRole('button', { name: /Step 3: Ideate/i }).click()
    await expect(page.getByRole('heading', { name: 'Ideate' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Gap · G/i }).first()
    ).toBeVisible()

    await path.getByRole('button', { name: /Step 4: Sketch/i }).click()
    await expect(page.getByRole('heading', { name: 'Sketch' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Gap · G/i }).first()
    ).toBeVisible()

    await path.getByRole('button', { name: /Step 5: Design/i }).click()
    await expect(page.getByRole('heading', { name: 'Design' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Gap · G/i }).first()
    ).toBeVisible()

    await path.getByRole('button', { name: /Step 6: Review/i }).click()
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Gap · G/i }).first()
    ).toBeVisible()

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
