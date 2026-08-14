import { test, expect } from '@playwright/test'
import { unlockAndOnboard, skipIfCloud } from './helpers.js'

/**
 * The /f/ link's controls live on the Brief.
 *
 * `revokeDiscoveryShare` used to have exactly one call site — inside the
 * studio Discovery modal — so retiring that modal without this would have
 * left a live client link with no way to kill it. This pins the new home.
 */
test('the Brief owns the client link controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 })
  const gate = await unlockAndOnboard(page, { name: 'Client Link', testerName: 'T', expectOnboardDialog: true })
  skipIfCloud(test, gate)
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })
  await page.locator('.cc-stage-path .cc-stage-stop', { hasText: /^Brief$/ }).first().click()
  await expect(page.locator('.cc-stage--define')).toBeVisible({ timeout: 10000 })

  const group = page.locator('.cc-stage--define .brief-client-link')
  await expect(group).toBeVisible()
  // No cloud in e2e, so the create path is the reachable one; revoke appears
  // once a share exists. Both are proven reachable at the source level by
  // discoveryIntakeRetired.test.js.
  await expect(group.getByRole('button', { name: /Create client link/i })).toBeVisible()
})
