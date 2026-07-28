import { test, expect } from '@playwright/test'
import { unlockAndOnboard, skipIfCloud } from './helpers.js'

/**
 * The surfaces the research phases added, driven in a real browser.
 *
 * These exist because of a specific failure: `takeInvoiceNumber` was passed
 * to a panel and never bound, which is a render-time ReferenceError that
 * blanked the entire app — and 352 unit tests plus a green build never saw
 * it. Nothing in vitest renders `App`, and an undefined identifier in JSX is
 * valid syntax. Only loading the page catches that class of bug, so every
 * panel these phases added gets loaded here.
 *
 * Deliberately shallow per surface. The logic is already unit-tested; what
 * is untested without a browser is whether the thing renders at all and
 * whether its controls are wired to something real.
 */

/* The path is FIVE steps, not seven, and they are not called what the older
   specs assume: Strategy / Research / Identity / Touchpoints / Assets. A
   completed step's button name gains a "✓" prefix, hence the loose regex.
   `path-smoke.spec.js` still looks for "Step 1: Define" and a 7-step nav,
   which is why it fails on main as well as here. */
async function openStep(page, pattern) {
  await page.getByRole('button', { name: pattern }).first().click()
  await page.waitForTimeout(700)
}

/* Review is deliberately OFF the five-step path — it is reached through
   Tools, not the rail. Worth encoding: a test that silently skipped when it
   could not find a "Step 6" button would have hidden the fact that this
   surface was never checked at all. */
async function openReview(page) {
  await page.getByRole('button', { name: /^Tools$/i }).first().click()
  await page.waitForTimeout(300)
  await page.getByRole('menuitem', { name: /Review/i }).first().click()
  await page.waitForTimeout(700)
}

test.describe('phase surfaces render and respond', () => {
  test('the app shell renders at all after unlock', async ({ page }) => {
    /* The regression guard proper. A blank body here means a throw during
       render, which is what shipped: every screen was empty, not just the
       one with the bug. */
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e.message || e)))

    const gate = await unlockAndOnboard(page, { name: 'Surfaces Project' })
    skipIfCloud(test, gate)

    const body = (await page.locator('body').innerText()).trim()
    expect(body.length, 'app rendered an empty body').toBeGreaterThan(0)
    expect(errors, errors.join('\n')).toEqual([])
    await expect(page.locator('h1.page-title').first()).toBeVisible()
  })

  test('Scope panel opens and copies real project terms', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const gate = await unlockAndOnboard(page, { name: 'Scope Project' })
    skipIfCloud(test, gate)
    /* Strategy IS the landing view, so there is nothing to click. Its rail
       control is the current step and not an ordinary button. */

    const toggle = page.locator('.scope-panel-toggle')
    await expect(toggle).toBeVisible()
    // Closed, it is a state line and nothing else.
    await expect(page.locator('.scope-panel-body')).toHaveCount(0)

    await toggle.click()
    await expect(page.locator('.scope-panel-body')).toBeVisible()

    // The revision count is the one field the research insists is a NUMBER.
    const rounds = page.locator('#scope-revisions')
    await expect(rounds).toBeVisible()
    await rounds.fill('3')
    await page.locator('#scope-approver').fill('Sarah Whitton')
    await page.locator('#scope-outof').fill('No website build.')

    // Display must equal emission — the deadline row exists precisely so
    // nothing lands on the clipboard that is not on screen.
    await expect(page.getByText('Delivery by')).toBeVisible()

    const copy = page.locator('.scope-terms-copy')
    await expect(copy).toBeVisible()
    await copy.click()

    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toContain('Revisions')
    expect(clip).toContain('3 rounds included')
    expect(clip).toContain('Sarah Whitton approves the work')
    expect(clip).toContain('No website build.')
    /* The fee must never reach the clipboard: budgetRange is the client's
       opening guess and hourlyRate is a private rate. */
    expect(clip).not.toMatch(/budget/i)
    expect(clip).not.toMatch(/per hour/i)
  })

  test('Review shows revision rounds and logs feedback', async ({ page }) => {
    const gate = await unlockAndOnboard(page, { name: 'Review Project' })
    skipIfCloud(test, gate)
    await openReview(page)

    // Plain-language state, and never a date.
    const line = page.locator('.revision-line')
    await expect(line).toBeVisible()
    await expect(line).toHaveText(/No rounds yet|Round \d|of \d/)
    await expect(line).not.toHaveText(/day|week|ago/i)

    // Opening a round changes the line — proves the control is wired.
    const start = page.getByRole('button', { name: /Start a round|Start an extra round/i })
    await expect(start).toBeVisible()
    await start.click()
    await expect(line).toHaveText(/Round 1/)
    await expect(
      page.getByRole('button', { name: /Finish round 1/i })
    ).toBeVisible()

    // Feedback log — the issue is the field that carries meaning.
    const issue = page.getByLabel('Issue')
    await issue.fill('Logo too small on the card')
    await page.getByLabel('Reviewer').fill('Printer')
    await page.getByRole('button', { name: /^Log it$/i }).click()
    await expect(page.locator('.feedback-row')).toHaveCount(1)
    await expect(page.locator('.feedback-issue')).toHaveText(
      'Logo too small on the card'
    )
  })

  test('Deliver shows the case study with its five answers', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, { name: 'Deliver Project' })
    skipIfCloud(test, gate)
    await openStep(page, /Assets/i)

    const details = page.locator('.deliver-case-study')
    await expect(details).toBeVisible()
    await details.locator('summary').click()

    for (const q of [
      'Why it existed',
      'What you made',
      'How you got there',
      'How long',
      'How it turned out',
    ]) {
      await expect(page.getByText(q, { exact: true })).toBeVisible()
    }

    // A fresh project can answer none of it, and says so rather than
    // exporting a document with blank headings.
    await expect(page.locator('.case-study-gaps')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Download case study/i })
    ).toBeVisible()
  })

  test('Sketch carries the layout pattern reference, closed', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, { name: 'Sketch Project' })
    skipIfCloud(test, gate)
    await openStep(page, /Touchpoints/i)

    const ref = page.locator('.layout-patterns')
    await expect(ref).toBeVisible()
    // Closed by default — a reference that prompts is a toll.
    await expect(page.locator('.layout-pattern-list')).toBeHidden()
    await ref.locator('summary').click()
    await expect(page.locator('.layout-pattern')).toHaveCount(8)
  })
})
