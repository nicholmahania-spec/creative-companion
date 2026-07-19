import { test, expect } from '@playwright/test'

/**
 * Lightweight path a11y checks (no axe dependency):
 * landmarks, skip link target, journey labels, dialogs.
 */
async function unlockAndOnboard(page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const body = await page.locator('body').innerText()
  if (body.includes('Sign in') && body.includes('Email')) {
    test.skip(true, 'Cloud auth configured')
  }
  if (
    body.includes('Create an access password') ||
    body.includes('access password') ||
    body.includes('Protect this desk')
  ) {
    const inputs = page.locator('input')
    const n = await inputs.count()
    if (n >= 3) {
      await inputs.nth(0).fill('A11y Tester')
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
    // Onboarding is a modal with title + path
    await expect(
      page.getByRole('dialog', { name: /One project/i })
    ).toBeVisible()
    await expect(page.locator('#onboard-desc')).toBeVisible()
    const name = page.locator('#onboard-name, .onboard-panel input').first()
    await name.fill('A11y Project')
    await onboardPrimary.first().click()
    await page.waitForTimeout(400)
  }
}

test.describe('Path accessibility', () => {
  test('landmarks and path after unlock', async ({ page }) => {
    await unlockAndOnboard(page)

    await expect(page.locator('main#main-content')).toBeVisible()
    await expect(page.locator('header').first()).toBeVisible()
    await expect(page.locator('footer[role="contentinfo"]')).toBeVisible()

    const path = page.getByRole('navigation', { name: /Your path/i })
    await expect(path).toBeVisible()
    // Ordered steps with accessible names
    for (const label of [
      /Step 1: Define/i,
      /Step 2: Research/i,
      /Step 3: Ideate/i,
      /Step 4: Sketch/i,
      /Step 5: Design/i,
      /Step 6: Review/i,
      /Step 7: Deliver/i,
    ]) {
      await expect(path.getByRole('button', { name: label })).toBeVisible()
    }

    // Skip link exists (may be visually hidden until focus)
    await expect(page.locator('a.skip-link')).toHaveAttribute(
      'href',
      '#main-content'
    )

    // Tools / account menus expose popup pattern
    await expect(page.getByRole('button', { name: 'Tools' })).toHaveAttribute(
      'aria-haspopup',
      'menu'
    )
  })

  test('each path step has a page heading', async ({ page }) => {
    await unlockAndOnboard(page)
    const path = page.getByRole('navigation', { name: /Your path/i })
    const steps = [
      [/Step 1: Define/i, 'Define'],
      [/Step 2: Research/i, 'Research'],
      [/Step 3: Ideate/i, 'Ideate'],
      [/Step 4: Sketch/i, 'Sketch'],
      [/Step 5: Design/i, 'Design'],
      [/Step 6: Review/i, 'Review'],
      [/Step 7: Deliver/i, 'Deliver'],
    ]
    for (const [nav, heading] of steps) {
      await path.getByRole('button', { name: nav }).click()
      await page.waitForTimeout(200)
      if (heading) {
        await expect(
          page.getByRole('heading', { name: heading }).first()
        ).toBeVisible({ timeout: 8000 })
      } else {
        // Work: current step region or capture
        await expect(
          page.locator('#current-step, #desk-capture, .step-focus-panel').first()
        ).toBeVisible()
      }
    }
  })
})
