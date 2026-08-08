import { test, expect } from '@playwright/test'
import { skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * Ticking an extra must not silently drop the brand package.
 *
 * A cold-start tester ticked three items from QUOTED SEPARATELY — meaning
 * to ADD them to a full identity — and the scope line changed from "full
 * brand package · 5 stops" to "3 deliverables". The job was now scoped with
 * no logo, no colour and no type, and the summary line was the only thing
 * that said so. They caught it by reading carefully; a designer who did not
 * would have started a full identity project scoped as three items.
 */
test('ticking extras keeps the full package', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Scope Trap' })
  skipIfCloud(test, gate)

  await page.getByRole('button', { name: /^New project$/ }).first().click()
  const chip = page.locator('.create-scope-chip')
  await expect(chip).toBeVisible({ timeout: 8000 })
  await expect(chip).toContainText(/full brand package/i)

  // The tester's exact three, all from "Quoted separately".
  for (const label of ['Packaging', 'Signage or vehicle graphics', 'Brochures or print material']) {
    await page.locator('.create-check', { hasText: label }).first().click()
    await page.waitForTimeout(150)
  }

  /* The core deliverables are now ticked ON SCREEN rather than merely
     implied — what the designer sees is what the project gets. */
  for (const label of ['Primary logo', 'Color palette', 'Typefaces']) {
    const box = page.locator('.create-check', { hasText: label }).first()
    await expect(box, `${label} should be ticked`).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  }
  // and the extras the designer actually asked for are ticked too
  await expect(
    page.locator('.create-check', { hasText: 'Packaging' }).first()
  ).toHaveAttribute('aria-pressed', 'true')

  // The path is still a full identity, not a three-item job.
  await expect(chip).not.toContainText(/3 deliverables/i)
})

test('a genuine logo-only job can still be picked in one tick', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Scope Narrow' })
  skipIfCloud(test, gate)

  await page.getByRole('button', { name: /^New project$/ }).first().click()
  const chip = page.locator('.create-scope-chip')
  await expect(chip).toBeVisible({ timeout: 8000 })

  /* Narrowing on purpose must stay a single action — the fix must not have
     made small jobs harder to express than big ones. */
  await page.locator('.create-check', { hasText: 'Primary logo' }).first().click()
  await page.waitForTimeout(200)

  await expect(chip).toContainText(/logo only/i)
  await expect(
    page.locator('.create-check', { hasText: 'Typefaces' }).first()
  ).toHaveAttribute('aria-pressed', 'false')
})
