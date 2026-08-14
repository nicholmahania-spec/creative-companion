import { test, expect } from '@playwright/test'
import {
  headingForStep,
  openIdentitySubstep,
  pathNav,
  skipIfCloud,
  toShell,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * No unwired timer widget on the path screens.
 *
 * Identity and Assets each rendered a copy of the Timer's controls, but
 * MainOutlet never passed those views any of the timer props — so
 * `resetFocus` was undefined and the two unlabelled buttons ("25" and "2")
 * threw a TypeError on click. It had never worked on these screens.
 *
 * One bug, three separate complaints in two independent cold-start runs:
 * the crashing buttons, a "Resume" button that did nothing, and a huge
 * "not started" headline dominating both pages — that last one because
 * `focusLeft` was undefined, so the readout fell to its placeholder while
 * the designer was demonstrably working.
 *
 * The real Timer lives on Tools and is unaffected. This guards the two
 * screens where the copy was dead.
 */
async function noTimerChrome(page, where) {
  await expect(
    page.locator('.insights-timer'),
    `${where} still renders a timer readout`
  ).toHaveCount(0)
  await expect(
    page.locator('.insights-focus-actions'),
    `${where} still renders timer buttons`
  ).toHaveCount(0)
  /* The buttons were literally labelled "25" and "2" with no accessible
     name of any kind — a tester clicked both and never worked out what
     they were. A bare number is not a label. */
  for (const label of ['25', '2']) {
    await expect(
      page.getByRole('button', { name: new RegExp(`^${label}$`) }),
      `${where} still has a bare "${label}" button`
    ).toHaveCount(0)
  }
  // and the placeholder that dominated the page is gone with it
  await expect(
    page.getByText('not started', { exact: true }),
    `${where} still shows the "not started" placeholder`
  ).toHaveCount(0)
}

test('Assets has no dead timer chrome', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'No Timer A' })
  skipIfCloud(test, gate)
  const path = await pathNav(page)
  await stepByIdIn(path, 'deliver').click()
  await expect(headingForStep(page, 'deliver').first()).toBeVisible({
    timeout: 10000,
  })
  await noTimerChrome(page, 'Assets')
})

test('Identity has no dead timer chrome, on any sub-screen', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'No Timer B' })
  skipIfCloud(test, gate)
  const path = await pathNav(page)
  await stepByIdIn(path, 'design').click()
  await expect(headingForStep(page, 'design').first()).toBeVisible({
    timeout: 10000,
  })
  await noTimerChrome(page, 'Identity')
  for (const sub of ['colors', 'type']) {
    await openIdentitySubstep(page, sub)
    await noTimerChrome(page, `Identity · ${sub}`)
  }
})

test('the real Timer still works where it lives', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Real Timer' })
  skipIfCloud(test, gate)

  /* Removing the broken copies must not have removed the feature. Tools →
     Timer is where it is wired, and its controls must still be there and
     must not throw. */
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await toShell(page)
  await page.locator('#tools-menu-button').click()
  await page.getByRole('menuitem', { name: /Timer/ }).click()
  await expect(page.locator('.insights-focus-actions')).toBeVisible({
    timeout: 8000,
  })
  await page.getByRole('button', { name: /^25$/ }).first().click()
  await page.waitForTimeout(400)
  expect(errors, 'the wired timer threw').toEqual([])
})
