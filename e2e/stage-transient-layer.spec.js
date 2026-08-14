import { test, expect } from '@playwright/test'
import {
  headingForStep,
  openDeliverSectionWith,
  openTouchpointEngine,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  toShell,
  unlockAndOnboard,
} from './helpers.js'
import { markPng } from './makePng.js'
import { colourPdf } from './makePdf.js'

/**
 * Things that must still work while a Workroom owns the viewport.
 *
 * THE PREDICATE MATTERS, and `toBeVisible()` is not it. Both defects this
 * pins shipped as elements that were rendered, sized and laid out correctly:
 * the undo chip measured 241x39 and the export dialog 1280x720. What was wrong
 * was that they sat inside `#root`, which an open stage sets to `inert` +
 * `aria-hidden` + `visibility: hidden` — so they were painted nowhere and could
 * not be clicked, while every query for them succeeded.
 *
 * So each check asks three separate questions, and all three are needed:
 *   1. is it outside `#root` — the structural fact the fix turns on;
 *   2. is its computed visibility `visible` — not inherited-hidden;
 *   3. does `elementFromPoint` at its own centre return IT — which is the only
 *      one that distinguishes "shown" from "reachable". Before the z-index was
 *      brought down off the 32-bit clamp, the chip passed 1 and 2 and returned
 *      `DIV.cc-stage-ledge` here: on screen, and still unclickable.
 */

const REACH = (selector) => {
  const el = document.querySelector(selector)
  if (!el) return { missing: true }
  const root = document.getElementById('root')
  const r = el.getBoundingClientRect()
  const cx = Math.round(r.left + r.width / 2)
  const cy = Math.round(r.top + r.height / 2)
  const top = document.elementFromPoint(cx, cy)
  return {
    inRoot: root.contains(el),
    visibility: getComputedStyle(el).visibility,
    width: Math.round(r.width),
    height: Math.round(r.height),
    reachable: !!top && (top === el || el.contains(top)),
    blockedBy:
      top && top !== el && !el.contains(top)
        ? `${top.tagName}.${String(top.className).slice(0, 40)}`
        : null,
    stageOpen: !!document.querySelector('.cc-stage:not(.is-suspended)'),
  }
}

/** Give a project a palette, then put one surface on Touchpoints. */
async function surfaceWithPalette(page, name) {
  const gate = await unlockAndOnboard(page, { name })
  skipIfCloud(test, gate)

  await stepByIdIn(await pathNav(page), 'design').click()
  await expect(headingForStep(page, 'design').first()).toBeVisible({
    timeout: 10000,
  })
  await page
    .locator('#design-section-content-logo input[type="file"]')
    .setInputFiles({
      name: 'mark.png',
      mimeType: 'image/png',
      buffer: markPng('#B91C1C'),
    })
  const panel = page.locator('.mark-colour-check')
  await expect(panel).toBeVisible({ timeout: 10000 })
  await panel.getByRole('button', { name: /Use as starting palette/i }).click()
  await expect(panel.locator('.mark-colour-line')).toHaveText(
    /Uses your #b91c1c\./i,
    { timeout: 8000 }
  )

  await stepByIdIn(await pathNav(page), 'sketch').click()
  await expect(headingForStep(page, 'sketch').first()).toBeVisible({
    timeout: 10000,
  })
  await page.locator('.touchpoints-quick button').first().click()
  await openTouchpointEngine(page)
  const card = page.locator('.touchpoints-card').first()
  await expect(card).toBeVisible({ timeout: 8000 })
  return card
}

test('an undo offered inside a stage can be seen, reached and used', async ({
  page,
}) => {
  const card = await surfaceWithPalette(page, 'Undo In Stage')

  await card.locator('.app-check input[type="file"]').setInputFiles({
    name: 'poster.pdf',
    mimeType: 'application/pdf',
    buffer: colourPdf([{ hex: '#B91C1C' }]),
  })
  await expect(card.locator('.app-check-line')).toHaveText(/#b91c1c/i, {
    timeout: 30000,
  })

  await card.getByRole('button', { name: /^Clear$/ }).click()

  const chip = page.locator('.undo-chip')
  await expect(chip).toBeVisible({ timeout: 5000 })
  const reach = await page.evaluate(REACH, '.undo-chip')
  expect(reach.stageOpen, 'this must be measured with a stage up').toBe(true)
  expect(reach, JSON.stringify(reach)).toMatchObject({
    inRoot: false,
    visibility: 'visible',
    reachable: true,
  })

  /* AND IT ACTUALLY UNDOES. A reachable chip that restores nothing is the
     same failure one layer further in. */
  await chip.click()
  await expect(card.locator('.app-check-line')).toHaveText(/#b91c1c/i, {
    timeout: 10000,
  })
})

test('the undo chip still steps aside for the stage ledge', async ({ page }) => {
  /* The chip did not move — it is at the same coordinates it always had, and
     this is the check that it is not now covering the one control that answers
     "what do I do next". Measured against the ledge's actual controls rather
     than the ledge band, because the chip is centred and the band is
     full-width: overlapping empty ledge is not a collision. */
  const card = await surfaceWithPalette(page, 'Undo Clearance')
  await card.locator('.app-check input[type="file"]').setInputFiles({
    name: 'poster.pdf',
    mimeType: 'application/pdf',
    buffer: colourPdf([{ hex: '#B91C1C' }]),
  })
  await expect(card.locator('.app-check-line')).toHaveText(/#b91c1c/i, {
    timeout: 30000,
  })
  await card.getByRole('button', { name: /^Clear$/ }).click()
  await expect(page.locator('.undo-chip')).toBeVisible({ timeout: 5000 })

  const stolen = await page.evaluate(() => {
    const ledge = document.querySelector(
      '.cc-stage:not(.is-suspended) .cc-stage-ledge'
    )
    const chip = document.querySelector('.undo-chip')
    if (!ledge || !chip) return { skipped: true }
    const b = chip.getBoundingClientRect()
    return {
      taken: [...ledge.querySelectorAll('a[href], button, [role="button"]')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          if (!r.width || !r.height) return false
          return !(
            b.bottom <= r.top ||
            b.top >= r.bottom ||
            b.right <= r.left ||
            b.left >= r.right
          )
        })
        .map((el) => (el.textContent || '').trim().slice(0, 30)),
    }
  })
  expect(stolen.taken || [], JSON.stringify(stolen)).toEqual([])
})

test('the undo chip still expires on its own', async ({ page }) => {
  /* The window is unchanged by the move. Asserted because "make it reachable"
     could so easily have been done by making it stay — and a chip that never
     leaves is a second permanent thing on screen, which is the opposite of
     what it is for. */
  const card = await surfaceWithPalette(page, 'Undo Expiry')
  await card.locator('.app-check input[type="file"]').setInputFiles({
    name: 'poster.pdf',
    mimeType: 'application/pdf',
    buffer: colourPdf([{ hex: '#B91C1C' }]),
  })
  await expect(card.locator('.app-check-line')).toHaveText(/#b91c1c/i, {
    timeout: 30000,
  })
  await card.getByRole('button', { name: /^Clear$/ }).click()
  await expect(page.locator('.undo-chip')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.undo-chip')).toHaveCount(0, { timeout: 15000 })
})

test('an undo offered from the shell is unaffected', async ({ page }) => {
  /* The control group. The chip left `#root`, so the case that always worked
     has to be shown still working — otherwise "reachable in a stage" could
     have been bought by breaking the shell. */
  const gate = await unlockAndOnboard(page, { name: 'Undo In Shell' })
  skipIfCloud(test, gate)
  await toShell(page)

  const panel = page.locator('.desk-project-actions')
  await expect(panel).toBeVisible({ timeout: 10000 })
  /* Delete, because it is the shell action that offers an undo — Archive does
     not raise one. The undo restores the project, so this leaves nothing
     behind. */
  await panel.getByRole('button', { name: /Delete project/ }).click()

  const chip = page.locator('.undo-chip')
  await expect(chip).toBeVisible({ timeout: 5000 })
  const reach = await page.evaluate(REACH, '.undo-chip')
  expect(reach.stageOpen, 'no stage should be open here').toBe(false)
  expect(reach, JSON.stringify(reach)).toMatchObject({
    visibility: 'visible',
    reachable: true,
  })
  await chip.click()
  await expect(page.locator('.desk-project-actions')).toBeVisible({
    timeout: 10000,
  })
  await expect(
    page.locator('.desk-project-actions').getByRole('button', {
      name: /Delete project/,
    })
  ).toBeVisible()
})

test('Delivery Preview opens a dialog you can see, use and close', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Preview In Stage' })
  skipIfCloud(test, gate)

  await stepByIdIn(await pathNav(page), 'deliver').click()
  await expect(headingForStep(page, 'deliver').first()).toBeVisible({
    timeout: 10000,
  })

  await openDeliverSectionWith(page, /^Preview$/)
  await page.getByRole('button', { name: 'Preview', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: /^Export$/i })
  await expect(dialog).toBeVisible({ timeout: 8000 })

  const reach = await page.evaluate(REACH, '.export-overlay')
  expect(reach.stageOpen, 'this must be measured with a stage up').toBe(true)
  expect(reach, JSON.stringify(reach)).toMatchObject({
    inRoot: false,
    visibility: 'visible',
    reachable: true,
  })

  /* Focus goes in, so a keyboard user is inside the thing that just opened. */
  const focusInside = await page.evaluate(
    () => !!document.activeElement?.closest('.export-overlay')
  )
  expect(focusInside).toBe(true)

  /* And Escape closes the dialog WITHOUT taking the stage with it. */
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.cc-stage--deliver:not(.is-suspended)')).toHaveCount(1)
})

test('the stage focus trap is unchanged when nothing transient is open', async ({
  page,
}) => {
  /* The exemption that lets focus rest in the transient layer must be vacuous
     when the layer is empty — otherwise "the stage traps focus" quietly became
     "the stage traps focus unless you ask nicely". Focus is moved to a control
     in the sleeping shell by script; the trap must pull it straight back. */
  const gate = await unlockAndOnboard(page, { name: 'Trap Intact' })
  skipIfCloud(test, gate)
  await stepByIdIn(await pathNav(page), 'deliver').click()
  await expect(headingForStep(page, 'deliver').first()).toBeVisible({
    timeout: 10000,
  })

  const state = await page.evaluate(async () => {
    const host = document.getElementById('cc-overlay-root')
    const outside = document.querySelector('#root button')
    if (!outside) return { skipped: true }
    outside.focus()
    await new Promise((r) => setTimeout(r, 120))
    return {
      hostChildCount: host ? host.querySelectorAll('*').length : -1,
      focusInStage: !!document.activeElement?.closest('.cc-stage'),
      focusInRoot: !!document.activeElement?.closest('#root'),
    }
  })
  expect(state.focusInRoot, JSON.stringify(state)).toBe(false)
  expect(state.focusInStage, JSON.stringify(state)).toBe(true)
})
