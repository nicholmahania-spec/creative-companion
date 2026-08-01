import { test, expect } from '@playwright/test'
import {
  unlockAndOnboard,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  headingForStep,
  JOURNEY_STEPS,
} from './helpers.js'

/**
 * Path smoke: unlock → walk every stop in JOURNEY_STEPS; the quiet G strip
 * shows only while ON the earliest empty step (never shouts elsewhere).
 *
 * The N/7 progress pill this used to assert was deliberately removed in
 * c52ddff ("Remove progress pill from bottom of left sidebar"); the spec
 * kept waiting 5s for an element with no renderer and 19 orphaned CSS
 * rules. Those assertions are gone rather than re-pointed — there is no
 * replacement element, and inventing one to assert would be worse.
 */
test.describe('Creative Companion path smoke', () => {
  test('walk the whole design process after local unlock', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'E2E Pack Project',
      step: 'E2E first draft step',
    })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await expect(path).toBeVisible()
    // Still-thin list + step-fill chip intentionally removed (pill checkmarks own that signal)
    await expect(page.locator('.journey-still-thin')).toHaveCount(0)
    await expect(page.locator('.step-fill-chip')).toHaveCount(0)

    /* The property being tested is "the quiet strip shows on the earliest
       empty step and nowhere else". Which step that IS depends on what the
       stops now ask for, and it moved when the path was renamed — this used
       to hard-code Research, and asserting a specific stop tests the fixture
       rather than the rule. Walk the path and count instead. */
    const onGap = []
    for (const step of JOURNEY_STEPS) {
      await stepByIdIn(path, step.id).click()
      await expect(headingForStep(page, step.id).first()).toBeVisible()
      if (await page.locator('.journey-gap-strip.is-on-gap').count()) {
        onGap.push(step.id)
      }
      // No per-step Gap · G after chrome collapse, on any stop
      await expect(
        page.getByRole('button', { name: /^Gap · G$/i })
      ).toHaveCount(0)
    }
    expect(onGap).toHaveLength(1)

    /* The strip's quiet single-letter "G" button is gone: JourneyGapStrip
       now renders one button, `is-ship`, and only once the path is full.
       Asserted its absence rather than re-pointing at the ship button —
       they are different controls doing different jobs, and pretending
       otherwise would make this test pass while checking nothing. */
    await stepByIdIn(path, onGap[0]).click()
    await expect(page.locator('.journey-gap-strip.is-on-gap')).toBeVisible()
    await expect(page.locator('.journey-gap-strip-btn.is-quiet')).toHaveCount(0)

    await stepByIdIn(path, 'research').click()
    await expect(headingForStep(page, 'research').first()).toBeVisible()
    // Empty board: upload affordance, no second still-thin lecture
    await expect(page.getByText(/0 pins|Upload images/i).first()).toBeVisible()
    await expect(page.locator('.research-still-thin')).toHaveCount(0)

    /* The middle stops, whichever they are — Ideate and Review used to sit
       here and are Tools now, so this walks what JOURNEY_STEPS declares
       rather than a list that has to be edited on every rename. */
    for (const step of JOURNEY_STEPS.slice(2, -1)) {
      await stepByIdIn(path, step.id).click()
      await expect(headingForStep(page, step.id).first()).toBeVisible()
      // The strip never shouts while working later steps
      await expect(page.locator('.journey-gap-strip.is-on-gap')).toHaveCount(0)
    }

    const last = JOURNEY_STEPS[JOURNEY_STEPS.length - 1]
    await stepByIdIn(path, last.id).click()
    await expect(
      page.locator('h1.page-title', { hasText: last.label })
    ).toBeVisible({ timeout: 10000 })
    // The Deliver chip names the state, not a fraction ("Ready · 4/8" was a
    // number on a job whose scope made half the checks irrelevant).
    await expect(
      page.getByText(/Ready to ship|Still to add/i).first()
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Brand book PDF/i })
    ).toBeVisible()
    // Print lives under More formats now
    await page.locator('.deliver-advanced summary', { hasText: 'More formats' }).click()
    await expect(
      page.getByRole('button', { name: 'Print', exact: true })
    ).toBeVisible()

    // Keyboard 1-5 maps to the path in order, so key N is JOURNEY_STEPS[N-1].
    const fourth = JOURNEY_STEPS[3]
    await page.keyboard.press(fourth.num)
    await expect(headingForStep(page, fourth.id).first()).toBeVisible({
      timeout: 8000,
    })
  })
})
