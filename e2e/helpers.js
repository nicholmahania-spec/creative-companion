/**
 * Shared Playwright unlock + onboard for local desk gate.
 */
export async function unlockAndOnboard(
  page,
  { name = 'E2E Project', step = 'First draft step' } = {}
) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const body = await page.locator('body').innerText()
  if (body.includes('Sign in') && body.includes('Email')) {
    return { skipped: true, reason: 'Cloud auth configured' }
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
    const nameEl = page
      .locator('#onboard-name, .onboard-panel input, .onboard-input')
      .first()
    if (await nameEl.count()) {
      await nameEl.fill(name)
      const stepEl = page
        .locator('#onboard-step, .onboard-panel input, .onboard-input')
        .nth(1)
      if (await stepEl.count()) await stepEl.fill(step)
    }
    await onboardPrimary.first().click()
    await page.waitForTimeout(500)
  }

  return { skipped: false }
}

export async function pathNav(page) {
  return page.getByRole('navigation', { name: /Your path/i })
}
