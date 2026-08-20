import { test, expect } from '@playwright/test'
import { openTool, skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * PHASE 7 — THE BRAND BOOK IS A DOCUMENT THE DESIGNER EDITS, IN A REAL BROWSER.
 *
 * WHAT A BROWSER IS NEEDED FOR HERE. The ownership move — `project.document`
 * becomes canonical, `project.bookBuilder` becomes a read projection — is
 * proved in `bookDocumentOwnership.test.js` against the functions. What that
 * cannot see is whether the EDITOR is wired to any of it: whether opening the
 * Book creates a Document, whether the panel's controls reach it, whether a
 * reorder survives a reload, and whether the legacy bag a real user's browser
 * is still holding gets migrated when they open the view. This repo has
 * shipped a whole stop whose store field had no writer anywhere in `src/`
 * while every unit check stayed green — see `touchpoints.spec.js`. That is the
 * risk this file covers and the reason it drives the UI rather than the store.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. Book Send still runs through Delivery,
 * which needs Supabase, and there is none in e2e. Nothing here fakes a
 * successful publish to manufacture a frozen Version — a test that stubbed the
 * RPC would assert that the stub works. The freeze and the frozen render are
 * covered where they actually live, in `bookDocumentOwnership.test.js` and
 * `documentVersionOwnership.test.js`.
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

/**
 * Open the Book editor and reveal its page list.
 *
 * Both rail panels are collapsed on arrival by design — the canvas already
 * shows the book, so an open 15-row list of the same pages was the tallest
 * thing in the rail. So they are opened here the way a person opens them,
 * which also keeps this test honest about the number of clicks it takes.
 */
async function openBook(page) {
  await openTool(page, /Brand book/i)
  await expect(page.locator('.bbb-topbar__summary')).toBeVisible({ timeout: 15000 })
  await openPanel(page, 'In this book')
  await expect(page.locator('.bbb-pagelist').first()).toBeVisible({ timeout: 15000 })
}

/** Expand one collapsed rail panel by its title. */
async function openPanel(page, title) {
  const section = page.locator('.bbb-section', { hasText: title }).first()
  await expect(section).toBeAttached({ timeout: 10000 })
  if (!(await section.evaluate((el) => el.open))) {
    await section.locator('summary').first().click()
  }
  await expect(section).toHaveJSProperty('open', true, { timeout: 5000 })
}

test('the Book editor owns the Book, and ordinary editing mints no Version', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const gate = await unlockAndOnboard(page, {
    name: 'Phase Seven',
    testerName: 'T',
    expectOnboardDialog: true,
  })
  skipIfCloud(test, gate)
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })

  await openBook(page)

  /* 1. ENSURE ON OPEN, NOT AT SEND. A designer who never sends should still
     have a Document — that is what makes the Document the working state
     rather than a byproduct of delivery. */
  await expect
    .poll(async () => (await projectState(page))?.document?.kind, {
      timeout: 10000,
      message: 'opening the Book editor created no Book Document',
    })
    .toBe('book')
  const opened = await projectState(page)
  expect(opened.document.templateId).toBe('dtpl_builtin_book')

  /* 2. A BOOK-SPECIFIC OVERRIDE, THROUGH THE PANEL. Setup is closed on
     arrival by design, so it is opened the way a person would. */
  await openPanel(page, 'Setup')
  const sheet = page.getByRole('group', { name: 'Sheet' })
  await expect(sheet).toBeVisible({ timeout: 5000 })
  await sheet.getByRole('button', { name: /^A4$/ }).click()

  await expect
    .poll(async () => (await projectState(page))?.document?.overrides?.pageSize, {
      timeout: 10000,
      message: 'the Sheet control did not reach document.overrides',
    })
    .toBe('a4')

  /* 3. AND THE WORKING PREVIEW MOVED WITH IT. The sheet size is stated back
     in the top bar as a sentence, which is the surface a designer actually
     reads to confirm the change took. */
  await expect(page.locator('.bbb-topbar__summary')).toContainText(/A4/i, {
    timeout: 10000,
  })

  /* 4. REORDER, THROUGH THE PAGE LIST. */
  const list = page.locator('.bbb-pagelist').first().locator('li')
  const before = await list.locator('.bbb-page-link').allInnerTexts()
  expect(before.length, 'no pages to reorder').toBeGreaterThan(1)

  /* The row's actions live behind a <details> disclosure, deliberately: it is
     pointer- and keyboard-operable with no focus-trap code, which is what
     WCAG 2.2 SC 2.5.7 wants and what drag-to-reorder would fail. So the
     handle is a <summary>, not a button — `getByLabel`, not `getByRole`. */
  const secondRow = list.nth(1)
  await secondRow.getByLabel(`Actions for ${before[1]}`).click()
  const moveUp = secondRow.getByRole('button', { name: 'Move up' })
  await expect(moveUp).toBeEnabled({ timeout: 5000 })
  await moveUp.click()

  /* The list collapses consecutive pages of one section into a single row, so
     the row labels are not the composition one-for-one. What must be true is
     that the Document's order MOVED and the list now reads the new way. */
  const expectedFirst = before[1]
  await expect(list.locator('.bbb-page-link').first()).toHaveText(expectedFirst, {
    timeout: 10000,
  })
  await expect
    .poll(async () => (await projectState(page))?.document?.composition?.length, {
      timeout: 10000,
      message: 'the reorder did not reach document.composition',
    })
    .toBeGreaterThan(0)

  /* 5. AND IT SURVIVES A RELOAD — read back out of the Document, not out of
     component state that happened to still be mounted. */
  const composition = (await projectState(page)).document.composition
  await page.reload()
  await openBook(page)
  await expect(page.locator('.bbb-pagelist').first().locator('li .bbb-page-link').first()).toHaveText(
    expectedFirst,
    { timeout: 15000 }
  )
  expect(
    (await projectState(page)).document.composition,
    'the Document composition changed across a reload'
  ).toEqual(composition)

  /* 6. NONE OF THAT WAS A SEND. Typing, choosing and reordering are work, and
     work does not mint the record a client's approval hangs off. */
  const after = await projectState(page)
  expect(after.documentVersions || [], 'ordinary editing created a Version').toHaveLength(0)
})

test('a legacy bookBuilder-only project migrates when the Book is opened', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const gate = await unlockAndOnboard(page, {
    name: 'Phase Seven Legacy',
    testerName: 'T',
    expectOnboardDialog: true,
  })
  skipIfCloud(test, gate)
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })

  /* The real page ids this project's book is made of, read off the editor.
     Inventing ids here would make the test pass for the wrong reason: an order
     naming pages that do not exist is filtered out and the view falls back to
     the natural order, so the assertion would be measuring the fallback. */
  await openBook(page)
  const realOrder = await page
    .locator('.bbb-pagelist')
    .first()
    .locator('li .bbb-page-link')
    .evaluateAll((els) => els.map((a) => a.getAttribute('href').slice(1)))
  expect(realOrder.length, 'the book has no pages to order').toBeGreaterThan(2)
  const legacyOrder = [realOrder[1], realOrder[0], ...realOrder.slice(2)]

  /* A browser that last ran a pre-Phase-7 build: everything in the legacy bag
     and no Document at all. Seeded through `addInitScript` rather than
     `evaluate`-then-reload, because a plain write races Zustand's persist,
     which rehydrates over it before the reload can read it. */
  await page.addInitScript(
    ({ key, bag }) => {
      try {
        const raw = JSON.parse(localStorage.getItem(key) || '{}')
        if (!raw?.state?.projects?.length) return
        const id = raw.state.currentProjectId
        raw.state.projects = raw.state.projects.map((p) => {
          if (p.id !== id) return p
          /* No Document at all — the state a browser is genuinely in before
             it has ever run a build that mints one. */
          const legacy = { ...p, bookBuilder: bag }
          delete legacy.document
          delete legacy.documents
          return legacy
        })
        localStorage.setItem(key, JSON.stringify(raw))
      } catch {
        /* Nothing persisted yet — the assertions below will say so. */
      }
    },
    {
      key: STORE_KEY,
      bag: {
        v: 1,
        pageSize: 'a4',
        edgeSpace: 'tight',
        printShop: true,
        running: { show: false, text: 'Legacy running' },
        pageOrder: legacyOrder,
        pageLocking: { lockedPages: [legacyOrder[0]] },
      },
    }
  )
  await page.reload()
  await expect(page.locator('.cc-stage, main').first()).toBeVisible({ timeout: 15000 })

  const seeded = await projectState(page)
  expect(seeded.document, 'the legacy seed already had a Document').toBeFalsy()
  expect(seeded.bookBuilder.pageSize).toBe('a4')

  await openBook(page)

  /* The settings transferred, in full. A migration that produced an empty
     Document would lose a real designer's book setup on upgrade. */
  await expect
    .poll(async () => (await projectState(page))?.document?.overrides?.pageSize, {
      timeout: 15000,
      message: 'opening the Book did not migrate the legacy bag',
    })
    .toBe('a4')

  const migrated = await projectState(page)
  expect(migrated.document.overrides.edgeSpace).toBe('tight')
  expect(migrated.document.overrides.printShop).toBe(true)
  expect(migrated.document.overrides.running.text).toBe('Legacy running')
  expect(migrated.document.composition.map((r) => r.pageId)).toEqual(legacyOrder)
  expect(
    migrated.document.composition.find((r) => r.pageId === legacyOrder[0]).locked,
    'the locked page came back unlocked'
  ).toBe(true)

  /* NON-DESTRUCTIVE. The legacy bag is still there, so a downgrade does not
     land the designer on an empty book. */
  expect(migrated.bookBuilder.pageOrder).toEqual(legacyOrder)

  /* And the editor is showing the migrated order, not the natural one — which
     is the half that proves the view reads the Document rather than still
     reading the bag it was migrated from. */
  await expect(
    page.locator('.bbb-pagelist').first().locator('li .bbb-page-link').first()
  ).toHaveAttribute('href', `#${legacyOrder[0]}`, { timeout: 10000 })

  /* IDEMPOTENT. Opening it again must not re-run the migration into something
     different, or every visit would be a silent rewrite. */
  await page.reload()
  await openBook(page)
  expect((await projectState(page)).document.composition).toEqual(
    migrated.document.composition
  )
})
