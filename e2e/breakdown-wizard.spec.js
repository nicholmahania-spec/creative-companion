import { test, expect } from '@playwright/test'
import { unlockAndOnboard, skipIfCloud, pathNav, stepByIdIn } from './helpers.js'

/**
 * Characterisation test for the "Break down" wizard — five screens that turn a
 * project into micro-steps.
 *
 * Written to pin behaviour BEFORE the wizard was lifted out of App.jsx, not
 * after. It had no coverage at any level: 228 lines of markup and seven pieces
 * of state that nothing asserted, which is precisely the code you cannot
 * safely move. It passes identically against both shapes — that is the point.
 */
/**
 * Reaching the wizard from a project that already has steps is still awkward,
 * and this helper mirrors it: the "Break down project" button lives inside a
 * per-step "More" <details>, inside the current-step card. That entry point
 * used to be the ONLY one, which left the wizard unreachable on an empty
 * project — the state where breaking a project down is most useful. The empty
 * state now carries its own trigger; see the reachability test below.
 */
const goToSketch = async (page) => {
  const path = await pathNav(page)
  await stepByIdIn(path, 'sketch').click()
  await expect(page.locator('#desk-capture')).toBeVisible({ timeout: 10000 })
}

const addStep = async (page, title) => {
  await page.locator('#desk-capture').fill(title)
  await page.locator('#desk-capture').press('Enter')
  await expect(page.locator('.step-focus')).toBeVisible({ timeout: 10000 })
}

const openWizard = async (page) => {
  const trigger = page.getByRole('button', { name: /Break down project/i })
  /* <details> stays open across a wizard open/close cycle, so toggling it
     unconditionally would hide the button on the second call. */
  if (!(await trigger.isVisible().catch(() => false))) {
    await page.locator('.step-more-details summary').first().click()
  }
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(
    page.getByRole('dialog', { name: /Break project into micro-steps/i })
  ).toBeVisible({ timeout: 10000 })
}

test('the wizard walks five screens and lands steps in Sketch', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Breakdown Project' })
  skipIfCloud(test, gate)

  await goToSketch(page)
  await addStep(page, 'First step')
  await openWizard(page)
  const dialog = page.getByRole('dialog', {
    name: /Break project into micro-steps/i,
  })

  /* Screen 0 → 1. The goal field is seeded from the active project, which is
     the one piece of parent state the wizard reads on open. Asserted as
     "non-empty", not a literal — the harness names the project, not us. */
  await dialog.getByRole('button', { name: /^Start$/ }).click()
  await expect(page.locator('#bd-goal')).not.toHaveValue('')

  /* Screen 1: goal is required — Next is dead until it has content. */
  await page.locator('#bd-goal').fill('')
  await expect(dialog.getByRole('button', { name: /^Next$/ })).toBeDisabled()
  await page.locator('#bd-goal').fill('Logo exploration')
  await page.locator('#bd-done').fill('Three routes to show')
  await dialog.getByRole('button', { name: /^Next$/ }).click()

  /* Screen 2: depth + energy, then generate. */
  await page.locator('#bd-energy').selectOption('med')
  await dialog.getByRole('button', { name: /^Generate$/ }).click()

  /* Screen 3: generated steps are editable, removable and addable. */
  const rows = dialog.locator('.breakdown-edit-list li')
  const generated = await rows.count()
  expect(generated).toBeGreaterThan(0)

  await dialog.getByRole('button', { name: /^\+ Step$/ }).click()
  await expect(rows).toHaveCount(generated + 1)
  await dialog.getByRole('button', { name: `Remove step ${generated + 1}` }).click()
  await expect(rows).toHaveCount(generated)

  /* exact — "Micro-step 1" is also a prefix of "Micro-step 10". */
  await page
    .getByRole('textbox', { name: 'Micro-step 1', exact: true })
    .fill('Sketch marks')

  /* The commit button counts only non-blank lines. */
  const commit = dialog.getByRole('button', { name: /Add \d+ to Sketch/ })
  await expect(commit).toBeVisible()
  await commit.click()

  /* Screen 4: the count comes back from the parent's commit, not the wizard —
     this is the one value that crosses the boundary in that direction. */
  const summary = dialog.getByText(/\+\d+ steps · do #1 only/)
  await expect(summary).toBeVisible()
  const reported = Number(
    (await summary.innerText()).match(/\+(\d+)/)?.[1] ?? '0'
  )
  expect(reported).toBe(generated)

  /* "Start #1" closes the wizard and lands back on Sketch. The committed
     micro-steps go into the queue, which the commit deliberately collapses —
     so the assertion is "we are on Sketch with a current step", not "the new
     step is on screen". */
  await dialog.getByRole('button', { name: /^Start #1$/ }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.step-focus')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('#desk-capture')).toBeVisible()
})

test('reopening starts a clean run, and Escape closes', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Breakdown Reset' })
  skipIfCloud(test, gate)

  await goToSketch(page)
  await addStep(page, 'First step')
  await openWizard(page)
  const dialog = page.getByRole('dialog', {
    name: /Break project into micro-steps/i,
  })

  await dialog.getByRole('button', { name: /^Start$/ }).click()
  const seeded = await page.locator('#bd-goal').inputValue()
  expect(seeded).not.toBe('')
  await page.locator('#bd-goal').fill('Typed into the first run')

  /* Escape is the keyboard way out — the wizard is a real modal. */
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  /* Reopening must NOT resume the abandoned run: back to screen 0, and the
     goal reseeded from the project rather than carrying the old text. */
  await openWizard(page)
  await expect(dialog.getByRole('button', { name: /^Start$/ })).toBeVisible()
  await dialog.getByRole('button', { name: /^Start$/ }).click()
  await expect(page.locator('#bd-goal')).toHaveValue(seeded)
})

test('the wizard is reachable on an empty project', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Breakdown Empty' })
  skipIfCloud(test, gate)

  await goToSketch(page)

  /* The state under test: no step has ever been added, so the current-step
     card renders its empty state and the per-step "More" <details> — the
     wizard's only previous entry point — does not exist at all. */
  await expect(page.locator('.sketch-empty')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('.step-more-details')).toHaveCount(0)

  /* No <details> to open first: the trigger is on screen and directly
     clickable, which is the whole point of the fix. */
  const trigger = page.getByRole('button', { name: /Break down project/i })
  await expect(trigger).toBeVisible()
  await trigger.click()

  await expect(
    page.getByRole('dialog', { name: /Break project into micro-steps/i })
  ).toBeVisible({ timeout: 10000 })
})
