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

test('downscaling does not invent a colour that is not in the artwork', async ({
  page,
}) => {
  /* THE ONE MUTATION NOTHING ELSE CATCHES. `sampleImage.js` turns smoothing
     off before drawing, and its own header explains why: interpolation while
     scaling averages neighbouring pixels into colours that exist nowhere in
     the file, which is the invented-colour false alarm the whole checker is
     built to avoid. An audit flipped that flag to `true` and all 147 tests
     stayed green — there was no test for the sampling stage at all.

     Fine red/teal bands in a 480px image, sampled down to 160. With smoothing
     off the bands survive as themselves. With it on they average to roughly
     #647347, a muddy olive present in neither the artwork nor the palette —
     and the panel would report that instead. */
  await openMark(page, 'No Invented Colour')

  await markInput(page).setInputFiles({
    name: 'stripes.png',
    mimeType: 'image/png',
    buffer: markPng('#B91C1C', { size: 480, coverage: 0.6, second: '#0F766E', stripes: 2 }),
  })

  const line = page.locator('.mark-colour-check .mark-colour-line')
  await expect(line).toBeVisible({ timeout: 10000 })
  const text = await line.innerText()

  // Both real bands are reported...
  expect(text.toLowerCase(), text).toContain('#b91c1c')
  expect(text.toLowerCase(), text).toContain('#0f766e')
  // ...and nothing between them is. Any blend lands in the olive/brown range
  // between the two; neither original starts with those bytes.
  expect(text.toLowerCase(), `invented colour in: ${text}`).not.toMatch(
    /#(5|6|7)[0-9a-f]{5}/
  )
})

test('an outlined mark says the fonts could not be checked, not that it is fine', async ({
  page,
}) => {
  /* PHASE 6'S FONT REQUIREMENT, in the words of the plan: "type converted to
     outlines carries no font name, and that is the normal delivery format for
     brand work — so silence must not read as clean".

     It read as blocked, because uploads accept image/* and no PDF reaches the
     app. But SVG is an image format and is exactly where this is visible:
     live type carries font-family, outlined type is paths and carries nothing.
     Checked in a browser because the data URL survives upload only while the
     mark is under the stored-image cap — a detail no unit test can see. */
  await openMark(page, 'Outlined Mark')

  const outlined = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80">
    <rect width="200" height="80" fill="#ffffff"/>
    <path d="M10 70 L50 10 L90 70 Z" fill="#B91C1C"/>
    <path d="M110 10 h60 v60 h-60 Z" fill="#0F766E"/>
  </svg>`

  await markInput(page).setInputFiles({
    name: 'mark.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(outlined, 'utf8'),
  })

  const panel = page.locator('.mark-colour-check')
  await expect(panel).toBeVisible({ timeout: 10000 })
  await expect(panel).toContainText(
    /Type here is outlined, so there are no font names to check\./i,
    { timeout: 8000 }
  )
  // It is a statement of scope, not a complaint about correct practice.
  await expect(panel).not.toContainText(/wrong|error|failed|problem|invalid/i)
})

test('a mark with live type names the typeface it will need', async ({ page }) => {
  await openMark(page, 'Live Type Mark')

  const live = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80">
    <rect width="240" height="80" fill="#ffffff"/>
    <rect x="0" y="0" width="240" height="40" fill="#B91C1C"/>
    <text x="10" y="70" font-family="Brandon Grotesque" font-size="28" fill="#0F766E">Sparrow</text>
  </svg>`

  await markInput(page).setInputFiles({
    name: 'live.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(live, 'utf8'),
  })

  const panel = page.locator('.mark-colour-check')
  await expect(panel).toBeVisible({ timeout: 10000 })
  /* The default project typefaces are Plus Jakarta Sans, so Brandon Grotesque
     is outside the brand system here — named, with the real consequence
     stated, and without calling the designer's logo wrong. */
  await expect(panel).toContainText(/Brandon Grotesque/i, { timeout: 8000 })
  await expect(panel).toContainText(/substitute/i)
})
