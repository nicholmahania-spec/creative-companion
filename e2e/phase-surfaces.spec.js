import { test, expect } from '@playwright/test'
import {
  headingForStep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
  labelForStep,
} from './helpers.js'

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

/* Step buttons are matched by their CURRENT label, derived — never typed.
   This comment used to assert "the path is FIVE steps ... Strategy / Research
   / Identity / Touchpoints / Assets" and the calls below spelled those words,
   so the 2026-08-09 rename (Strategy→Brief, Assets→Delivery) broke them while
   the app was correct. A completed step's button name gains a "✓" prefix,
   hence the loose match rather than an exact one. */
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
    /* Role + a non-empty accessible name, NOT a CSS class and not a bare tag.
       This asserted `h1.page-title`, which broke when the post-unlock landing
       became HomeView — it renders `home-dash-title`, so the guard failed on
       a working app for weeks.

       The name is asserted as /\S/ rather than a literal on purpose: which
       heading the landing shows is state-dependent (measured: "Studio"), and
       pinning the text would swap a class coupling for a copy coupling. What
       this test actually guards is "the shell rendered rather than throwing",
       and a level-1 heading carrying *some* text is the honest form of that —
       it still catches the empty-shell render this exists for. */
    await expect(
      page.getByRole('heading', { level: 1, name: /\S/ }).first()
    ).toBeVisible()
  })

  /* Scope panel removed from Strategy (owner) — terms/revisions live in store
     + unit tests; no Strategy UI. */

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
    await openStep(page, new RegExp(labelForStep('deliver'), 'i'))

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

  test('Touchpoints carries the layout pattern reference, closed', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, { name: 'Touchpoints Project' })
    skipIfCloud(test, gate)

    /* Layout patterns render on Touchpoints, NOT under Tools · Ideate. This
     * test walks to where they ACTUALLY are — but read on before treating
     * that placement as settled, because it probably is not.
     *
     * bf8e35c ("layout patterns → Ideate", a UX audit) deliberately moved
     * them off Touchpoints and updated this test with it. b90e24e — titled
     * "remove focus mode from SparkView, SketchView, and ResearchView" —
     * moved them back and never mentioned doing so.
     *
     * That looks like a deliberate reversal, because b90e24e's SketchView
     * carries a rationale ("next to the drafts it informs"). It is not.
     * b90e24e overwrote SketchView with a stale ~570-line revision from
     * before ddd42eb's trim:
     *
     *   732262b  570 lines, rationale present
     *   ddd42eb  188 lines, rationale removed by the trim
     *   bf8e35c  245 lines  ← patterns moved to Ideate here
     *   324215a  238 lines  ← b90e24e's own parent
     *   b90e24e  561 lines  ← 71 lines from 732262b, 752 from its parent
     *
     * So the rationale is restored text, not newly written reasoning, and
     * bf8e35c was reverted as collateral. (Checking `bf8e35c^` alone is what
     * makes this look novel — ddd42eb had already removed the comment by
     * then. Corroborating: b90e24e also restored `from '../lib/journey'`
     * after db53b64 moved that module, shipping imports that 0a5f988 then
     * quietly repaired.)
     *
     * The test is pointed at the app rather than the app at the test because
     * a green suite must describe what ships, and moving a UI reference
     * between screens is the owner's call, not a side effect of a test
     * repair. Flagged for the owner: if bf8e35c's move was intended, the app
     * should go back to Ideate and this test with it. */
    const path = await pathNav(page)
    await stepByIdIn(path, 'sketch').click()
    await expect(headingForStep(page, 'sketch').first()).toBeVisible()

    const ref = page.locator('.layout-patterns')
    await expect(ref).toBeVisible()
    // Closed by default — a reference that prompts is a toll.
    await expect(page.locator('.layout-pattern-list')).toBeHidden()
    await ref.locator('summary').click()
    await expect(page.locator('.layout-pattern')).toHaveCount(8)
  })
})
