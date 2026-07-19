import { test, expect } from '@playwright/test'

/**
 * Offline desk: client-side path works with network down (SPA + local data).
 * Full offline reload depends on SW install timing and is environment-sensitive;
 * shell caching is covered by public/sw.js + Settings offline note.
 */
async function unlockAndOnboard(page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const body = await page.locator('body').innerText()
  if (body.includes('Sign in') && body.includes('Email')) {
    test.skip(true, 'Cloud auth configured')
  }
  if (
    body.includes('Protect this desk') ||
    body.includes('access password') ||
    body.includes('Unlock desk') ||
    (await page.locator('.login-form, .login-page').count())
  ) {
    const inputs = page.locator('.login-form input, .login-page input, input')
    const n = await inputs.count()
    if (n >= 3) {
      await inputs.nth(0).fill('Offline Tester')
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
    await page
      .locator('#onboard-name, .onboard-panel input')
      .first()
      .fill('Offline Project')
    await onboardPrimary.first().click()
    await page.waitForTimeout(500)
  }
}

test.describe('Offline desk', () => {
  test('SPA path navigation works while offline', async ({ page, context }) => {
    await unlockAndOnboard(page)
    const path = page.getByRole('navigation', { name: /Your path/i })
    await expect(path).toBeVisible()

    // Warm views
    await path.getByRole('button', { name: /Step 3: Board/i }).click()
    await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible()
    await path.getByRole('button', { name: /Step 5: Pack/i }).click()
    await expect(page.locator('h1.page-title', { hasText: 'Pack' })).toBeVisible(
      { timeout: 10000 },
    )

    await context.setOffline(true)

    await path.getByRole('button', { name: /Step 2: Work/i }).click()
    await expect(
      page.locator('#current-step, #desk-capture, .step-focus-panel').first(),
    ).toBeVisible({ timeout: 8000 })

    await path.getByRole('button', { name: /Step 1: Project/i }).click()
    await expect(page.getByRole('heading', { name: 'Project' })).toBeVisible()

    await path.getByRole('button', { name: /Step 5: Pack/i }).click()
    await expect(page.locator('h1.page-title', { hasText: 'Pack' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Download vector PDF|Download PDF/i }),
    ).toBeVisible()

    // Desk data is local — Pack readiness UI still present offline
    await expect(page.getByText(/Ready|Download PDF|Thin pack/i).first()).toBeVisible()

    await context.setOffline(false)
  })
})
