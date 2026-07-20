import { test, expect } from '@playwright/test'
import { unlockAndOnboard, pathNav } from './helpers.js'

/**
 * Full process artifacts: detective → ideate → sketch why → design bump →
 * review notes → deliver handoff/learnings → brand book CTA.
 */
test.describe('Process walk (artifacts)', () => {
  test('fill detective through deliver fields', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'E2E Process Walk',
      step: 'Draft cover option A',
    })
    if (gate.skipped) test.skip(true, gate.reason)

    const path = await pathNav(page)
    await expect(path).toBeVisible()

    // 1 Define — detective sheet
    await path.getByRole('button', { name: /Step 1: Define/i }).click()
    await expect(page.getByRole('heading', { name: 'Define' })).toBeVisible()
    await expect(
      page.getByText('Design Detective Sheet', { exact: true })
    ).toBeVisible({ timeout: 8000 })
    await page.locator('#detective-goal').fill(
      'Make a calm cover system families can recognize in three seconds.'
    )
    await page.locator('#detective-audience').fill('Busy parents new to the program')
    await page.locator('#detective-feel').fill('Hopeful and clear — not hustle')
    await page.getByRole('button', { name: /Fill brief from sheet/i }).click()
    await page.getByRole('button', { name: /Go to Research/i }).first().click()

    // 2 Research — pin + star for leave-behind
    await expect(page.getByRole('heading', { name: 'Research' })).toBeVisible()
    await expect(page.getByText(/Curious spy checklist/i)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Start 20-min research timer/i })
    ).toBeVisible()
    // Open note pin form if present
    const noteBtn = page.getByRole('button', { name: /^Note$/i })
    if (await noteBtn.count()) {
      await noteBtn.click()
      const noteInput = page.locator(
        'input[placeholder*="twilight"], input[placeholder*="note" i], .board-note-input, #board-note'
      )
      if (await noteInput.count()) {
        await noteInput.first().fill('Calm indigo field — safe energy')
        await page.getByRole('button', { name: /Add pin/i }).click()
        await page.waitForTimeout(300)
        const star = page.locator('button.mood-pin-star').first()
        if (await star.count()) {
          await star.click({ force: true })
        }
      }
    }

    // 3 Ideate
    await path.getByRole('button', { name: /Step 3: Ideate/i }).click()
    await expect(page.getByRole('heading', { name: 'Ideate' })).toBeVisible()
    await page.getByRole('button', { name: /Opposite direction/i }).click()
    await page.locator('#dir-title-a').fill('Quiet editorial')
    await page.locator('#dir-title-b').fill('Warm product toolkit')
    await page
      .locator('.ideate-dir-card')
      .first()
      .getByRole('button', { name: /Choose|Chosen/i })
      .click()

    // 4 Sketch — why field
    await path.getByRole('button', { name: /Step 4: Sketch/i }).click()
    await expect(page.getByRole('heading', { name: 'Sketch' })).toBeVisible()
    const why = page.locator('#step-why')
    if (await why.count()) {
      await why.fill('Quiet hierarchy matches the detective goal')
    }

    // 5 Design — bump version
    await path.getByRole('button', { name: /Step 5: Design/i }).click()
    await expect(page.getByRole('heading', { name: 'Design' })).toBeVisible()
    await page.getByRole('button', { name: 'Bump', exact: true }).click()
    await expect(page.locator('#design-version')).toHaveValue(/v[2-9]/)

    // 6 Review — feedback notes
    await path.getByRole('button', { name: /Step 6: Review/i }).click()
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()
    await page
      .locator('#feedback-notes')
      .fill('Hierarchy clear. Keep guest line quieter.')

    // 7 Deliver — handoff + learnings + brand book CTA
    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })
    await page
      .locator('#handoff-note')
      .fill('Brand book PDF + mark direction. Contact for questions.')
    await page
      .locator('#learnings-note')
      .fill('What worked: detective sheet first. Next: more real photos.')
    await expect(
      page.getByRole('button', {
        name: /Download (brand book|vector) PDF/i,
      })
    ).toBeVisible()
  })
})
