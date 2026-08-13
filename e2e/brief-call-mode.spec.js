import { test, expect } from '@playwright/test'
import { unlockAndOnboard, skipIfCloud } from './helpers.js'

/**
 * ONE BRIEF, TWO CAPTURE MODES.
 *
 * The client answers the canonical schema themselves at /f/:shareId; call
 * mode is the designer answering the SAME schema while the client talks. The
 * retired Discovery modal's script had its own 30-field store, which is how
 * the two drifted — so the assertion that matters here is not that call mode
 * works, but that it writes to `detective` and leaves `discoveryAnswers`
 * alone.
 */
test('Brief call mode captures into detective', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 })
  const gate = await unlockAndOnboard(page, { name: 'Call Mode', testerName: 'T', expectOnboardDialog: true })
  skipIfCloud(test, gate)
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })
  await page.locator('.cc-stage-path .cc-stage-stop', { hasText: /^Brief$/ }).first().click()
  await expect(page.locator('.cc-stage--define')).toBeVisible({ timeout: 10000 })

  const before = await page.locator('.cc-stage--define .define-field').count()
  await page.getByRole('button', { name: 'Call mode' }).click()
  const during = await page.locator('.cc-stage--define .define-field').count()

  // Type into whatever the first question is, then advance and come back.
  const input = page.locator('.cc-stage--define .define-field').first().locator('input, textarea').first()
  await input.fill('Harbor & Hearth')
  await page.getByRole('button', { name: /Next question/ }).click()
  await page.getByRole('button', { name: /Previous/ }).click()
  const restored = await page.locator('.cc-stage--define .define-field').first().locator('input, textarea').first().inputValue()

  await page.waitForTimeout(2000) // let the store's coalesced write flush
  const store = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('creative-companion-storage') || '{}')
    const st = raw.state || {}
    const p = (st.projects || []).find((x) => x.id === st.currentProjectId) || {}
    return {
      detectiveKeys: Object.keys(p.detective || {}).length,
      discoveryKeys: Object.keys(p.discoveryAnswers || {}).length,
      detectiveHasValue: Object.values(p.detective || {}).some((v) => String(v).includes('Harbor')),
    }
  })
  expect(before).toBeGreaterThan(10)          // the whole sheet, normally
  expect(during).toBe(1)                       // one question at a time on a call
  expect(restored).toBe('Harbor & Hearth')     // leaving and returning loses nothing
  expect(store.detectiveHasValue).toBe(true)   // canonical store got it
  expect(store.discoveryKeys).toBe(0)          // and the retired schema did not
})
