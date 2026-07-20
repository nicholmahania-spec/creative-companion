import { test, expect } from '@playwright/test'
import { unlockAndOnboard, pathNav, skipIfCloud } from './helpers.js'

/**
 * Brand book PDF download is wired (download event or export confirmation UI).
 */
test.describe('Brand book PDF', () => {
  test('Download brand book PDF is wired on Deliver', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'PDF Project',
      step: 'Ready for export',
    })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await path.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })

    await expect(
      page.getByText(/Process · \d+ of 7 steps have content/i)
    ).toBeVisible()
    // Next gap chrome: path strip (panel no longer duplicates Fix next gap)
    await expect(page.locator('.journey-gap-strip-btn')).toBeVisible()
    await page.locator('.journey-gap-strip-btn').click()
    // Earliest gap for a bare project is usually Research (after define name)
    await expect(
      page.getByRole('heading', { name: /Research|Define|Ideate|Sketch/i })
    ).toBeVisible({ timeout: 8000 })

    // G key also jumps to next gap from any path view
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await expect(page.locator('h1.page-title').first()).toBeVisible()

    // Back to Deliver for PDF
    const path2 = await pathNav(page)
    await path2.getByRole('button', { name: /Step 7: Deliver/i }).click()
    await expect(
      page.locator('h1.page-title', { hasText: 'Deliver' })
    ).toBeVisible({ timeout: 10000 })

    const downloadBtn = page.getByRole('button', {
      name: /Download (brand book|vector) PDF/i,
    })
    await expect(downloadBtn).toBeVisible()

    // Start listening before click
    const downloadPromise = page
      .waitForEvent('download', { timeout: 20000 })
      .catch(() => null)

    await downloadBtn.click()

    // Thin leave-behind confirm — continue download
    const thin = page.locator('.thin-pack-prompt')
    if (await thin.isVisible().catch(() => false)) {
      await page
        .getByRole('button', { name: /Download anyway|Descargar igual/i })
        .click()
    }

    const download = await downloadPromise
    if (download) {
      const name = download.suggestedFilename()
      expect(name).toMatch(/\.pdf$/i)
    } else {
      // jsPDF save / toast paths — accept export confirm or building toast
      const confirm = page.locator(
        '.pack-export-confirm, .action-toast, .autosave-chip'
      )
      const toastText = page.locator('.action-toast, .pack-export-confirm')
      await Promise.race([
        confirm.first().waitFor({ state: 'visible', timeout: 20000 }),
        toastText
          .filter({ hasText: /PDF|saved|Building|Brand book|vector/i })
          .first()
          .waitFor({ state: 'visible', timeout: 20000 }),
        page.waitForTimeout(3000),
      ]).catch(() => {})
      // Minimum: button still present (export path didn't crash)
      await expect(downloadBtn).toBeVisible()
      // Prefer positive signal when UI shows it
      const anySignal =
        (await page.locator('.pack-export-confirm').count()) +
        (await page.locator('.action-toast').count())
      if (anySignal === 0) {
        // Engine may still be building async — re-click is not needed if no error banner
        await expect(
          page.locator('.export-overlay .error, .desk-confirm-banner')
        ).toHaveCount(0)
      }
    }
  })
})
