import { test, expect } from '@playwright/test'
import { openTool, skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * PHASE 10B — THE SAME COMPOSITOR, DRAWN BY REACT.
 *
 * The book has been drawn twice for as long as it has existed: React in the
 * Builder, jsPDF in the file. They shared the page spine and nothing else, so
 * the PDF put a section band, number and rule on every section page and the
 * canvas simply did not. This file is the evidence that one page now composes
 * through the same templates and the same ruler as the PDF, and that the thing
 * drawing it holds no geometry of its own.
 *
 * ONE page is compositor-driven on purpose. The rest of the canvas still
 * renders the way it always has, and these tests check that too — a proof that
 * broke the Builder would not be a proof.
 */

async function openBook(page) {
  await openTool(page, /Brand book/i)
  await expect(page.locator('.bbb-topbar__summary')).toBeVisible({ timeout: 15000 })
}

async function start(page, name, viewport) {
  await page.setViewportSize(viewport)
  const gate = await unlockAndOnboard(page, {
    name,
    testerName: 'T',
    expectOnboardDialog: true,
  })
  skipIfCloud(test, gate)
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })
  await openBook(page)
  return gate
}

const DESKTOP = { width: 1280, height: 900 }
const MOBILE = { width: 390, height: 844 }

test('the Builder draws a real composed page, band and all', async ({ page }) => {
  await start(page, 'React Renderer', DESKTOP)

  const svg = page.locator('.bbb-positioned-page').first()
  await expect(svg).toBeVisible({ timeout: 20000 })

  /* Every one of these came out of `sectionOpen` and the shared
     `headingBlock`. None is written in JSX anywhere. */
  for (const id of ['band', 'sectionNumber', 'sectionTitle', 'pageTitle', 'rule']) {
    await expect(page.locator(`[data-box="${id}"]`).first()).toBeAttached()
  }

  /* The section identity landmark the canvas never had. */
  const number = page.locator('[data-box="sectionNumber"]').first()
  await expect(number).toContainText(/^\d+ \/$/)
  await expect(page.locator('[data-box="sectionTitle"]').first()).toContainText(/\w/)

  /* The band is full-bleed and sits at the very top of the sheet. */
  const band = await page.locator('[data-box="band"]').first().boundingBox()
  const sheet = await page.locator('.bbb-page--composed').first().boundingBox()
  expect(Math.round(band.x)).toBe(Math.round(sheet.x))
  expect(Math.round(band.width)).toBe(Math.round(sheet.width))
  expect(Math.abs(band.y - sheet.y)).toBeLessThan(2)
})

test('the composed page is the shape of the paper it is set on', async ({ page }) => {
  await start(page, 'React Ratio', DESKTOP)
  await expect(page.locator('.bbb-positioned-page').first()).toBeVisible({ timeout: 20000 })

  const setup = await page.locator('.bbb-topbar__summary').innerText()
  const sheet = await page.locator('.bbb-page--composed').first().boundingBox()
  const ratio = sheet.width / sheet.height

  /* `.bbb-page` hardcodes A4 (210/297 = 0.707) for every page. A Letter book
     previewed at the wrong proportions long before this phase; the composed
     page takes its shape from the geometry it was measured against. */
  const expected = /A4/i.test(setup) ? 595.28 / 841.89 : 612 / 792
  expect(ratio).toBeCloseTo(expected, 2)

  const viewBox = await page.locator('.bbb-positioned-page').first().getAttribute('viewBox')
  expect(viewBox).toBe(/A4/i.test(setup) ? '0 0 595.28 841.89' : '0 0 612 792')
})

test('a rail edit flows through the compositor into the drawn page', async ({ page }) => {
  await start(page, 'React Rail Edit', DESKTOP)
  const svg = page.locator('.bbb-positioned-page').first()
  await expect(svg).toBeVisible({ timeout: 20000 })

  const bg = page.locator('.bbb-positioned-page > rect').first()
  const before = await bg.getAttribute('fill')
  expect(before).toMatch(/^rgb\(/)

  /* A REAL control in the rail, not a prop poked into the renderer and not a
     write into storage. The Book owns its page backgrounds — the palette
     itself is read-only here and links out to the Colour bench — and the page
     background resolves the paper the whole page is composed against, so this
     has to travel store -> pack -> driver -> compositor -> renderer to show up. */
  const section = page.locator('.bbb-section', { hasText: 'Page backgrounds' }).first()
  await expect(section).toBeAttached({ timeout: 10000 })
  if (!(await section.evaluate((el) => el.open))) {
    await section.locator('summary').first().click()
  }
  const control = page.locator('#bbb-bgType')
  await expect(control).toBeVisible({ timeout: 10000 })

  const options = await control.locator('option').evaluateAll((els) =>
    els.map((e) => e.value)
  )
  const current = await control.inputValue()
  const next = options.find((v) => v !== current)
  expect(next, 'the rail offers no second background to choose').toBeTruthy()
  await control.selectOption(next)

  /* The composed page repaints because the compositor recomposed it. */
  await expect
    .poll(() => page.locator('.bbb-positioned-page > rect').first().getAttribute('fill'), {
      timeout: 15000,
    })
    .not.toBe(before)
})

test('the rest of the Builder still works', async ({ page }) => {
  await start(page, 'React Builder Intact', DESKTOP)
  await expect(page.locator('.bbb-positioned-page').first()).toBeVisible({ timeout: 20000 })

  /* Only one page is compositor-driven. The others must be untouched. */
  const pages = await page.locator('.bbb-page').count()
  expect(pages).toBeGreaterThan(1)
  await expect(page.locator('.bbb-page--type, .bbb-page--content').first()).toBeAttached()

  /* The rail, the flipbook and the export are the product around the proof. */
  await expect(page.locator('.bbb-panel__title, .bbb-section').first()).toBeAttached()
  await page.getByRole('button', { name: /Flip through it/i }).click()
  await expect(page.locator('.bbb-flip, [role="dialog"]').first()).toBeVisible({ timeout: 10000 })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /Print \/ save as PDF/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Download PDF/i })).toBeVisible()
})

test('the composed page holds together on a phone', async ({ page }) => {
  await start(page, 'React Mobile', MOBILE)
  const svg = page.locator('.bbb-positioned-page').first()
  await expect(svg).toBeVisible({ timeout: 20000 })

  const sheet = await page.locator('.bbb-page--composed').first().boundingBox()
  expect(sheet.width).toBeLessThanOrEqual(MOBILE.width)
  /* Same proportions as on the desktop — the page scales, it does not reflow
     into a different shape. */
  expect(sheet.width / sheet.height).toBeCloseTo(612 / 792, 2)

  const band = await page.locator('[data-box="band"]').first().boundingBox()
  expect(Math.round(band.width)).toBe(Math.round(sheet.width))
  /* Nothing clipped away: the band is inside the sheet it belongs to. */
  expect(band.y).toBeGreaterThanOrEqual(sheet.y - 1)
  expect(band.height).toBeGreaterThan(0)
})
