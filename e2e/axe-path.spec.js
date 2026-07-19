import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * axe-core serious/critical on primary path views after local unlock.
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
    body.includes('Protect this desk') ||
    (await page.locator('.login-form, .login-page').count())
  ) {
    const inputs = page.locator('.login-form input, .login-page input, input')
    const n = await inputs.count()
    if (n >= 3) {
      await inputs.nth(0).fill('Axe Tester')
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
    await page.locator('#onboard-name, .onboard-panel input').first().fill('Axe Project')
    const step = page.locator('#onboard-step, .onboard-panel input').nth(1)
    if (await step.count()) await step.fill('Check a11y')
    await onboardPrimary.first().click()
    await page.waitForTimeout(500)
  }
}

async function expectNoCriticalAxe(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .disableRules([
      // Color contrast can false-positive on gradient/cover samples in brand UI
      'color-contrast',
    ])
    .analyze()
  const serious = results.violations.filter((v) =>
    ['critical', 'serious'].includes(v.impact)
  )
  if (serious.length) {
    const detail = serious
      .map(
        (v) =>
          `${v.id} (${v.impact}): ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(' '))
            .join('; ')}`
      )
      .join('\n')
    expect(serious, `${label}\n${detail}`).toEqual([])
  }
}

test.describe('axe path', () => {
  test('primary path views have no serious axe violations', async ({
    page,
  }) => {
    await unlockAndOnboard(page)
    const path = page.getByRole('navigation', { name: /Your path/i })
    await expect(path).toBeVisible()

    const steps = [
      [/Step 1: Define/i, 'Define'],
      [/Step 2: Research/i, 'Research'],
      [/Step 3: Ideate/i, 'Ideate'],
      [/Step 4: Sketch/i, 'Sketch'],
      [/Step 5: Design/i, 'Design'],
      [/Step 6: Review/i, 'Review'],
      [/Step 7: Deliver/i, 'Deliver'],
    ]

    for (const [nav, label] of steps) {
      await path.getByRole('button', { name: nav }).click()
      await page.waitForTimeout(350)
      await expectNoCriticalAxe(page, label)
    }
  })
})
