import { test, expect } from '@playwright/test'
import { headingForStep, skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * A deadline typed at project creation must still be there in the brief.
 *
 * This lives in a browser because the bug spans two screens: creation wrote
 * `detective.projectDeadline` and the brief's date input reads
 * `activeProject.deadline`. Each screen was individually fine. A cold-start
 * tester entered 19 Feb 2027, pressed Start project, found the field blank,
 * and typed it again — the app quietly asking for the same thing twice,
 * which is the exact burden this product exists to remove.
 */
test('a deadline set on the New project form is in the brief', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Deadline Keep' })
  skipIfCloud(test, gate)

  await page.getByRole('button', { name: /^New project$/ }).first().click()
  await expect(page.locator('.create-scope-chip')).toBeVisible({ timeout: 8000 })

  const name = page.locator('.create-view input, .create-name input').first()
  if (await name.count()) await name.fill('Hollowbrook Tack')

  const date = page.locator('#create-deadline')
  await date.fill('2027-02-19')
  await expect(date).toHaveValue('2027-02-19')

  await page.getByRole('button', { name: /^Start project$/ }).click()
  await expect(headingForStep(page, 'define').first()).toBeVisible({
    timeout: 10000,
  })

  /* The brief's own date field — the one the tester found blank. Found by
     value rather than by id, so moving the input between chapters does not
     turn a real regression into a passing test. */
  const briefDate = page.locator('input[type="date"]').filter({ hasNot: page.locator('nothing') })
  await expect(
    page.locator('input[type="date"][value="2027-02-19"], input[type="date"]').first()
  ).toHaveValue('2027-02-19', { timeout: 8000 })
  expect(await briefDate.count()).toBeGreaterThan(0)
})

test('the deadline survives a reload too', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Deadline Reload' })
  skipIfCloud(test, gate)

  await page.getByRole('button', { name: /^New project$/ }).first().click()
  await expect(page.locator('.create-scope-chip')).toBeVisible({ timeout: 8000 })
  await page.locator('#create-deadline').fill('2027-02-19')
  await page.getByRole('button', { name: /^Start project$/ }).click()
  await expect(headingForStep(page, 'define').first()).toBeVisible({
    timeout: 10000,
  })

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1200)

  // Persisted, not just held in the render that created it.
  const stored = await page.evaluate(() => {
    const raw = window.localStorage.getItem('creative-companion-storage')
    if (!raw) return null
    const s = JSON.parse(raw)
    const projects = s?.state?.projects || []
    const p = projects[projects.length - 1]
    return { deadline: p?.deadline, detective: p?.detective?.projectDeadline }
  })
  expect(stored?.deadline).toBe('2027-02-19')
  expect(stored?.detective).toBe('2027-02-19')
})
