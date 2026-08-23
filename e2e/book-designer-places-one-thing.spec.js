import { test, expect } from '@playwright/test'
import { openTool, skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * PHASE 10C — A DESIGNER PLACES ONE REAL THING.
 *
 * Every earlier phase in this workstream moved architecture. This is the first
 * one a designer would feel: the Book Builder had twenty-eight controls and
 * none of them could say where anything goes. Now one can, and the decision
 * survives all the way into the exported file.
 *
 * The proof deliberately measures OFFSET WITHIN THE SHEET rather than viewport
 * x — the page strip scrolls when the rail opens, so an absolute coordinate
 * moves for reasons that have nothing to do with the placement.
 */

const sheetOffsetPercent = async (page) => {
  const t = await page.locator('[data-box="pageTitle"]').first().boundingBox()
  const s = await page.locator('.bbb-page--composed').first().boundingBox()
  return Math.round(((t.x - s.x) / s.width) * 1000) / 10
}

async function openBook(page) {
  await openTool(page, /Brand book/i)
  await expect(page.locator('.bbb-topbar__summary')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.bbb-positioned-page').first()).toBeVisible({ timeout: 20000 })
}

async function openPosition(page) {
  /* Located by the control it contains, never by its title: "Position" is a
     substring of "Positioning", a field label inside Brand Voice, and that
     section matches first. */
  const section = page.locator('.bbb-section:has(#bbb-headingCol)')
  const summary = section.locator('summary').first()
  await summary.scrollIntoViewIfNeeded()
  if (!(await section.evaluate((el) => el.open))) await summary.click()
  await expect(page.locator('#bbb-headingCol')).toBeVisible({ timeout: 10000 })
  return section
}

test('a designer places the Color heading, and it survives into the PDF', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const gate = await unlockAndOnboard(page, {
    name: 'Places One Thing',
    testerName: 'T',
    expectOnboardDialog: true,
  })
  skipIfCloud(test, gate)
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })
  await openBook(page)

  const before = await sheetOffsetPercent(page)
  expect(before).toBeLessThan(15) // starts at the left margin

  await openPosition(page)
  await page.locator('#bbb-headingCol').selectOption('7')

  /* 1. It moved. */
  await expect
    .poll(() => sheetOffsetPercent(page), { timeout: 15000 })
    .toBeGreaterThan(before + 20)
  const placedOffset = await sheetOffsetPercent(page)

  /* 2. The band did not — it is full-bleed by design, not the designer's. */
  const band = await page.locator('[data-box="band"]').first().boundingBox()
  const sheet = await page.locator('.bbb-page--composed').first().boundingBox()
  expect(Math.round(band.width)).toBe(Math.round(sheet.width))
  expect(Math.abs(band.y - sheet.y)).toBeLessThan(2)

  /* 3. It is a project decision, not view state — it survives a reload. */
  await page.reload()
  await openBook(page)
  await expect.poll(() => sheetOffsetPercent(page), { timeout: 20000 }).toBe(placedOffset)
  await openPosition(page)
  await expect(page.locator('#bbb-headingCol')).toHaveValue('7')

  /* 4. And it is stored as INTENT — a column, never a coordinate. A stored
        point would pin the book to one paper size and one column count. */
  const stored = await page.evaluate((key) => {
    const raw = JSON.parse(localStorage.getItem(key) || '{}')
    const st = raw?.state || {}
    const p = (st.projects || []).find((x) => x.id === st.currentProjectId) || st.projects?.[0]
    return (p?.document?.composition || []).find((r) => r.pageId === 'color') || null
  }, 'creative-companion-storage')
  expect(stored.elements).toEqual([{ id: 'headingBlock', cell: { col: 7, colSpan: 6 } }])
  expect(JSON.stringify(stored)).not.toMatch(/"[xy]":|px|pt\b/)

  /* 5. The same decision reaches the exported file. The PDF comes from the
        Builder's own Download button — a real download event, not a module
        imported into the page, because the suite runs against a production
        build where source paths do not exist. The heading is then found in
        the file by its own text. */
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 90000 }),
    page.getByRole('button', { name: /Download PDF/i }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  const file = await download.path()
  expect(file).toBeTruthy()

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const { readFileSync } = await import('node:fs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)) }).promise
  let found = null
  for (let i = 1; i <= doc.numPages; i += 1) {
    const pageRef = await doc.getPage(i)
    const hit = (await pageRef.getTextContent()).items.find((t) => t.str.includes('Roles'))
    if (hit) {
      found = { x: hit.transform[4], pageW: pageRef.getViewport({ scale: 1 }).width }
      break
    }
  }
  expect(found, 'the Color page was not in the exported PDF').toBeTruthy()

  /* Column 7 of 12: past the middle of the sheet in the file, and within a
     couple of percent of where the screen drew it. Two renderers, one cell. */
  const pdfOffset = Math.round((found.x / found.pageW) * 1000) / 10
  expect(pdfOffset).toBeGreaterThan(40)
  expect(Math.abs(pdfOffset - placedOffset)).toBeLessThan(4)
})

/* A LOCKED PAGE IS NOT COVERED HERE, AND THAT IS A STATED GAP RATHER THAN AN
   OVERSIGHT. The Position controls carry `disabled={headingLocked}` and
   `setHeadingCell` returns early on a locked page, so the behaviour exists —
   but driving the page-list's own lock control from this harness proved
   unreliable, and a test that had to be loosened until it passed would be
   worse than an honest absence. */
