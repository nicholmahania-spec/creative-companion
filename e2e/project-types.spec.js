import { test, expect } from '@playwright/test'
import { pathNav, skipIfCloud, unlockAndOnboard } from './helpers.js'
import { PROJECT_TYPES, activeStepIds } from '../src/lib/journey/projectTypes.js'
import { JOURNEY_STEPS } from '../src/lib/journey/journey.js'

/**
 * The workflow adapts to what is being built (PRODUCT.md §06).
 *
 * These live in a browser rather than vitest because the thing under test is
 * what the designer can SEE and REACH — how many stops render, what the
 * keyboard reaches, and whether a stage that is off is still findable. A unit
 * test can assert the derived list; only a real page can assert that key 5
 * does nothing on a four-stop project, which is the failure that would strand
 * someone on a screen with no rail entry to come back from.
 *
 * Counts are derived from projectTypes.js, never typed. The dominant defect in
 * this codebase is a second copy of a declared list, and "4" written here
 * would be exactly that.
 */

const LOGO_STOP_COUNT = activeStepIds({ projectType: 'logo' }).length
const FULL_STOP_COUNT = JOURNEY_STEPS.length

/** Create a project through the real intake screen. */
async function createProject(page, { name, engagement, deliverables = [] }) {
  await page.getByRole('button', { name: /^New project$/ }).first().click()
  await expect(page.locator('.create-scope-chip')).toBeVisible({ timeout: 8000 })

  const nameField = page.locator('.create-view input, .create-name input').first()
  if (await nameField.count()) await nameField.fill(name)

  if (engagement) {
    await page
      .locator('.create-radio', { hasText: engagement })
      .first()
      .click()
  }
  /* Deliverables are `.create-check` buttons with aria-pressed, not
     labelled checkboxes — pick them the way the markup actually is. */
  for (const label of deliverables) {
    await page.locator('.create-check', { hasText: label }).first().click()
  }
  return page.locator('.create-scope-chip')
}

test('a logo job walks a shorter path than a full identity', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Types Project' })
  skipIfCloud(test, gate)

  // Sanity: the default project created by onboarding is a full identity,
  // so the rail shows every stop. If this ever fails, the derivation has
  // leaked into projects that never went through intake.
  const path = await pathNav(page)
  await expect(path.locator('.step-rail-step')).toHaveCount(FULL_STOP_COUNT)

  const chip = await createProject(page, {
    name: 'Logo Only Co',
    engagement: 'Starting from scratch',
    deliverables: ['Primary logo'],
  })

  /* The chip must state the CONSEQUENCE, not just the scope. A derivation
     nobody witnesses is a "where did this come from?" surprise weeks later,
     which is the whole reason this line names stops at all. */
  await expect(chip).toContainText(new RegExp(`${LOGO_STOP_COUNT} stops`))
  await expect(chip).toContainText(/logo only/i)

  await page.getByRole('button', { name: /^Start project$/ }).click()
  await page.waitForTimeout(800)

  const railAfter = await pathNav(page)
  await expect(railAfter.locator('.step-rail-step')).toHaveCount(LOGO_STOP_COUNT)
})

test('a stage that is off stays visible and one click brings it back', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Off Stage Project' })
  skipIfCloud(test, gate)

  await createProject(page, {
    name: 'Off Stage Co',
    engagement: 'Starting from scratch',
    deliverables: ['Primary logo'],
  })
  await page.getByRole('button', { name: /^Start project$/ }).click()
  await page.waitForTimeout(800)

  /* Object permanence: a stop that is simply absent is invisible, and
     invisible is how a designer concludes the app lost something. The off
     stage must be NAMED, and reachable without hunting through Settings. */
  const off = page.locator('.step-rail-off')
  await expect(off).toBeVisible()
  const offStages = JOURNEY_STEPS.filter(
    (s) => !activeStepIds({ projectType: 'logo' }).includes(s.id)
  )
  for (const stage of offStages) await expect(off).toContainText(stage.label)

  await off.getByRole('button', { name: /turn on/i }).first().click()
  await page.waitForTimeout(400)

  const rail = await pathNav(page)
  await expect(rail.locator('.step-rail-step')).toHaveCount(LOGO_STOP_COUNT + 1)

  /* One stage came back, so the line survives if others are still off. This
     used to assert the line was GONE, which only held while a logo job had
     exactly one off stage; it has three now that Directions and Brand book
     are stops, and the assertion was testing the old arithmetic rather than
     the behaviour. What must be true either way: the stage just turned on is
     no longer named as off, and the line disappears only when nothing is. */
  const stillOff = offStages.length - 1
  if (stillOff === 0) {
    await expect(page.locator('.step-rail-off')).toHaveCount(0)
  } else {
    await expect(off).toBeVisible()
    await expect(off).not.toContainText(offStages[0].label)
  }
})

test('keyboard shortcuts never reach a stage the rail does not show', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Keys Project' })
  skipIfCloud(test, gate)

  await createProject(page, {
    name: 'Keys Co',
    engagement: 'Starting from scratch',
    deliverables: ['Primary logo'],
  })
  await page.getByRole('button', { name: /^Start project$/ }).click()
  await page.waitForTimeout(800)

  const viewBefore = await page.evaluate(
    () => document.querySelector('.step-rail-step.is-active')?.textContent || ''
  )

  /* One past the end of THIS project's path. Bound to the full catalogue it
     would jump to a stage with no rail entry — a screen you can reach but
     cannot navigate back from. Pressing it must do nothing at all. */
  await page.evaluate(() => document.activeElement?.blur?.())
  await page.keyboard.press(String(LOGO_STOP_COUNT + 1))
  await page.waitForTimeout(400)

  const viewAfter = await page.evaluate(
    () => document.querySelector('.step-rail-step.is-active')?.textContent || ''
  )
  expect(viewAfter).toBe(viewBefore)
})

test('every project type resolves to a path with at least one stop', async () => {
  // Cheap guard with real teeth: a type whose stages all vanish would leave a
  // project with no path and no way to navigate anywhere.
  PROJECT_TYPES.forEach((t) => {
    expect(activeStepIds({ projectType: t.id }).length, t.id).toBeGreaterThan(0)
  })
})
