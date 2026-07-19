import { test, expect } from '@playwright/test'

/**
 * Path smoke: unlock local gate → Project → Work → Board → System → Pack.
 * Skips if Supabase cloud login is required (env-configured builds).
 */
test.describe('Creative Companion path smoke', () => {
  test('walk primary path after local unlock', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const body = await page.locator('body').innerText()

    // Cloud login (email) — skip full path in CI without secrets
    if (body.includes('Sign in') && body.includes('Email')) {
      test.skip(true, 'Cloud auth configured — path smoke needs credentials')
    }

    // Local setup or unlock (copy may be "Protect this desk" / "open your desk")
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
        // password + confirm only
        await inputs.nth(0).fill('testpass123')
        await inputs.nth(1).fill('testpass123')
      } else if (n >= 1) {
        await inputs.nth(0).fill('testpass123')
      }
      await page.locator('button[type="submit"]').first().click()
      await page.waitForTimeout(900)
    }

    // Onboarding
    const onboardPrimary = page.locator('.onboard-primary, .onboard-panel .btn-primary')
    if (await onboardPrimary.count()) {
      const name = page.locator('#onboard-name, .onboard-panel input, .onboard-input').first()
      if (await name.count()) {
        await name.fill('E2E Pack Project')
        const step = page.locator('#onboard-step, .onboard-panel input, .onboard-input').nth(1)
        if (await step.count()) await step.fill('Write pack tagline')
      }
      await onboardPrimary.first().click()
      await page.waitForTimeout(500)
    }

    // Path nav should exist
    const path = page.getByRole('navigation', { name: /Your path/i })
    await expect(path).toBeVisible()

    // Project
    await path.getByRole('button', { name: /Step 1: Project/i }).click()
    await expect(page.getByRole('heading', { name: 'Project' })).toBeVisible()
    await expect(page.getByText(/Path readiness/i)).toBeVisible()

    // Work
    await path.getByRole('button', { name: /Step 2: Work/i }).click()
    const capture = page.locator('#desk-capture')
    if (await capture.count()) {
      await capture.fill('E2E ship one step')
      const addBtn = page
        .locator(
          '.capture-strip .btn-primary, .capture-row .btn-primary, .capture-row button'
        )
        .first()
      if (await addBtn.count()) await addBtn.click()
      await page.waitForTimeout(300)
    }

    // Board
    await path.getByRole('button', { name: /Step 3: Board/i }).click()
    await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible()

    // System
    await path.getByRole('button', { name: /Step 4: System/i }).click()
    await expect(page.getByRole('heading', { name: 'System' })).toBeVisible()
    const tagline = page.getByLabel('Tagline')
    if (await tagline.count()) {
      await tagline.fill('E2E calm direction')
    }

    // Pack
    await path.getByRole('button', { name: /Step 5: Pack/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Pack' })
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole('button', { name: 'Download PDF', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Print / Save as PDF', exact: true })
    ).toBeVisible()
  })
})
