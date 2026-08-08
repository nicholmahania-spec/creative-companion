import { test, expect } from '@playwright/test'
import {
  headingForStep,
  openIdentitySubstep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'
import { markPng } from './makePng.js'

/**
 * Two Identity defects found by driving the built app, both invisible to the
 * unit suite and to review.
 *
 * 1. THE 0px SWATCHES. `.direction-palette { display: flex }` lived in
 *    `lazy-ideate.css` while its `flex: 1` children lived in
 *    `lazy-design.css`. On a cold load of Identity the container was a plain
 *    block, the buttons were 0px wide, and assigning a color role — the
 *    primary interaction on that screen — was impossible. It worked for anyone
 *    who had visited Research first, because CSS is global once its chunk
 *    loads. `src/lib/paletteStripCss.test.js` guards the ownership rule
 *    cheaply; this measures the rendered result, which is the only thing that
 *    proves a designer can click it.
 *
 * 2. ONE CONCEPT → ONE RATIONALE. The concept card rendered the project's
 *    mirrored `logoDirection` for whichever concept was starred, and choosing
 *    a concept with no reasoning left the mirror where it was. Star A, write a
 *    why, star B: B was displayed — and shipped in the brand book — carrying
 *    A's sentence.
 */

async function toIdentity(page, name) {
  const gate = await unlockAndOnboard(page, { name })
  skipIfCloud(test, gate)
  await stepByIdIn(await pathNav(page), 'design').click()
  await expect(headingForStep(page, 'design').first()).toBeVisible({
    timeout: 15000,
  })
}

async function expectClickableSwatches(page, tag) {
  for (const sel of ['.palette-role-swatch-btn', '.palette-swatch-btn']) {
    const loc = page.locator(sel)
    const n = await loc.count()
    expect(n, `${tag}: no ${sel}`).toBeGreaterThan(0)
    for (let i = 0; i < n; i += 1) {
      const box = await loc.nth(i).boundingBox()
      /* Height was never the problem — `min-height` came from the child rule.
         Width is what the missing flex parent took away. */
      expect(box?.width, `${tag}: ${sel}[${i}] width`).toBeGreaterThan(8)
    }
  }
}

const rolesInStore = (page) =>
  page.evaluate(() => {
    const raw = JSON.parse(
      localStorage.getItem('creative-companion-storage') || '{}'
    )
    const st = raw.state || raw
    return (
      (st.projects || []).find((p) => p.id === st.currentProjectId)
        ?.colorRoles || null
    )
  })

test('a cold load of Identity → Color can assign a role by clicking a swatch', async ({
  page,
}) => {
  // No detour through Research: this is the path that used to be broken.
  await toIdentity(page, 'Cold Color')
  await openIdentitySubstep(page, 'colors')
  await expectClickableSwatches(page, 'desktop')

  const before = await rolesInStore(page)
  await page.locator('.palette-role-swatch-btn').first().click()
  await page.waitForTimeout(500)
  expect(JSON.stringify(await rolesInStore(page))).not.toBe(
    JSON.stringify(before)
  )
})

test('the swatches survive a phone and a keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await toIdentity(page, 'Mobile Color')
  await openIdentitySubstep(page, 'colors')
  await expectClickableSwatches(page, 'mobile')
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(391)

  const first = page.locator('.palette-role-swatch-btn').first()
  await first.focus()
  await expect(first).toBeFocused()
  // A 0px control is reachable by keyboard and invisible to a pointer, so the
  // label is the only thing that ever said what it did. It still must.
  expect(await first.getAttribute('aria-label')).toBeTruthy()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  expect(Object.keys((await rolesInStore(page)) || {}).length).toBeGreaterThan(0)
})

test('a concept’s reasoning never appears under another concept', async ({
  page,
}) => {
  await toIdentity(page, 'Concept Why')
  const fileInput = page.locator(
    '#design-section-content-logo input[type="file"]'
  )
  for (const hex of ['#b91c1c', '#1d4ed8']) {
    await fileInput.setInputFiles({
      name: `${hex.slice(1)}.png`,
      mimeType: 'image/png',
      buffer: markPng(hex),
    })
    await page.waitForTimeout(700)
  }

  const whys = page.locator('.mark-concept-why')
  await expect(whys).toHaveCount(2)
  await whys.nth(0).fill('Survives a 12mm stamp')
  await whys.nth(1).fill('Works at tiny sizes')
  await page.waitForTimeout(400)

  const stars = page.locator('.mark-concept-star')
  const shipped = () =>
    page.evaluate(() => {
      const raw = JSON.parse(
        localStorage.getItem('creative-companion-storage') || '{}'
      )
      const st = raw.state || raw
      return (
        (st.projects || []).find((p) => p.id === st.currentProjectId)
          ?.logoDirection || ''
      )
    })

  await stars.nth(0).click()
  await page.waitForTimeout(400)
  expect(await whys.nth(0).inputValue()).toBe('Survives a 12mm stamp')
  expect(await shipped()).toBe('Survives a 12mm stamp')

  await stars.nth(1).click()
  await page.waitForTimeout(400)
  expect(await whys.nth(1).inputValue()).toBe('Works at tiny sizes')
  // A's sentence stayed on A — choosing is not editing — and did not follow
  // the star onto B.
  expect(await whys.nth(0).inputValue()).toBe('Survives a 12mm stamp')
  expect(await shipped()).toBe('Works at tiny sizes')
})
