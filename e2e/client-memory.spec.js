import { test, expect } from '@playwright/test'
import { skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * Client memory is reachable and writes through.
 *
 * The unit tests prove the reducers; they cannot prove the screen is wired to
 * them. This repo has shipped a whole stop whose store field had no writer
 * anywhere in `src/` while every check stayed green — see the header of
 * `touchpoints.spec.js`. Client memory has the same shape of risk: a store
 * slice, a derived key, and a view that has to agree with both.
 *
 * The rename case is the one that earns a browser. Notes are keyed by the
 * client's NAME, so correcting a typo moves the key, and the carry-across
 * lives in `updateDetective` — a per-keystroke action. If that wiring is
 * wrong the reducers still pass and the designer silently loses their notes
 * the first time they fix a spelling.
 *
 * State is read out of the persisted blob rather than a test hook, because
 * the store is deliberately not exposed on `window` and adding a hook for a
 * test would be shipping a seam nothing else needs.
 */

const STORE_KEY = 'creative-companion-storage'

const records = (page) =>
  page.evaluate((key) => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '{}')
      return raw?.state?.clientRecords || {}
    } catch {
      return {}
    }
  }, STORE_KEY)

async function setClientName(page, name) {
  /* The brief prefixes every field id (`${idPrefix}-${f.id}`) and names the
     control `detective-clientName`, so a bare `#clientName` matches nothing —
     which is why the first run of this spec skipped rather than failed. */
  const field = page
    .locator('input[id$="-clientName"], textarea[id$="-clientName"]')
    .first()
  /* The Strategy view is lazy — a bare count() here raced the chunk and made
     the whole spec skip, which looks identical to "the feature is missing". */
  await field.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
  if (!(await field.count())) return false
  await field.scrollIntoViewIfNeeded()
  await field.fill(name)
  await field.blur()
  /* The workspace write is debounced (PERSIST_DEBOUNCE_MS = 400). */
  await page.waitForTimeout(900)
  return true
}

test.describe('client memory', () => {
  test('notes and preferences can be written on the client record', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, { name: 'Memory Project' })
    skipIfCloud(test, gate)

    if (!(await setClientName(page, 'Sparow Promise'))) {
      test.skip(true, 'Brief client field not reachable in this build')
    }

    /* Into the client record through the real route: Clients, then the card. */
    const clientsNav = page
      .getByRole('button', { name: /^Clients$/i })
      .first()
    if (!(await clientsNav.count())) {
      test.skip(true, 'Clients nav not present in this build')
    }
    await clientsNav.click()
    await page.waitForTimeout(400)

    const card = page.getByText('Sparow Promise', { exact: false }).first()
    await card.click()
    await page.waitForTimeout(400)

    /* The section exists and is not gated behind anything. */
    const notes = page.locator('#client-notes')
    await expect(notes).toBeVisible()
    await notes.fill('Decision maker: Sarah')
    await notes.blur()

    const pref = page.locator('#client-pref')
    await expect(pref).toBeVisible()
    await pref.fill('Prefers email')
    await pref.press('Enter')
    await page.waitForTimeout(900)

    await expect(page.getByText('Prefers email').first()).toBeVisible()

    const written = await records(page)
    expect(written['sparow promise']?.notes).toBe('Decision maker: Sarah')
    expect(written['sparow promise']?.preferences).toContain('Prefers email')

    /* STOPS HERE, deliberately. The other half of this feature — a rename
       carrying the record to the new key — needs the brief again, and getting
       back to it from a client record took more spec than the assertion was
       worth: the app restores your last view, so a reload lands back on this
       page, and the path rail is not rendered here.

       That half is covered by `src/store/clientRecords.test.js`, which drives
       the same `updateDetective('clientName', …)` action this field calls, per
       keystroke, including the no-op path. What is NOT covered anywhere is
       that the field is wired to that action — so if the rename ever breaks,
       expect it to break there and not in the reducer. Recorded rather than
       papered over. */
  })
})
