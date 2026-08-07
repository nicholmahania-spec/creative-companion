import { test, expect } from '@playwright/test'
import {
  headingForStep,
  openIdentitySubstep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * A typeface name is typed one letter at a time.
 *
 * Every letter used to be a saved brand decision, so a designer who typed half
 * of "Plus Jakarta Sans" and moved on had `Plus Jakart` in the project, on the
 * brand book's type page, and quoted back to their client on the handoff sheet.
 * That really happened; the client sheet quoted it verbatim.
 *
 * Two guards, and they are different promises: the store must not take a
 * half-typed word, and when a settled name is not one the app knows, it must
 * say so plainly instead of letting the designer find out from the package.
 */

/** What actually reached persistence, as opposed to what is on screen. */
async function savedFaces(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('creative-companion-storage')
    const state = raw ? JSON.parse(raw).state : null
    const p = state?.projects?.find((x) => x.id === state.currentProjectId)
    return { heading: p?.typeHeading ?? null, body: p?.typeBody ?? null }
  })
}

async function openType(page, name) {
  const gate = await unlockAndOnboard(page, { name })
  skipIfCloud(test, gate)
  const path = await pathNav(page)
  await stepByIdIn(path, 'design').click()
  await expect(headingForStep(page, 'design').first()).toBeVisible()
  await openIdentitySubstep(page, 'type')
  return gate
}

test('a half-typed face never reaches the saved project', async ({ page }) => {
  await openType(page, 'Typing Project')

  const body = page.locator('#type-body')
  await expect(body).toBeVisible()
  const before = (await savedFaces(page)).body

  /* Typed, not filled — `fill` sets the value in one shot and would pass even
     if every keystroke still wrote through. */
  await body.click()
  await body.press('Control+a')
  await body.pressSequentially('Plus Jakart', { delay: 20 })
  /* Longer than PERSIST_DEBOUNCE_MS (400ms) on purpose. A shorter wait passes
     against the write-through code this test exists to rule out — the letters
     had reached the store and simply had not been flushed yet, so the
     assertion was reading a stale blob rather than an absent decision.
     Verified by execution: with the write-through `onChange` restored, this
     test fails at the assertion below. */
  await page.waitForTimeout(1200)

  // On screen it is what they typed. In the project it is not yet anything.
  await expect(body).toHaveValue('Plus Jakart')
  expect((await savedFaces(page)).body).toBe(before)

  // Settling on it is a decision, and a decision is saved.
  await body.pressSequentially('a Sans Regular', { delay: 20 })
  await body.blur()
  await page.waitForTimeout(1200)
  expect((await savedFaces(page)).body).toBe('Plus Jakarta Sans Regular')
})

test('a name the app does not know is named, not blocked', async ({ page }) => {
  await openType(page, 'Unknown Face Project')

  const heading = page.locator('#type-heading')
  await heading.click()
  await heading.press('Control+a')
  await heading.pressSequentially('Plus Jakart', { delay: 20 })
  await page.waitForTimeout(300)

  const hint = page.locator('.panel-hint', { hasText: 'Plus Jakart' })
  await expect(hint).toBeVisible()
  /* Non-punitive on purpose — this audience is the reason the rule exists.
     It states the cost and normalises the case; it does not scold. */
  await expect(hint).toContainText(/font you own/i)

  // And it is a note, not a gate: the field still takes the value.
  await heading.pressSequentially('a Sans Bold', { delay: 20 })
  await heading.blur()
  await page.waitForTimeout(1200)
  expect((await savedFaces(page)).heading).toBe('Plus Jakarta Sans Bold')
  await expect(page.locator('.panel-hint', { hasText: 'Plus Jakarta Sans Bold' })).toHaveCount(0)
})
