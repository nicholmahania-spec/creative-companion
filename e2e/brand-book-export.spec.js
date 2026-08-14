import { test, expect } from '@playwright/test'
import { labelForStep, pathNav, skipIfCloud, stepByIdIn, unlockAndOnboard } from './helpers.js'

/**
 * "Download brand book PDF" must never be a dead end.
 *
 * Two independent cold-start runs reported this button as doing nothing.
 * The cause was the save-file picker: when it is dismissed — or is not
 * usable, as in automation — the vector path returns `cancelled` and stops,
 * and the ONLY signal was a toast that dismisses itself. Miss the toast and
 * the button looks broken, on the single deliverable the client is paying
 * for. That is the worst place in the product to lose a file silently.
 */
test('a cancelled save leaves a way to finish, not a dead end', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Book Export' })
  skipIfCloud(test, gate)

  /* Force the picker to behave as a dismissal, which is exactly the state
     both testers hit. Without the fix this ends with no file and nothing
     on screen. */
  await page.addInitScript(() => {
    window.showSaveFilePicker = () =>
      Promise.reject(
        Object.assign(new Error('cancelled'), { name: 'AbortError' })
      )
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)

  const path = await pathNav(page)
  await stepByIdIn(path, 'deliver').click()
  /* Two h1s answer to the stop's name on a stage — the stage's own sr-only
     heading (Workroom's `aria-labelledby` target) and the masthead display
     title — so take the first rather than tripping strict mode on a page
     that is correct. Same note as `path-smoke.spec.js`. */
  await expect(
    page.getByRole('heading', { level: 1, name: labelForStep('deliver') }).first()
  ).toBeVisible({ timeout: 10000 })

  await page.getByRole('button', { name: /Download brand book PDF/i }).click()

  /* A PERSISTENT line, not a toast — the note stays next to the button so a
     designer who looked away still learns the file was not written. */
  const note = page.locator('.pack-export-confirm')
  await expect(note).toContainText(/Not saved/i, { timeout: 30000 })

  // and the remedy is offered right there, rather than left to be guessed
  await expect(
    note.getByRole('button', { name: /Download it now/i })
  ).toBeVisible()
})

test('the direct route actually produces a PDF', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Book Direct' })
  skipIfCloud(test, gate)

  await page.addInitScript(() => {
    window.showSaveFilePicker = () =>
      Promise.reject(
        Object.assign(new Error('cancelled'), { name: 'AbortError' })
      )
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)

  const path = await pathNav(page)
  await stepByIdIn(path, 'deliver').click()
  await page.getByRole('button', { name: /Download brand book PDF/i }).click()
  await expect(page.locator('.pack-export-confirm')).toContainText(/Not saved/i, {
    timeout: 30000,
  })

  /* The point of the whole fix: pressing the offered button yields a real
     file. Asserted on the download event, not on a toast. */
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.getByRole('button', { name: /Download it now/i }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
})
