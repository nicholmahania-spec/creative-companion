import { test, expect } from '@playwright/test'
import {
  headingForStep,
  openBriefFieldChapter,
  openTool,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

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
    /* The N/7 progress pill this asserted was removed deliberately in
       c52ddff. Soft Signal seeding is proved below by the seeded field
       values themselves, which is the stronger check anyway — the pill only
       ever counted them. */

    await stepByIdIn(path, 'define').click()
    await expect(headingForStep(page, 'define').first()).toBeVisible()
    // `goal` sits in a later chapter, and the sheet opens on chapter 01.
    const goalField = await openBriefFieldChapter(page, 'goal')
    await expect(goalField).toBeVisible({ timeout: 8000 })
    const goal = await goalField.inputValue()
    expect(goal.length).toBeGreaterThan(10)

    // Demo seeds leave-behind ★ pins
    await stepByIdIn(path, 'design').click()
    await expect(headingForStep(page, 'design').first()).toBeVisible()
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

    await stepByIdIn(path, 'research').click()
    await expect(headingForStep(page, 'research').first()).toBeVisible()
    await expect(
      page.locator('.mood-board.has-pins, .mood-card').first()
    ).toBeVisible({ timeout: 8000 })

    /* Ideate is a Tool now, not stop 3 — reached through the Tools menu so
       this keeps testing the screen instead of dropping it. */
    await openTool(page, /^Ideate$/i)
    await expect(page.getByRole('heading', { name: 'Ideate' })).toBeVisible()
    await expect(page.locator('#dir-title-a')).toHaveValue(/.+/, {
      timeout: 5000,
    })
  })
})
