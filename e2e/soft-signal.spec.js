import { test, expect } from '@playwright/test'
import { unlockAndOnboard, pathNav, skipIfCloud } from './helpers.js'

/**
 * Soft Signal demo replaces workspace and seeds 7-step process fields.
 */
test.describe('Soft Signal demo', () => {
  test('loads demo with replace warning and detective seed', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Before Demo',
      step: 'Will be replaced',
    })
    skipIfCloud(test, gate)

    // Settings is on Tools (and account) — prefer Tools for discoverability
    await page.getByRole('button', { name: 'Tools' }).click()
    await page
      .locator('#tools-menu, .more-menu')
      .getByRole('menuitem', { name: /Settings/i })
      .click()
    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible({
      timeout: 8000,
    })

    // Demo loader lives in the collapsed Advanced group
    await page
      .locator('summary')
      .filter({ hasText: /Advanced/i })
      .first()
      .click()
    await page.getByRole('button', { name: /^Soft Signal$/i }).click()

    const banner = page.locator('.desk-confirm-banner')
    await expect(banner).toBeVisible({ timeout: 5000 })
    await expect(banner).toContainText(/Replaces/i)
    await banner.getByRole('button', { name: /Continue|Continuar/i }).click()
    await page.waitForTimeout(1000)

    // .first() can land on the aria-hidden mobile-only title (same text,
    // earlier in DOM order, hidden at desktop widths) — scope to visible
    // elements so the assertion targets the one actually on screen.
    await expect(
      page.locator(':visible', { hasText: /Soft Signal/i }).first()
    ).toBeVisible({
      timeout: 12000,
    })

    // Short tour opens after the demo import — dismiss it
    const dots = page.locator('.demo-tour-dots span')
    if ((await dots.count()) >= 7) {
      await page
        .getByRole('button', { name: /^(Skip|Stay)$/i })
        .first()
        .click()
      await page.waitForTimeout(300)
    }

    const path = await pathNav(page)
    // Soft Signal seeds content — progress pill should show > 0
    const pill = page.locator('.journey-progress-pill')
    await expect(pill).toBeVisible()
    const pillText = await pill.innerText()
    const n = Number(String(pillText).split('/')[0])
    expect(n).toBeGreaterThanOrEqual(3)

    await path.getByRole('button', { name: /Step 1: Define/i }).click()
    await expect(page.getByRole('heading', { name: 'Define' })).toBeVisible()
    await expect(page.locator('#detective-goal')).toBeVisible({
      timeout: 8000,
    })
    const goal = await page.locator('#detective-goal').inputValue()
    expect(goal.length).toBeGreaterThan(10)

    // Design keeps the N/7 pill; demo seeds leave-behind ★ pins
    await path.getByRole('button', { name: /Step 5: Design/i }).click()
    await expect(page.getByRole('heading', { name: 'Design' })).toBeVisible()
    await expect(page.locator('.journey-progress-pill')).toBeVisible()
    await expect(page.getByText(/★\s*[1-9]\/6/).first()).toBeVisible({
      timeout: 5000,
    })
    // Brand kit fields seeded — messaging + imagery live in collapsed
    // sub-accordions, so assert seeded values, not visibility
    await page.getByRole('tab', { name: /^Words$/i }).click()
    await expect(page.locator('#msg-promise')).toHaveValue(/.{10,}/, {
      timeout: 5000,
    })
    await page.getByRole('tab', { name: /^Pack$/i }).click()
    await expect(page.locator('#img-style')).toHaveValue(/.{5,}/, {
      timeout: 5000,
    })

    await path.getByRole('button', { name: /Step 2: Research/i }).click()
    await expect(page.getByRole('heading', { name: 'Research' })).toBeVisible()
    await expect(
      page.locator('.mood-board.has-pins, .mood-card').first()
    ).toBeVisible({ timeout: 8000 })

    await path.getByRole('button', { name: /Step 3: Ideate/i }).click()
    await expect(page.getByRole('heading', { name: 'Ideate' })).toBeVisible()
    await expect(page.locator('#dir-title-a')).toHaveValue(/.+/, {
      timeout: 5000,
    })
  })
})
