import { test, expect } from '@playwright/test'
import { skipIfCloud, toShell, unlockAndOnboard } from './helpers.js'

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
 * WHERE THE DOOR IS NOW, and why the old one is not coming back.
 *
 * The wizard used to be opened from two places on the drafting Sketch screen:
 * a per-step "More" <details>, and — added later, precisely because the first
 * one needed a step to exist — a trigger on the empty state. The Touchpoints
 * rebuild replaced that whole screen and deleted both, leaving `openBreakdown`
 * with no caller but the wizard's own "start over" button. The wizard was
 * unreachable by any route: not a stop, not the Tools menu, not a shortcut,
 * not a link.
 *
 * The door is now the Desk's Project panel, beside Hours, Archive and Delete.
 * That is not a restoration of the old trigger — the screen it lived on is
 * gone and is not being rebuilt. It is the same capability at the address the
 * current architecture produces: the panel's own rule is scope, "actions that
 * only ever act on the project you are looking at", and breaking a project
 * into steps is exactly that. It also answers the question the empty-state
 * trigger existed for — "big job, no idea where to start" is asked from the
 * Desk, before you have chosen a stop.
 *
 * The Desk is shell, so a stage has to be left first; that is what a designer
 * does too.
 */
const openWizard = async (page) => {
  await toShell(page)
  const trigger = page.getByRole('button', { name: /Break down project/i })

  /* ONE DOOR. The panel's whole point is that a project action has a single
     home — a second copy somewhere else is how the previous one rotted
     unnoticed. */
  await expect(trigger).toHaveCount(1)

  /* And it is directly clickable: no disclosure to open first. The old
     entry point was inside a <details> and that is the reason the reachability
     fix was needed in the first place. */
  expect(
    await trigger.evaluate((el) => !!el.closest('details')),
    'the trigger must not be behind a disclosure'
  ).toBe(false)

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

  /* "Start #1" closes the wizard and takes you to the stop the steps went to.
     The committed micro-steps go into the queue, which the commit deliberately
     collapses, so the assertion is where you ARE, not what is on screen. */
  await dialog.getByRole('button', { name: /^Start #1$/ }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.cc-stage--sketch')).toHaveCount(1, {
    timeout: 10000,
  })
})

test('reopening starts a clean run, and Escape closes', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Breakdown Reset' })
  skipIfCloud(test, gate)

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

  /* The state under test: a project with no steps at all. This is the moment
     the tool is FOR, and the moment the old entry point could not serve —
     it needed a step to exist before it appeared. The Desk door does not. */
  await toShell(page)
  const trigger = page.getByRole('button', { name: /Break down project/i })
  await expect(trigger).toBeVisible()
  expect(await trigger.evaluate((el) => !!el.closest('details'))).toBe(false)
  await trigger.click()

  await expect(
    page.getByRole('dialog', { name: /Break project into micro-steps/i })
  ).toBeVisible({ timeout: 10000 })
})
