import { test, expect } from '@playwright/test'
import {
  headingForStep,
  labelForStep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * Offline desk (honest scope):
 * After path chunks are *warmed while online*, SPA hops still work offline.
 * This does NOT prove a cold offline install or full PWA precache — only
 * in-session navigation + already-fetched modules + local desk data.
 */
test.describe('Offline desk', () => {
  test('warmed SPA path navigation works while offline', async ({ page, context }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Offline Project',
      testerName: 'Offline Tester',
    })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await expect(path).toBeVisible()

    // Warm lazy path chunks while online so offline SPA hops still work
    await stepByIdIn(path, 'research').click()
    await expect(headingForStep(page, 'research').first()).toBeVisible()
    await stepByIdIn(path, 'sketch').click()
    /* The stop's own heading, derived. `#current-step`, `#desk-capture` and
       `.step-focus-panel` were all internals of the pre-rebuild Sketch screen
       and none of them survives d56c203 — but what this line is for is only
       "the lazy chunk for this stop loaded", which the heading answers. */
    await expect(headingForStep(page, 'sketch').first()).toBeVisible({
      timeout: 10000,
    })
    await stepByIdIn(path, 'define').click()
    await expect(headingForStep(page, 'define').first()).toBeVisible()
    await stepByIdIn(path, 'deliver').click()
    /* Two h1s answer to the stop's name on a stage — the stage's own sr-only
       heading (Workroom's `aria-labelledby` target) and the masthead display
       title — so take the first rather than tripping strict mode on a page
       that is correct. Same note as `path-smoke.spec.js`. */
    await expect(
      page.getByRole('heading', { level: 1, name: labelForStep('deliver') }).first()
    ).toBeVisible({ timeout: 10000 })

    await context.setOffline(true)

    await stepByIdIn(path, 'sketch').click()
    await expect(headingForStep(page, 'sketch').first()).toBeVisible({
      timeout: 8000,
    })

    await stepByIdIn(path, 'define').click()
    await expect(headingForStep(page, 'define').first()).toBeVisible()

    await stepByIdIn(path, 'deliver').click()
    await expect(
      page.getByRole('heading', { level: 1, name: labelForStep('deliver') }).first()
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: /Brand book PDF/i,
      })
    ).toBeVisible()

    /* Scoped to the open stage. A bare page-wide text match takes the first
       node in DOM order, and the shell's `.header-back` now sorts ahead of
       Delivery's own copy while being hidden under the stage — so the query
       resolved to a control that is not what this line is about. */
    await expect(
      page
        .locator('.cc-stage:not(.is-suspended)')
        .getByText(
          /Ready|Download PDF|Thin pack|leave-behind|client pack|brand book|Not ready/i
        )
        .first()
    ).toBeVisible()

    await context.setOffline(false)
  })
})
