import { test, expect } from '@playwright/test'
import {
  openTouchpointEngine,
  headingForStep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'
import { markPng } from './makePng.js'
import { colourPdf } from './makePdf.js'

/**
 * The consistency check, reaching real work — a PDF exported from a design
 * tool, dropped on the touchpoint it belongs to.
 *
 * WHY THIS IS A BROWSER TEST AND NOT A UNIT TEST. Everything interesting here
 * only exists in a browser: pdf.js decoding a file, a canvas rasterising a
 * page, `getImageData` handing back pixels, and the sr-only input that starts
 * it. Nothing in the unit suite decodes anything — which is exactly how the
 * whole colour engine shipped with zero consumers and stayed invisible, and
 * how `imageSmoothingEnabled` could be flipped with 147 tests staying green.
 *
 * The palette here is CHOSEN, not defaulted, and it is chosen through the UI
 * on purpose. Every project is created carrying four stone defaults, so
 * `palette.length` is never 0; a test that skipped this step would be
 * checking artwork against colours nobody picked, which is the exact defect
 * the Mark screen shipped once already.
 */

const checkInput = (card) => card.locator('.app-check input[type="file"]')

async function openTouchpointWithPalette(page, name) {
  const gate = await unlockAndOnboard(page, { name })
  skipIfCloud(test, gate)

  // 1. Give the project a real palette, the way a designer actually would.
  const path = await pathNav(page)
  await stepByIdIn(path, 'design').click()
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

  // 2. Go to the surfaces list and put one deliverable on it.
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

test('a PDF printed in the brand colour is read and named', async ({ page }) => {
  const card = await openTouchpointWithPalette(page, 'Card On Brand')

  /* THE CLAIM THIS WHOLE FEATURE MAKES. A designer finishes a piece in
     Illustrator, exports a PDF, and the app tells them what colours it is
     actually made of — with no library to file it in and no metadata to
     type. The file goes on the row it belongs to and that is the entire
     interaction. */
  await checkInput(card).setInputFiles({
    name: 'business-card.pdf',
    mimeType: 'application/pdf',
    buffer: colourPdf([{ hex: '#B91C1C' }]),
  })

  const line = card.locator('.app-check-line')
  /* Generous: this is a lazy pdf.js chunk plus a worker plus a render plus a
     sample, on first use. */
  await expect(line).toHaveText(/Uses your #b91c1c\./i, { timeout: 30000 })

  // It reports what it SAW. It never vouches for the artwork.
  await expect(line).not.toHaveText(/good|pass|correct|✓/i)
  await expect(card.locator('.app-check-file')).toContainText('business-card.pdf')
})

test('an unapproved colour is named beside the brand colour it missed', async ({
  page,
}) => {
  const card = await openTouchpointWithPalette(page, 'Card Off Brand')

  await checkInput(card).setInputFiles({
    name: 'flyer.pdf',
    mimeType: 'application/pdf',
    buffer: colourPdf([{ hex: '#1E9E4A' }]),
  })

  const line = card.locator('.app-check-line')
  /* PRODUCT.md §23's sentence, finally on a real deliverable: "this asset
     uses X — your approved primary is Y". The neighbour is the half that
     makes it actionable without opening another screen. */
  await expect(line).toHaveText(/#1e9e4a/i, { timeout: 30000 })
  await expect(line).toHaveText(/nearest is #b91c1c/i)

  // Never a gate, never red, and no offer to widen the brand to fit.
  await expect(line).not.toHaveText(/error|invalid|failed|wrong|must/i)
  await expect(card.getByRole('button', { name: /add to palette/i })).toHaveCount(0)
})

test('the back of the card is read, not just the front', async ({ page }) => {
  const card = await openTouchpointWithPalette(page, 'Card Two Sides')

  /* A business card is two pages. Reading only page 1 would make a back
     printed entirely off-brand structurally invisible — the miss this
     feature exists to close. `mergePageSamples` is unit-tested, but only a
     browser can prove pdf.js actually hands over page 2. */
  await checkInput(card).setInputFiles({
    name: 'two-sided.pdf',
    mimeType: 'application/pdf',
    buffer: colourPdf([{ hex: '#B91C1C' }, { hex: '#1E9E4A' }]),
  })

  const line = card.locator('.app-check-line')
  await expect(line).toHaveText(/#1e9e4a/i, { timeout: 30000 })
  await expect(card.locator('.app-check-file')).toContainText('2 pages')
})

test('a PNG mockup works on the same slot as a PDF', async ({ page }) => {
  const card = await openTouchpointWithPalette(page, 'Card Png')

  await checkInput(card).setInputFiles({
    name: 'signage-mockup.png',
    mimeType: 'image/png',
    buffer: markPng('#B91C1C'),
  })

  await expect(card.locator('.app-check-line')).toHaveText(
    /Uses your #b91c1c\./i,
    { timeout: 20000 }
  )
})

test('the deliverable is not stored — only the reading is', async ({ page }) => {
  const card = await openTouchpointWithPalette(page, 'Card Storage')

  await checkInput(card).setInputFiles({
    name: 'brochure.pdf',
    mimeType: 'application/pdf',
    buffer: colourPdf([
      { hex: '#B91C1C' },
      { hex: '#B91C1C' },
      { hex: '#B91C1C' },
      { hex: '#B91C1C' },
    ]),
  })
  await expect(card.locator('.app-check-line')).toHaveText(/#b91c1c/i, {
    timeout: 30000,
  })

  /* THE CONSTRAINT THAT WOULD HAVE KILLED THIS FEATURE. Storage is
     localStorage and a project already carries several hundred KB. Keeping a
     copy of every deliverable would blow the quota within one project AND
     make the app a second, stale source of truth for files that live in the
     designer's own tools. So the artwork is dropped and the READING is kept.
     A regression here is silent until a designer loses a project to a quota
     error, which is why it is asserted in bytes. */
  const readStored = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem('creative-companion-storage')
      const projects = JSON.parse(raw || '{}')?.state?.projects || []
      for (const p of projects) {
        for (const row of Object.values(p.touchpointApps || {})) {
          if (row?.check) return JSON.stringify(row.check)
        }
      }
      return 'null'
    })

  await expect
    .poll(readStored, { timeout: 10000 })
    .toContain('#b91c1c')

  const json = await readStored()
  expect(json, 'no image bytes may reach localStorage').not.toContain('data:')
  expect(
    json.length,
    `reading should be a few hundred bytes, was ${json.length}`
  ).toBeLessThan(600)
})

test('clearing a check offers undo rather than a confirmation dialog', async ({
  page,
}) => {
  const card = await openTouchpointWithPalette(page, 'Card Undo')

  await checkInput(card).setInputFiles({
    name: 'poster.pdf',
    mimeType: 'application/pdf',
    buffer: colourPdf([{ hex: '#B91C1C' }]),
  })
  await expect(card.locator('.app-check-line')).toHaveText(/#b91c1c/i, {
    timeout: 30000,
  })

  await card.getByRole('button', { name: /^Clear$/ }).click()
  // Back to the offer, and the undo is there — a dialog is a decision, undo
  // is not, and this audience is the reason that rule exists.
  /* The offer is `.app-check-open`, matched by class rather than by copy.
     Its label used to be "Check the finished file" and is now "Sample colours
     from a file" — a deliberate rename carrying its own rationale in
     `ApplicationCheck.jsx` ("ARTIFACT HONESTY: the file is transient … Do not
     call it 'the finished file'"). What this test protects is that clearing
     returns you to the offer, which is true under either wording. */
  await expect(card.locator('.app-check-open')).toBeVisible()
  await expect(page.getByRole('button', { name: /undo/i }).first()).toBeVisible()
})
