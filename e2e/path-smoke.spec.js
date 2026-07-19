import { test, expect } from '@playwright/test'

/**
 * Path smoke: unlock → Define → Research → Ideate → Sketch → Design → Review → Deliver
 */
test.describe('Creative Companion path smoke', () => {
  test('walk 7-step design process after local unlock', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const body = await page.locator('body').innerText()

    if (body.includes('Sign in') && body.includes('Email')) {
      test.skip(true, 'Cloud auth configured — path smoke needs credentials')
    }

    const onLogin =
      body.includes('Create an access password') ||
      body.includes('access password') ||
      body.includes('Protect this desk') ||
      body.includes('Unlock desk') ||
      body.includes('Create access')
    if (onLogin || (await page.locator('.login-form, .login-page').count())) {
      const inputs = page.locator('.login-form input, .login-page input')
      const n = await inputs.count()
      if (n >= 3) {
        await inputs.nth(0).fill('E2E Tester')
        await inputs.nth(1).fill('testpass123')
        await inputs.nth(2).fill('testpass123')
      } else if (n >= 2) {
        await inputs.nth(0).fill('testpass123')
        await inputs.nth(1).fill('testpass123')
      } else if (n >= 1) {
        await inputs.nth(0).fill('testpass123')
      }
      await page.locator('button[type="submit"]').first().click()
      await page.waitForTimeout(900)
    }

    const onboardPrimary = page.locator(
      '.onboard-primary, .onboard-panel .btn-primary'
    )
    if (await onboardPrimary.count()) {
      const name = page
        .locator('#onboard-name, .onboard-panel input, .onboard-input')
        .first()
      if (await name.count()) {
        await name.fill('E2E Pack Project')
        const step = page
          .locator('#onboard-step, .onboard-panel input, .onboard-input')
          .nth(1)
        if (await step.count()) await step.fill('E2E first draft step')
      }
      await onboardPrimary.first().click()
      await page.waitForTimeout(500)
    }

    const path = page.getByRole('navigation', { name: /Your path/i })
    await expect(path).toBeVisible()

    // 1 Define
    await path.getByRole('button', { name: /Step 1: Define/i }).click()
    await expect(page.getByRole('heading', { name: 'Define' })).toBeVisible()

    // 2 Research
    await path.getByRole('button', { name: /Step 2: Research/i }).click()
    await expect(page.getByRole('heading', { name: 'Research' })).toBeVisible()

    // 3 Ideate
    await path.getByRole('button', { name: /Step 3: Ideate/i }).click()
    await expect(page.getByRole('heading', { name: 'Ideate' })).toBeVisible()

    // 4 Sketch
    await path.getByRole('button', { name: /Step 4: Sketch/i }).click()
    await expect(page.getByRole('heading', { name: 'Sketch' })).toBeVisible()

    // 5 Design
    await path.getByRole('button', { name: /Step 5: Design/i }).click()
    await expect(page.getByRole('heading', { name: 'Design' })).toBeVisible()

    // 6 Review
    await path.getByRole('button', { name: /Step 6: Review/i }).click()
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()

    // 7 Deliver
    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole('button', { name: 'Download vector PDF', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Print / Save as PDF', exact: true })
    ).toBeVisible()

    // Digit 4 → Sketch
    await page.keyboard.press('4')
    await expect(page.getByRole('heading', { name: 'Sketch' })).toBeVisible({
      timeout: 8000,
    })
  })
})
