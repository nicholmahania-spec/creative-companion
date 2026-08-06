import { test, expect } from '@playwright/test'
import {
  headingForStep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'
import { markPng } from './makePng.js'

/**
 * The mark colour check, driven through a real upload.
 *
 * This is checked in a browser and not only in unit tests for a specific
 * reason: the maths behind it (dominantColour.js, deltaE.js) was written,
 * tested to four decimal places, and shipped with ZERO consumers anywhere in
 * src/. It was correct and completely invisible. Nothing in the unit suite
 * could tell the difference, because nothing in the unit suite decodes an
 * image or renders a view.
 *
 * So these tests hand the browser real PNG bytes and read the sentence off
 * the screen.
 */

const markInput = (page) =>
  page.locator('#design-section-content-logo input[type="file"]')

async function openMark(page, name) {
  const gate = await unlockAndOnboard(page, { name })
  skipIfCloud(test, gate)
  const path = await pathNav(page)
  await stepByIdIn(path, 'design').click()
  await expect(headingForStep(page, 'design').first()).toBeVisible({
    timeout: 10000,
  })
  // 'logo' is the first Identity sub-screen, so it is already open.
  await expect(markInput(page)).toHaveCount(1)
}

test('a mark with no palette offers its own colours as the palette', async ({
  page,
}) => {
  await openMark(page, 'Mark Colours')

  await markInput(page).setInputFiles({
    name: 'mark.png',
    mimeType: 'image/png',
    buffer: markPng('#B91C1C'),
  })

  const panel = page.locator('.mark-colour-check')
  await expect(panel).toBeVisible({ timeout: 10000 })

  /* The whole chain in one assertion: the PNG decoded, the white ground was
     discarded as substrate, the red survived the coverage floor, and the
     project has no palette of its own — so the offer is to START one. */
  await expect(panel.locator('.mark-colour-line')).toHaveText(
    /Found #b91c1c in this mark\./i
  )

  /* The branch that REMOVES work. Without it these hexes reach the palette
     via an eyedropper in another app, two hex strings held in working
     memory, and a trip to a different screen. */
  await panel.getByRole('button', { name: /Use as starting palette/i }).click()

  // And the reading re-reads: the same colour is now a colour they own.
  await expect(panel.locator('.mark-colour-line')).toHaveText(
    /Uses your #b91c1c\./i,
    { timeout: 8000 }
  )

  /* Undo is offered rather than a confirmation dialog — the app's own rule,
     because a dialog is a decision and undo is not. */
  await expect(page.getByRole('button', { name: /undo/i }).first()).toBeVisible()
})

test('a black and white mark is described, not failed', async ({ page }) => {
  await openMark(page, 'Mono Mark')

  /* Pure black on white. EVERY pixel is substrate by design — near-white is
     paper, near-black is ink — so the extractor honestly finds no brand
     colour. This is the most common logo there is, and the sentence has to
     read as a fact about the artwork rather than as a fault. Any phrasing
     starting "couldn't" makes the reader supply a reason, and the two
     available reasons are "my logo is wrong" and "this is broken". */
  await markInput(page).setInputFiles({
    name: 'mono.png',
    mimeType: 'image/png',
    buffer: markPng('#000000'),
  })

  const line = page.locator('.mark-colour-check .mark-colour-line')
  await expect(line).toBeVisible({ timeout: 10000 })
  await expect(line).toHaveText(/Black and white/i)
  await expect(line).not.toHaveText(/couldn't|could not|failed|error|invalid/i)
  // No offer to seed a palette from an image that has no colours in it.
  await expect(
    page.getByRole('button', { name: /Use as starting palette/i })
  ).toHaveCount(0)
})
