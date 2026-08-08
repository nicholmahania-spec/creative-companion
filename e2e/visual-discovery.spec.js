import { test, expect } from '@playwright/test'
import { headingForStep, pathNav, skipIfCloud, stepByIdIn, unlockAndOnboard } from './helpers.js'

/**
 * Visual Discovery is a comparison. If the two samples cannot be seen together
 * and chosen between, the feature does not exist — which is why the pair stays
 * two columns on a phone rather than stacking into a scroll.
 */

async function openBrief(page, name) {
  const gate = await unlockAndOnboard(page, { name })
  skipIfCloud(test, gate)
  await stepByIdIn(await pathNav(page), 'define').click()
  await expect(headingForStep(page, 'define').first()).toBeVisible({ timeout: 15000 })
  await page.locator('.vd').scrollIntoViewIfNeeded()
  await expect(page.locator('.vd')).toBeVisible({ timeout: 10000 })
}

const stored = (page) =>
  page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('creative-companion-storage') || '{}')
    const st = raw.state || raw
    const p = (st.projects || []).find((x) => x.id === st.currentProjectId)
    return p?.visualDiscovery || null
  })

test('choosing records the pick and moves on', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBrief(page, 'Discovery')

  const picks = page.locator('.vd-pick')
  await expect(picks).toHaveCount(2)
  const first = await picks.nth(0).getAttribute('aria-label')
  await picks.nth(0).click()
  await page.waitForTimeout(400)

  const vd = await stored(page)
  expect(vd.choices).toHaveLength(1)
  expect(vd.choices[0].shown).toHaveLength(2)
  expect(vd.choices[0].shown).toContain(vd.choices[0].chose)
  // A new pair, not the same one again.
  await expect(picks).toHaveCount(2)
  expect(await picks.nth(0).getAttribute('aria-label')).not.toBe(first)
})

test('keyboard alone can compare and choose', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBrief(page, 'Discovery Keys')

  const pick = page.locator('.vd-pick').first()
  await pick.focus()
  await expect(pick).toBeFocused()
  // The label names the sample, so a screen reader hears what it is choosing.
  expect(await pick.getAttribute('aria-label')).toMatch(/^Choose /)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  expect((await stored(page)).choices).toHaveLength(1)

  // Category switch is a real toggle with state, not a styled div.
  const cat = page.locator('.vd-cat').nth(1)
  await cat.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  expect(await cat.getAttribute('aria-pressed')).toBe('true')
})

test('says nothing until the choices support it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBrief(page, 'Discovery Quiet')
  // Nothing is claimed on arrival.
  await expect(page.locator('.vd-read')).toHaveCount(0)
  for (let i = 0; i < 4; i += 1) {
    await page.locator('.vd-pick').first().click()
    await page.waitForTimeout(250)
  }
  await expect(page.locator('.vd-read')).toHaveCount(0)
})

test('favoriting a sample never reaches the client pack', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBrief(page, 'Discovery Fav')
  await page.locator('.vd-fav').first().click()
  await page.waitForTimeout(400)
  const pins = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('creative-companion-storage') || '{}')
    const st = raw.state || raw
    return (st.moodItems || []).map((m) => ({ id: m.id, f: !!m.favorite, p: !!m.inPack }))
  })
  for (const p of pins) expect(p.p).toBe(false)
})

test('the comparison survives a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openBrief(page, 'Discovery Mobile')

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391)

  // Side by side, or it is not a comparison.
  const boxes = []
  const picks = page.locator('.vd-pick')
  for (let i = 0; i < 2; i += 1) boxes.push(await picks.nth(i).boundingBox())
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(8)
  for (const b of boxes) expect(b.width).toBeGreaterThan(120)

  await picks.nth(1).click()
  await page.waitForTimeout(400)
  expect((await stored(page)).choices).toHaveLength(1)
})
