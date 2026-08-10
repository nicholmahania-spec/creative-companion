import { test, expect } from '@playwright/test'
import { headingForStep, pathNav, skipIfCloud, stepByIdIn, unlockAndOnboard } from './helpers.js'

/**
 * The Touchpoints stop does its job, and can actually be completed.
 *
 * This exists because the stop was silently gutted and every check stayed
 * green for weeks. `b90e24e` overwrote `SketchView.jsx` — whose parent version
 * WAS the Touchpoints screen — with a general step view. The heading kept
 * reading "Touchpoints" because it comes from `labelForStepId`, so the page
 * went on naming a job it no longer did.
 *
 * The damage was structural, not cosmetic:
 *   - `touchpointApps` had NO writer anywhere in src/
 *   - `journeyProgress.js` gates this stop on that field
 *   - so the stop could never complete, for anyone, ever
 *   - and the brand book's applications page reads the same field
 *
 * Nothing caught it. No unit test renders this view; an empty object is a
 * perfectly valid empty object; the build was clean. It was found by opening
 * the app and looking at the screen.
 *
 * THEN THE FIX ITSELF SHIPPED A CRASH that the build and 905 unit tests both
 * called fine: the restored block referenced `projectPalette`, which this
 * file no longer declared, so the view threw `ReferenceError` at render the
 * moment a surface existed. React's error boundary swallowed it into "This
 * screen stopped loading", so it did not even surface as a page error. That
 * is the specific reason this spec drives the flow rather than asserting on
 * markup: the empty state renders fine in both the working and broken
 * versions, and only ADDING A SURFACE tells them apart.
 */

test('Touchpoints can be filled in, and the note is kept', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Touchpoints Walk' })
  skipIfCloud(test, gate)

  const path = await pathNav(page)
  await stepByIdIn(path, 'sketch').click()
  await expect(headingForStep(page, 'sketch').first()).toBeVisible({
    timeout: 10000,
  })

  // Empty state: a brief with no surfaces must still offer a way forward,
  // rather than sending the designer back to Strategy to become completable.
  const quick = page.locator('.touchpoints-quick button')
  await expect(quick.first()).toBeVisible()

  await quick.filter({ hasText: /Website/i }).first().click()

  /* The assertion that would have caught the ReferenceError. A crash here
     renders the error boundary, so the card never appears. */
  const card = page.locator('.touchpoints-card').first()
  await expect(card, 'adding a surface must not crash the view').toBeVisible({
    timeout: 8000,
  })
  await expect(page.getByText('This screen stopped loading')).toHaveCount(0)

  // The mock the book will draw, previewed in the brand's own colours.
  await expect(card.locator('.tp-mock')).toBeVisible()
  /* Application mocks lead the stage — desk tasks are optional chrome. */
  await expect(page.locator('.touchpoints-block')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Application mocks/i })
  ).toBeVisible()
  await expect(page.locator('.touchpoints-desk-optional')).toBeVisible()
  await expect(page.locator('.touchpoints-proof-line')).toHaveText(
    /Nothing recorded yet/
  )
  await expect(
    page.getByRole('button', { name: /Upload finished files in Assets/i })
  ).toBeVisible()

  await card.locator('textarea').first().fill('Logo top-left, 24px clear space')

  // The note reaches the store — this is the write path whose absence made
  // the stop uncompletable.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const raw = localStorage.getItem('creative-companion-storage')
          if (!raw) return null
          const p = (JSON.parse(raw)?.state?.projects || [])[0] || {}
          return p.touchpointApps?.website?.note || null
        }),
      { timeout: 8000 }
    )
    .toContain('24px clear space')
})

test('Touchpoints status is worded, never a fraction', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Touchpoints Words' })
  skipIfCloud(test, gate)

  const path = await pathNav(page)
  await stepByIdIn(path, 'sketch').click()
  await expect(headingForStep(page, 'sketch').first()).toBeVisible({
    timeout: 10000,
  })

  await page.locator('.touchpoints-quick button').first().click()
  const status = page.locator('.touchpoints-status')
  await expect(status).toBeVisible()

  /* A count reads as a score to fall short of, and this stop needs only ONE
     surface noted — so a fraction would misreport the ask and leave a visible
     remainder to finish. `touchpointsStatus.test.js` pins the same rule on the
     function; this pins it on what actually reaches the screen. */
  await expect(status).not.toHaveText(/\d+\s*(of|\/)\s*\d+/)
})

test('no duplicate focus timer on Touchpoints', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Touchpoints Timer' })
  skipIfCloud(test, gate)

  const path = await pathNav(page)
  await stepByIdIn(path, 'sketch').click()
  await expect(headingForStep(page, 'sketch').first()).toBeVisible({
    timeout: 10000,
  })

  /* This screen carried the last copy of the duplicated timer, and it was the
     loudest thing on it — a "not started" readout at display size, dominating
     a work page while the designer was demonstrably working. The real Timer
     lives on Tools. Same guard as no-dead-timer.spec.js, which covers the
     other five screens this was removed from. */
  await expect(page.locator('.insights-timer')).toHaveCount(0)
  await expect(page.locator('.insights-focus-actions')).toHaveCount(0)
  await expect(page.getByText('not started', { exact: true })).toHaveCount(0)
})
