import { test, expect } from '@playwright/test'
import {
  unlockAndOnboard,
  skipIfCloud,
  pathNav,
  stepByIdIn,
  openTool,
  goToStepByKey,
} from './helpers.js'

/**
 * Characterisation test for the work clock.
 *
 * Written against the clock while it still lived inline in App.jsx, and proven
 * to pass there BEFORE it was lifted into useWorkClock — the same discipline
 * the Break-down wizard extraction used. It passes identically against both
 * shapes; that is the whole basis for calling the move behaviour-preserving.
 *
 * It asserts the hook's entire public surface and nothing more. The clock
 * exposes exactly two values to the rest of the app — `workRunning`, which
 * gates the header chip, and `sessionLabel`, which is its text. Everything
 * else it owns (five refs, the idle pause, segment banking) is internal, and
 * a test that reached for those would pin the implementation rather than the
 * behaviour.
 *
 * What is deliberately NOT covered: the banking of worked time. The store
 * drops anything under a minute as "noise from a page you passed through"
 * (useAppStore logWorkedTime), so observing a single banked segment costs a
 * 60s wait against a 60s per-test timeout. Idle detection is worse — a ten
 * minute threshold. Neither is reachable from App.jsx at any speed, and this
 * spec cannot close that gap.
 *
 * What the extraction did close: sessionLabel's formatting rule is now a pure
 * exported function with its own unit tests (src/lib/useWorkClock.test.js).
 * The ticking and banking still need a DOM to test, and the suite runs in
 * `node` with none, so those stay covered only from here.
 */

const goToStage = async (page, id) => {
  const path = await pathNav(page)
  await stepByIdIn(path, id).click()
}

const chip = (page) => page.locator('.work-clock-chip')

test('the clock runs on a project stage and reads as just started', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Work Clock' })
  skipIfCloud(test, gate)

  await goToStage(page, 'sketch')
  await expect(chip(page)).toBeVisible({ timeout: 10000 })

  /* sessionLabel's first branch: under a minute is words, not a 0m readout. */
  await expect(chip(page)).toContainText('just started')
})

test('the clock keeps running across a move between stages', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Work Clock Stages' })
  skipIfCloud(test, gate)

  await goToStage(page, 'sketch')
  await expect(chip(page)).toBeVisible({ timeout: 10000 })

  /* Moving between two stages banks the open segment and opens a new one.
     The user-visible contract is that the clock does not stop: both views are
     stage views, so workRunning stays true straight through. */
  await goToStage(page, 'design')
  await expect(chip(page)).toBeVisible()

  await goToStage(page, 'define')
  await expect(chip(page)).toBeVisible()
})

test('the clock stops on a view that is not a project stage', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Work Clock Off Path' })
  skipIfCloud(test, gate)

  await goToStage(page, 'sketch')
  await expect(chip(page)).toBeVisible({ timeout: 10000 })

  /* A tool is not a stage. STAGE_VIEWS is derived from JOURNEY_STEPS, so this
     is the boundary the clock actually draws: time in a tool is not stage
     work, and the chip goes with it. */
  await openTool(page, 'Ideate')
  await expect(chip(page)).toHaveCount(0)

  /* And it comes back on return — the clock resumes rather than being spent.
     Back via the keyboard shortcut, not the rail: a tool view does not render
     the process rail, so there is nothing there to click. */
  await goToStepByKey(page, 'sketch')
  await expect(chip(page)).toBeVisible({ timeout: 10000 })
})
