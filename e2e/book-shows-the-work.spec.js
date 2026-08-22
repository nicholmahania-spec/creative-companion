import { test, expect } from '@playwright/test'
import { openTool, skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * PHASE 9 — THE BOOK SHOWS THE WORK, IN A REAL BROWSER.
 *
 * WHAT THIS FILE PROVES, AND WHAT IT DELIBERATELY DOES NOT.
 *
 * The unit tests read the resolver and the freeze directly and can assert
 * byte identity between what is proofed and what is shipped. What they cannot
 * see is whether the page a designer actually looks at draws the artwork —
 * `appAssetFor` returning `ready` proves nothing if the canvas never calls it,
 * or calls it and renders a mock anyway. That is this file's job.
 *
 * There is no Supabase in e2e, so a real Send and a real `/d/` delivery are
 * unreachable (see `delivery-from-version.spec.js` for why). NOTHING here
 * stubs a publish to get past that. The end of the chain — frozen pack and
 * delivered pack resolving the same bytes — is asserted in
 * `bookShowsTheWork.test.js`, which can read both sides honestly.
 */

const STORE_KEY = 'creative-companion-storage'

/* Two 1x1 PNGs that differ, so "the right one" is a checkable claim rather
   than "an image appeared". */
const CARD =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const STOCK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/**
 * Seeded through `addInitScript` and a reload, never `evaluate`-then-reload: a
 * plain write races Zustand's persist, which rehydrates over it before the
 * reload can read it. (`book-document.spec.js` hit the same wall.)
 */
async function seedProject(page, patch) {
  await page.addInitScript(
    ({ key, patch: p }) => {
      try {
        const raw = JSON.parse(localStorage.getItem(key) || '{}')
        if (!raw?.state?.projects?.length) return
        const id = raw.state.currentProjectId
        raw.state.projects = raw.state.projects.map((proj) =>
          proj.id === id
            ? {
                ...proj,
                ...p,
                detective: { ...(proj.detective || {}), ...(p.detective || {}) },
              }
            : proj
        )
        localStorage.setItem(key, JSON.stringify(raw))
      } catch {
        /* Nothing persisted yet — the assertions below will say so. */
      }
    },
    { key: STORE_KEY, patch }
  )
  await page.reload()
}

async function openBook(page) {
  await openTool(page, /Brand book/i)
  await expect(page.locator('.bbb-topbar__summary')).toBeVisible({ timeout: 15000 })
}

async function openSection(page, name) {
  const section = page.locator('.bbb-section', { hasText: name }).first()
  await expect(section).toBeAttached({ timeout: 10000 })
  if (!(await section.evaluate((el) => el.open))) {
    await section.locator('summary').first().click()
  }
  return section
}

const SHELF = [
  { id: 'pa_card', name: 'Business card', dataUrl: CARD, rights: 'clientOwned' },
  { id: 'pa_stock', name: 'Stock photo', dataUrl: STOCK, rights: 'thirdParty' },
]

async function start(page, name) {
  await page.setViewportSize({ width: 1280, height: 900 })
  const gate = await unlockAndOnboard(page, {
    name,
    testerName: 'T',
    expectOnboardDialog: true,
  })
  skipIfCloud(test, gate)
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })
  return gate
}

test("the Book draws the designer's real artwork, and holds back what it may not ship", async ({
  page,
}) => {
  await start(page, 'Phase Nine')
  await seedProject(page, {
    detective: { deliverablesPicked: ['businessCard'] },
    packageAssets: SHELF,
  })
  await openBook(page)

  /* BEFORE: the Applications page falls back to the direction mock, because
     nothing has been placed yet. */
  const card = page.locator('.bbb-apps-card').first()
  await expect(card).toBeVisible({ timeout: 15000 })
  await expect(card.locator('.bbb-apps-card__art')).toHaveCount(0)

  const picker = await openSection(page, 'Application artwork')
  const select = picker.locator('select').first()
  await expect(select).toBeVisible({ timeout: 10000 })

  /* THE RIGHTS GATE, AS A LIVE FACT. A third-party file is not offered at all —
     the designer cannot place into the client's book something Delivery would
     refuse to send. */
  const options = (await select.locator('option').allInnerTexts()).join(' | ')
  expect(options).toContain('Business card')
  expect(options, 'a file the package would refuse was offered').not.toContain('Stock photo')

  await select.selectOption({ label: 'Business card' })

  /* AFTER: the real file is on the page, and the fabricated mock is gone. */
  const art = card.locator('.bbb-apps-card__art')
  await expect(art).toBeVisible({ timeout: 10000 })
  await expect(art).toHaveAttribute('src', CARD)

  /* And it is a project decision, not view state. Polled because persist
     flushes after the render that already proved the canvas updated. */
  await expect
    .poll(
      () =>
        page.evaluate((key) => {
          const raw = JSON.parse(localStorage.getItem(key) || '{}')
          const st = raw?.state || {}
          const p =
            (st.projects || []).find((x) => x.id === st.currentProjectId) || st.projects?.[0]
          return p?.touchpointApps?.businessCard?.asset || null
        }, STORE_KEY),
      { timeout: 10000 }
    )
    .toEqual({ kind: 'produced', id: 'pa_card' })
})

test('artwork that left the project says so, and never quietly becomes a mock', async ({
  page,
}) => {
  await start(page, 'Phase Nine Missing')
  /* The reference outlives the file — the state a designer reaches by tidying
     the package shelf. The book must say what happened, not draw a mock in its
     place and look finished. */
  await seedProject(page, {
    detective: { deliverablesPicked: ['businessCard'] },
    packageAssets: [],
    touchpointApps: { businessCard: { asset: { kind: 'produced', id: 'pa_card' } } },
  })
  await openBook(page)

  const held = page.locator('.bbb-apps-card__held').first()
  await expect(held).toBeVisible({ timeout: 15000 })
  await expect(held).toContainText(/no longer in the project/i)
  await expect(page.locator('.bbb-apps-card__art')).toHaveCount(0)
})

test('artwork whose rights changed after it was placed is held back, not swapped', async ({
  page,
}) => {
  await start(page, 'Phase Nine Rights')
  /* Unreachable through the picker, which filters this file out — but reachable
     in life, by re-tagging a file that was already placed. The book must refuse
     it at render too, or the gate is only advisory. */
  await seedProject(page, {
    detective: { deliverablesPicked: ['businessCard'] },
    packageAssets: [{ id: 'pa_x', name: 'Was ours', dataUrl: CARD, rights: 'doNotDistribute' }],
    touchpointApps: { businessCard: { asset: { kind: 'produced', id: 'pa_x' } } },
  })
  await openBook(page)

  const held = page.locator('.bbb-apps-card__held').first()
  await expect(held).toBeVisible({ timeout: 15000 })
  await expect(held).toContainText(/usage rights/i)
  await expect(page.locator('.bbb-apps-card__art')).toHaveCount(0)
})
