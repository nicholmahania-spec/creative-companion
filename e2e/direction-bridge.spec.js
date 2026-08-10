import { test, expect } from '@playwright/test'
import {
  headingForStep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * The creative middle, end to end.
 *
 * Research collects, Directions interprets, Identity develops. This walks the
 * join in the real app: what you favourite in the brief turns up as material,
 * tapping it builds a route, and the route follows you to Identity.
 */

async function start(page, name, width = 1440) {
  await page.setViewportSize({ width, height: 900 })
  const gate = await unlockAndOnboard(page, { name })
  skipIfCloud(test, gate)
  return gate
}

async function goToStep(page, id) {
  await stepByIdIn(await pathNav(page), id).click()
  await expect(headingForStep(page, id).first()).toBeVisible({ timeout: 15000 })
}

async function favouriteSamples(page, n = 2) {
  await goToStep(page, 'define')
  await page.locator('.vd').scrollIntoViewIfNeeded()
  await expect(page.locator('.vd')).toBeVisible({ timeout: 10000 })
  for (let i = 0; i < n; i += 1) {
    await page.locator('.vd-fav').nth(i % 2).click()
    await page.waitForTimeout(200)
    if (i % 2 === 1) {
      await page.locator('.vd-pick').first().click()
      await page.waitForTimeout(250)
    }
  }
}

/* Reads the PERSISTED snapshot, so a 400ms debounced write has to land first
   (`PERSIST_DEBOUNCE_MS`). Reading it rather than the live store is the point:
   what survives a reload is what the workflow actually produced. */
const routesInStore = async (page) => {
  await page.waitForTimeout(600)
  return page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('creative-companion-storage') || '{}')
    const st = raw.state || raw
    const p = (st.projects || []).find((x) => x.id === st.currentProjectId)
    return {
      ids: (p.directions || []).map((d) => d.id),
      active: p.activeDirectionId ?? null,
      chosen: (p.directions || []).filter((d) => d.chosen).map((d) => d.id),
      evidence: Object.fromEntries((p.directions || []).map((d) => [d.id, d.evidence || []])),
      log: (p.decisionLog || []).map((e) => ({ id: e.directionId, label: e.label })),
    }
  })
}

test('arrives with no routes and one thing to do', async ({ page }) => {
  await start(page, 'Bridge Empty')
  await goToStep(page, 'ideate')

  /* NO SEEDED WORKSHEET. Three empty A/B/C cards used to be drawn before the
     designer had formed a single route. */
  await expect(page.locator('.ideate-dir-card')).toHaveCount(0)
  await expect(page.locator('#dir-add')).toBeVisible()
  expect((await routesInStore(page)).ids).toEqual([])
})

test('what you favourite in the brief turns up as material', async ({ page }) => {
  await start(page, 'Bridge Evidence')
  await favouriteSamples(page, 2)
  await goToStep(page, 'ideate')

  await expect(page.locator('.dir-ev-band')).toBeVisible()
  await expect(page.locator('.dir-ev-item')).toHaveCount(2)
})

test('one route is open, and tapping material puts it in that route', async ({
  page,
}) => {
  await start(page, 'Bridge Tap')
  await favouriteSamples(page, 2)
  await goToStep(page, 'ideate')

  await page.locator('#dir-add').click()
  await expect(page.locator('.ideate-dir-card')).toHaveCount(1)
  await expect(page.locator('.ideate-dir-card').first()).toHaveClass(/is-open/)

  const first = page.locator('.dir-ev-item').first()
  await expect(first).toHaveAttribute('aria-pressed', 'false')
  await first.click()
  await page.waitForTimeout(250)
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.ideate-dir-card .dir-ev-cited')).toHaveCount(1)

  // A second route takes the tap next, and the first keeps what it had.
  await page.locator('#dir-add').click()
  await page.waitForTimeout(250)
  await expect(page.locator('.ideate-dir-card').nth(1)).toHaveClass(/is-open/)
  await page.locator('.dir-ev-item').nth(1).click()
  await page.waitForTimeout(250)

  const store = await routesInStore(page)
  expect(store.ids).toEqual(['a', 'b'])
  expect(store.evidence.a).toHaveLength(1)
  expect(store.evidence.b).toHaveLength(1)
  expect(store.evidence.a[0]).not.toBe(store.evidence.b[0])
})

test('keyboard alone can make a route, name it and choose it', async ({ page }) => {
  await start(page, 'Bridge Keys')
  await favouriteSamples(page, 2)
  await goToStep(page, 'ideate')

  const add = page.locator('#dir-add')
  await add.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)

  // Creating focuses the name, so the next keystroke is already in the field.
  const name = page.locator('#dir-title-a')
  await expect(name).toBeFocused()
  await page.keyboard.type('Quiet serif')

  const tile = page.locator('.dir-ev-item').first()
  await tile.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  await expect(tile).toHaveAttribute('aria-pressed', 'true')

  const choose = page.getByRole('button', { name: 'Choose this' })
  await choose.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)

  const store = await routesInStore(page)
  expect(store.chosen).toEqual(['a'])
  /* CHOOSING OPENS. Having decided, the next act is making it. */
  expect(store.active).toBe('a')
  // And the log names the route, never the letter.
  expect(store.log[0].label).toBe('')
  expect(store.log[0].id).toBe('a')
})

test('Develop takes the route to Identity, which says which one it is', async ({
  page,
}) => {
  await start(page, 'Bridge Develop')
  await goToStep(page, 'ideate')

  await page.locator('#dir-add').click()
  await page.locator('#dir-title-a').fill('Quiet serif')
  await page.waitForTimeout(200)

  /* Snapshot the canonical identity fields BEFORE the handoff. A new project
     already has a default pairing, so "arriving does not finalize" is a
     comparison, not an emptiness check. */
  const identityFields = () =>
    page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('creative-companion-storage') || '{}')
      const st = raw.state || raw
      const p = (st.projects || []).find((x) => x.id === st.currentProjectId)
      return {
        heading: p.typeHeading ?? '',
        body: p.typeBody ?? '',
        logo: p.logoImage ?? '',
        palette: (p.palette || []).join(','),
      }
    })
  await page.waitForTimeout(600)
  const before = await identityFields()

  await page.getByRole('button', { name: 'Develop', exact: true }).click()
  await expect(headingForStep(page, 'design').first()).toBeVisible({ timeout: 15000 })

  const strip = page.locator('.dir-developing')
  await expect(strip).toBeVisible()
  await expect(strip).toContainText('Quiet serif')
  /* Working material board — parts are honest about capture vs missing. */
  await expect(strip).toContainText(/Color|Type|Mark/)
  await expect(strip).toHaveAttribute('data-direction-working', 'true')

  // DEVELOPING IS NOT CHOSEN, and Develop does not silently finalize brand fields.
  const store = await routesInStore(page)
  expect(store.chosen).toEqual([])
  expect(store.active).toBe('a')
  await page.waitForTimeout(600)
  expect(await identityFields()).toEqual(before)

  // Stopping has its own control, where the state is visible.
  await strip.getByRole('button', { name: 'Stop' }).click()
  await expect(page.locator('.dir-developing')).toHaveCount(0)
  // Stop does not rewrite the brand system either.
  expect(await identityFields()).toEqual(before)
})

test('Develop grounds Identity in chosen route material without overwriting the brand system', async ({
  page,
}) => {
  await start(page, 'Bridge Handoff')
  /* Colour hearts specifically — type samples are not palette material. */
  await goToStep(page, 'define')
  await page.locator('.vd').scrollIntoViewIfNeeded()
  await expect(page.locator('.vd')).toBeVisible({ timeout: 10000 })
  const colorTab = page.getByRole('button', { name: /^Color$/i }).first()
  if (await colorTab.count()) {
    await colorTab.click()
    await page.waitForTimeout(200)
  }
  for (let i = 0; i < 4; i += 1) {
    await page.locator('.vd-fav').nth(i % 2).click()
    await page.waitForTimeout(150)
    if (i % 2 === 1) {
      await page.locator('.vd-pick').first().click()
      await page.waitForTimeout(200)
    }
  }

  await goToStep(page, 'ideate')
  await page.locator('#dir-add').click()
  await page.locator('#dir-title-a').fill('Warm editorial')
  await page.waitForTimeout(200)
  const done = page.getByRole('button', { name: 'Done', exact: true })
  if (await done.count()) await done.click()

  const tile = page.locator('.dir-ev-item').first()
  await expect(tile).toBeVisible({ timeout: 10000 })
  await tile.click()
  await page.waitForTimeout(250)

  const identityFields = () =>
    page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('creative-companion-storage') || '{}')
      const st = raw.state || raw
      const p = (st.projects || []).find((x) => x.id === st.currentProjectId)
      return {
        heading: p.typeHeading ?? '',
        body: p.typeBody ?? '',
        logo: p.logoImage ?? '',
        palette: (p.palette || []).join(','),
        active: p.activeDirectionId ?? null,
        evidence: (p.directions || []).find((d) => d.id === 'a')?.evidence || [],
      }
    })
  await page.waitForTimeout(500)
  const before = await identityFields()
  expect(before.evidence.length).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Choose this' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Develop →' }).click()
  await expect(headingForStep(page, 'design').first()).toBeVisible({ timeout: 15000 })

  const strip = page.locator('.dir-developing')
  await expect(strip).toBeVisible()
  await expect(strip).toContainText('Warm editorial')
  await expect(strip.locator('.dir-developing-parts')).toBeVisible()
  await expect(strip).toContainText(/Color/i)

  /* Identity sub-nav Color — not Visual Discovery's Color tab. */
  await page.locator('.identity-subnav-btn', { hasText: 'Color' }).click()
  await page.waitForTimeout(400)
  await expect(page.locator('[data-testid="dir-route-colour"]')).toBeVisible({
    timeout: 8000,
  })

  const after = await identityFields()
  expect(after.heading).toBe(before.heading)
  expect(after.body).toBe(before.body)
  expect(after.logo).toBe(before.logo)
  expect(after.palette).toBe(before.palette)
  expect(after.active).toBe('a')
})

test('the strip is absent when nothing is being developed', async ({ page }) => {
  await start(page, 'Bridge Off')
  await goToStep(page, 'design')
  await expect(page.locator('.dir-developing')).toHaveCount(0)
})

test('a phone can do the whole thing without a drag', async ({ page }) => {
  await start(page, 'Bridge Phone', 390)
  await favouriteSamples(page, 2)
  await goToStep(page, 'ideate')

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391)

  await page.locator('#dir-add').click()
  await page.locator('#dir-title-a').fill('Quiet serif')
  await page.locator('.dir-ev-item').first().click()
  await page.waitForTimeout(250)

  const store = await routesInStore(page)
  expect(store.ids).toEqual(['a'])
  expect(store.evidence.a).toHaveLength(1)
})
