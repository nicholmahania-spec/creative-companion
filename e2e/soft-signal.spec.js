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

    await page
      .getByRole('button', { name: /Load Soft Signal demo/i })
      .click()

    const banner = page.locator('.desk-confirm-banner')
    await expect(banner).toBeVisible({ timeout: 5000 })
    await expect(banner).toContainText(/Replaces/i)
    await banner.getByRole('button', { name: /Continue|Continuar/i }).click()
    await page.waitForTimeout(1000)

    await expect(page.getByText(/Soft Signal/i).first()).toBeVisible({
      timeout: 12000,
    })

    const dots = page.locator('.demo-tour-dots span')
    if ((await dots.count()) >= 7) {
      expect(await dots.count()).toBeGreaterThanOrEqual(7)
      await page
        .getByRole('button', { name: /Skip tour|Stay here|Open Deliver/i })
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

    // Design still has path gap strip (not per-step Gap · G)
    await path.getByRole('button', { name: /Step 5: Design/i }).click()
    await expect(page.getByRole('heading', { name: 'Design' })).toBeVisible()
    await expect(page.locator('.journey-gap-strip')).toBeVisible()
    await expect(page.locator('.journey-progress-pill')).toBeVisible()
  })
})
