import { test, expect } from '@playwright/test'

/**
 * The reveal route (/d/:portalId) — the client's side of the delivery moment.
 *
 * What this can prove without a Supabase project attached: that the route
 * exists, that it renders its OWN page rather than booting the studio app
 * shell behind it, and that a client who follows a link to something not yet
 * delivered is told so in words instead of being shown a blank screen or a
 * login form.
 *
 * That last one is the failure worth a test. This suite runs with Supabase
 * deliberately unset (see playwright.config.js), which is the same code path a
 * real client hits when the backend is unreachable — and the worst version of
 * it is a stranger staring at an empty page with no idea whether their
 * designer sent them the wrong link.
 *
 * The delivered-book path needs a live portal row and is covered by the unit
 * tests around brandDelivery.js plus a manual run against a real project.
 */
test.describe('brand reveal link', () => {
  test('renders its own page, not the studio app', async ({ page }) => {
    await page.goto('/d/00000000-0000-4000-8000-000000000000')

    // The reveal's own shell, not the app's.
    await expect(page.locator('.reveal-page')).toBeVisible()
    // No studio chrome leaked in: a client must never see the sidebar, the
    // journey bar, or the password gate.
    await expect(page.locator('.app-sidebar')).toHaveCount(0)
    await expect(page.locator('.step-rail')).toHaveCount(0)
  })

  test('says plainly when there is nothing to open yet', async ({ page }) => {
    await page.goto('/d/00000000-0000-4000-8000-000000000000')

    const message = page.locator('.reveal-status[role="alert"]')
    await expect(message).toBeVisible()
    const text = (await message.textContent()) || ''
    expect(text.trim().length).toBeGreaterThan(0)
    // No driver-speak, no error codes, no dead end.
    expect(text).not.toMatch(/undefined|null|\[object|PGRST|fetch failed/i)
  })
})
