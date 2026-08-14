import { test, expect } from '@playwright/test'
import {
  openDeliverSectionWith,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * The brand book "Flip through it" overlay must have a keyboard way out.
 *
 * It declared role="dialog" aria-modal="true" — telling a screen reader that
 * focus is held inside and there is a way to dismiss it — while handling no
 * keys at all. The only exit was finding the Close button with a pointer, and
 * focus stayed loose in the builder behind it. Neither the build nor the unit
 * suite can see that, so it is pinned here.
 */
test('the flipbook overlay traps focus and closes on Escape', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Flipbook Keyboard' })
  skipIfCloud(test, gate)

  /* The Brand book is path stop 6 as of 2026-08-09, not a Tools entry — that
     menu item is gone, along with the only door it used to have. */
  const path = await pathNav(page)
  await stepByIdIn(path, 'book').click()

  const flip = page.getByRole('button', { name: /Flip through it/i })
  await expect(flip).toBeVisible({ timeout: 15000 })

  await flip.click()

  const overlay = page.locator('.bbb-flip-overlay')
  await expect(overlay).toBeVisible()

  /* Focus moves into the overlay rather than being left behind it. */
  await expect(page.locator('.bbb-flip-close-btn')).toBeFocused()

  /* Tabbing forward off the last control cycles back inside the overlay
     instead of walking into the builder underneath. */
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('Tab')
  const stillInside = await page.evaluate(
    () => !!document.activeElement?.closest('.bbb-flip-overlay')
  )
  expect(stillInside).toBe(true)

  /* The point of the fix: a keyboard exit that does not require the mouse. */
  await page.keyboard.press('Escape')
  await expect(overlay).toHaveCount(0)

  /* ONE ESCAPE CLOSES ONE THING. The stage listens for Escape on capture and
     the overlay on bubble, so for a while a single press ran both: the
     overlay closed and the Brand book stage closed under it, navigating to
     the previous stop. That is also why the focus assertion below could not
     pass — the button it restores to left the DOM with the stage. */
  await expect(page.locator('.cc-stage--book:not(.is-suspended)')).toHaveCount(1)

  /* And focus comes back to the control that opened it, not to document.body
     — so the next Tab continues from the builder, not from the top. */
  await expect(flip).toBeFocused()

  /* With nothing open above it, the stage answers Escape again — the yield is
     conditional, not a mute button. */
  await page.keyboard.press('Escape')
  await expect(page.locator('.cc-stage--book')).toHaveCount(0)
})

/**
 * The same rule, on a different stop, so the fix cannot quietly become a
 * Brand book special case: Identity's own dialog must close on Escape while
 * the stage it opened from stays put.
 */
test('a dialog opened inside another stage also closes alone', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Nested Escape' })
  skipIfCloud(test, gate)

  const path = await pathNav(page)
  await stepByIdIn(path, 'deliver').click()
  await expect(page.locator('.cc-stage--deliver')).toHaveCount(1)

  await openDeliverSectionWith(page, /^Preview$/)
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: /^Export$/i })
  await expect(dialog).toBeVisible({ timeout: 8000 })

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.cc-stage--deliver:not(.is-suspended)')).toHaveCount(1)
})
