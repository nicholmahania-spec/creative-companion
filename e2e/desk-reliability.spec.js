import { test, expect } from '@playwright/test'

/**
 * Desk reliability: local unlock → path → Pack dual export · Esc overlays.
 */
async function unlockAndOnboard(page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const body = await page.locator('body').innerText()
  if (body.includes('Sign in') && body.includes('Email')) {
    test.skip(true, 'Cloud auth configured — needs credentials')
  }

  if (
    body.includes('Create an access password') ||
    body.includes('access password') ||
    body.includes('Protect this desk')
  ) {
    const inputs = page.locator('input')
    const n = await inputs.count()
    if (n >= 3) {
      await inputs.nth(0).fill('E2E Tester')
      await inputs.nth(1).fill('testpass123')
      await inputs.nth(2).fill('testpass123')
    } else if (n >= 1) {
      await inputs.nth(0).fill('testpass123')
    }
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(800)
  }

  const onboardPrimary = page.locator(
    '.onboard-primary, .onboard-panel .btn-primary'
  )
  if (await onboardPrimary.count()) {
    const name = page.locator('#onboard-name, .onboard-panel input').first()
    if (await name.count()) {
      await name.fill('E2E Reliability')
      const step = page.locator('#onboard-step, .onboard-panel input').nth(1)
      if (await step.count()) await step.fill('Ship one step')
    }
    await onboardPrimary.first().click()
    await page.waitForTimeout(500)
  }
}

test.describe('Desk reliability', () => {
  test('Pack shows Download PDF and Print / Save as PDF', async ({ page }) => {
    await unlockAndOnboard(page)
    const path = page.getByRole('navigation', { name: /Your path/i })
    await expect(path).toBeVisible()
    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole('button', { name: 'Print / Save as PDF', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Download vector PDF', exact: true })
    ).toBeVisible()
    await expect(
      page.locator('.pack-export-hint').filter({ hasText: /vector PDF/i })
    ).toBeVisible()
  })

  test('Esc closes Tools menu', async ({ page }) => {
    await unlockAndOnboard(page)
    await page.getByRole('button', { name: 'Tools' }).click()
    await expect(page.locator('#tools-menu, .more-menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('#tools-menu, .more-menu')).toHaveCount(0)
  })

  test('Esc closes export preview overlay', async ({ page }) => {
    await unlockAndOnboard(page)
    const path = page.getByRole('navigation', { name: /Your path/i })
    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })
    // Preview full lives under More actions (v1.15+)
    await page
      .locator('summary.pack-more-summary, details.pack-more-actions summary')
      .first()
      .click()
    await page.getByRole('button', { name: 'Preview full' }).click()
    await expect(page.getByRole('dialog', { name: /Brand direction pack/i })).toBeVisible({
      timeout: 8000,
    })
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('dialog', { name: /Brand direction pack/i })
    ).toHaveCount(0)
  })
})
