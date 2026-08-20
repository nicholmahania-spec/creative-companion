import { test, expect } from '@playwright/test'
import { openTool, skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * PHASE 8 — DELIVERY IS VERSION-BOUND, IN A REAL BROWSER.
 *
 * WHAT THIS FILE CAN PROVE, AND WHAT IT DELIBERATELY DOES NOT.
 *
 * There is no Supabase in e2e. `publishDelivery` returns CLOUD_REQUIRED before
 * it reaches a network call, and `DeliverToClient` returns early without an
 * account and a client link — so the Send button is not reachable here at all.
 * NOTHING in this file fakes a publish to get past that. A test that stubbed
 * the RPC would be asserting that the stub works, and the freeze → verify →
 * resolve → publish ordering is a property of the code that unit tests read
 * directly (`documentVersionOwnership.test.js`, `deliveryOwnership.test.js`).
 *
 * What a browser IS needed for is the half those cannot see:
 *
 *   1. that ordinary Book work creates neither a Version nor a delivery — the
 *      claim that Send is the only thing that freezes anything, checked against
 *      what actually lands in the persisted blob after real clicks;
 *
 *   2. that `/d/` is a genuinely separate surface that cannot see the studio —
 *      loaded in the same browser, with a full project sitting in localStorage,
 *      showing none of it. That is `M7` as a live fact rather than an import
 *      check, and it is the one Phase 8 invariant a source scan can only
 *      approximate.
 */

const STORE_KEY = 'creative-companion-storage'

const projectState = (page) =>
  page.evaluate((key) => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '{}')
      const projects = raw?.state?.projects || []
      const id = raw?.state?.currentProjectId
      return projects.find((p) => p.id === id) || projects[0] || null
    } catch {
      return null
    }
  }, STORE_KEY)

async function openBook(page) {
  await openTool(page, /Brand book/i)
  await expect(page.locator('.bbb-topbar__summary')).toBeVisible({ timeout: 15000 })
  const section = page.locator('.bbb-section', { hasText: 'In this book' }).first()
  await expect(section).toBeAttached({ timeout: 10000 })
  if (!(await section.evaluate((el) => el.open))) {
    await section.locator('summary').first().click()
  }
  await expect(page.locator('.bbb-pagelist').first()).toBeVisible({ timeout: 15000 })
}

test('working on the Book freezes nothing and delivers nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const gate = await unlockAndOnboard(page, {
    name: 'Phase Eight',
    testerName: 'T',
    expectOnboardDialog: true,
  })
  skipIfCloud(test, gate)
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })

  await openBook(page)

  /* Real edits: a setup override and a reorder — the two kinds of Book work. */
  const setup = page.locator('.bbb-section', { hasText: 'Setup' }).first()
  if (!(await setup.evaluate((el) => el.open))) {
    await setup.locator('summary').first().click()
  }
  await page.getByRole('group', { name: 'Sheet' }).getByRole('button', { name: /^A4$/ }).click()

  const list = page.locator('.bbb-pagelist').first().locator('li')
  const labels = await list.locator('.bbb-page-link').allInnerTexts()
  expect(labels.length).toBeGreaterThan(1)
  const second = list.nth(1)
  await second.getByLabel(`Actions for ${labels[1]}`).click()
  await second.getByRole('button', { name: 'Move up' }).click()

  /* The edits landed — so the absence below is a real absence, not a page that
     never did anything. */
  await expect
    .poll(async () => (await projectState(page))?.document?.overrides?.pageSize, {
      timeout: 10000,
    })
    .toBe('a4')

  const after = await projectState(page)
  expect(after.documentVersions || [], 'editing the Book froze a Version').toHaveLength(0)
  expect(after.deliveryHistory || [], 'editing the Book recorded a delivery').toHaveLength(0)

  /* And it survives a reload — no deferred write mints one late. */
  await page.reload()
  await openBook(page)
  const reloaded = await projectState(page)
  expect(reloaded.documentVersions || []).toHaveLength(0)
  expect(reloaded.deliveryHistory || []).toHaveLength(0)
})

test('the client reveal page cannot see the studio', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const gate = await unlockAndOnboard(page, {
    name: 'Sees Nothing Ltd',
    testerName: 'T',
    expectOnboardDialog: true,
  })
  skipIfCloud(test, gate)
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })

  /* A project with real, distinctive brand content sitting in this browser. */
  await page.addInitScript(
    ({ key, mark }) => {
      try {
        const raw = JSON.parse(localStorage.getItem(key) || '{}')
        if (!raw?.state?.projects?.length) return
        const id = raw.state.currentProjectId
        raw.state.projects = raw.state.projects.map((p) =>
          p.id === id
            ? {
                ...p,
                tagline: mark,
                positioning: mark,
                palette: ['#abcdef'],
                typeHeading: mark,
              }
            : p
        )
        localStorage.setItem(key, JSON.stringify(raw))
      } catch {
        /* Nothing persisted yet — the assertion below will say so. */
      }
    },
    { key: STORE_KEY, mark: 'STUDIOONLYSECRET' }
  )
  await page.reload()
  await expect(page.locator('.cc-stage, main').first()).toBeVisible({ timeout: 15000 })

  const seeded = await projectState(page)
  expect(seeded.tagline, 'the studio-only marker never landed').toBe('STUDIOONLYSECRET')

  /* Now the public route, same browser, same origin, same localStorage. */
  await page.goto('/d/00000000-0000-4000-8000-000000000000')
  await expect(page.locator('.reveal-page')).toBeVisible({ timeout: 15000 })

  /* It renders its own page and says something honest about the LINK — the
     Phase 6 client-facing copy, which never blames the reader and always gives
     one next step. The exact sentence is that phase's to own; what matters
     here is that a page appeared and it is about the link. */
  const status = page.locator('.reveal-status')
  await expect(status).toBeVisible({ timeout: 10000 })
  await expect(status).toContainText(/link/i)

  /* And none of the project in this very browser reached it. An undelivered
     link shows nothing, rather than helpfully falling back to the desk. */
  const body = await page.locator('body').innerText()
  expect(body, 'the studio project leaked onto the client page').not.toContain(
    'STUDIOONLYSECRET'
  )
  expect(body).not.toContain('#abcdef')
  /* No studio chrome either — this is not the app with a different route. */
  await expect(page.locator('.cc-stage')).toHaveCount(0)
})
