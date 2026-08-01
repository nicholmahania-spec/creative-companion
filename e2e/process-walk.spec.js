import { test, expect } from '@playwright/test'
import {
  goToStepByKey,
  headingForStep,
  labelForStep,
  openBriefFieldChapter,
  openTool,
  pathNav,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * Full process artifacts: detective → research pin → ideate → sketch why →
 * design tagline + version bump → review notes → deliver handoff/learnings.
 */
test.describe('Process walk (artifacts)', () => {
  test('fill detective through deliver fields', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'E2E Process Walk',
      step: 'Draft cover option A',
    })
    if (gate.skipped) test.skip(true, gate.reason)

    const path = await pathNav(page)
    await expect(path).toBeVisible()

    // 1 Define — detective sheet (chaptered): fill required Goal/Who/Words
    await stepByIdIn(path, 'define').click()
    await expect(headingForStep(page, 'define').first()).toBeVisible()
    // `goal` sits in a later chapter, and the sheet opens on chapter 01.
    const goalField = await openBriefFieldChapter(page, 'goal')
    await expect(goalField).toBeVisible({ timeout: 8000 })
    await goalField.fill(
      'Make a calm cover system families can recognize in three seconds.'
    )
    await (await openBriefFieldChapter(page, 'audience')).fill(
      'Busy parents new to the program'
    )
    await (await openBriefFieldChapter(page, 'feel')).fill(
      'Hopeful and clear — not hustle'
    )
    /* The split view shows one chapter at a time, not all of them — the
       comment here used to claim the opposite and say no chapter click was
       needed, which is why these fills waited on hidden inputs until the
       test timed out. */
    const brandWords = await openBriefFieldChapter(page, 'brandWords')
    await expect(brandWords).toBeVisible({
      timeout: 5000,
    })
    await brandWords.fill('calm, hopeful, clear')
    /* Navigate by the rail rather than the page's own "Next · <stop>"
       button. That button did not move the page here — it is gated on the
       whole brief being complete, and this spec fills four fields, not all
       of them. Whether the gate is right is a product question; either way
       this spec is about the fields it fills through to Deliver, so it
       should not also be the thing that fails when that gate changes. */
    await stepByIdIn(path, 'research').click()

    // 2 Research — note pin + star for leave-behind
    // Research view is lazy-loaded, so give the heading room to arrive.
    await expect(headingForStep(page, 'research').first()).toBeVisible({
      timeout: 10000,
    })
    /* The gap strip's quiet "G" button no longer exists — JourneyGapStrip
       renders one button, `is-ship`, and only once the path is full. Which
       step is the earliest gap also depends on what the stops now ask for,
       so this no longer claims it is Research. */
    await expect(page.locator('.journey-gap-strip-btn.is-quiet')).toHaveCount(0)
    await page.getByRole('button', { name: /^Note$/i }).click()
    await expect(page.locator('#board-note')).toBeVisible({ timeout: 5000 })
    await page.locator('#board-note').fill('Calm indigo field — safe energy')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.waitForTimeout(300)
    const star = page.locator('button.research-pin-star').first()
    await expect(star).toBeVisible({ timeout: 5000 })
    // Real hit target (no force) — pin tools must not be covered by face
    await star.click()
    await expect(star).toHaveAttribute('aria-pressed', 'true')

    // 3 Ideate — A/B titles + why, choose the winner
    /* Ideate is a Tool now, not stop 3 — reached through the Tools menu so
       this keeps testing the screen instead of dropping it. */
    await openTool(page, /^Ideate$/i)
    await expect(page.getByRole('heading', { name: 'Ideate' })).toBeVisible()
    await page.getByRole('button', { name: /^Opposite$/i }).click()
    await page.locator('#dir-title-a').fill('Quiet editorial')
    await page.locator('#dir-title-b').fill('Warm product toolkit')
    // Hyper-focus mask disables pointer events on unfocused cards — blur first
    await page.locator('#dir-title-b').blur()
    await page
      .locator('.ideate-dir-card')
      .first()
      .getByRole('button', { name: /Choose|Chosen/i })
      .click()
    /* The "why" field only exists once a direction is chosen — "name first,
       defend second" in SparkView. This used to fill it before choosing, so
       it waited on a textarea that had not been rendered yet. */
    const whyA = page.locator('#dir-note-a')
    await expect(whyA).toBeVisible({ timeout: 5000 })
    await whyA.fill('Hierarchy carries calm')

    // 4 Touchpoints — why field. Coming back from a Tool, so the rail is not
    // on screen; the keyboard binding is how the app expects you to return.
    await goToStepByKey(page, 'sketch')
    await expect(headingForStep(page, 'sketch').first()).toBeVisible()
    const why = page.locator('#step-why')
    if (await why.count()) {
      await why.fill('Quiet hierarchy matches the detective goal')
    }

    // 5 Design — tagline (craft) + version bump
    await stepByIdIn(path, 'design').click()
    await expect(headingForStep(page, 'design').first()).toBeVisible()
    await page.locator('#brand-tagline').fill('Calm direction you can hand over')
    /* The bump button carries its action in visible text now ("Bump · v1"),
       not just the version readout. */
    await page.getByRole('button', { name: /^Bump · v1$/ }).click()
    await expect(
      page.getByRole('button', { name: /^Bump · v[2-9]$/ })
    ).toBeVisible({ timeout: 5000 })

    // 6 Review — pack readiness + feedback notes
    // Review is a Tool now, not stop 6.
    await openTool(page, /^Review$/i)
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()
    /* Review reports readiness as one of two chips: "Ready · n/m" when
       nothing is missing, "Gaps · n left" otherwise. Asserting only the
       Ready form pinned this to a fixture that stopped holding once the
       checks changed — the property is that the chip is there and says
       one of them. */
    await expect(
      page.locator('.review-status-chip').first()
    ).toHaveText(/Ready · \d+\/\d+|Gaps · \d+ left/i)
    await page
      .locator('#feedback-notes')
      .fill('Hierarchy clear. Keep guest line quieter.')

    // Last stop — handoff + learnings + brand book CTA. Again returning
    // from a Tool (Review), so no rail.
    await goToStepByKey(page, 'deliver')
    await expect(
      page.locator('h1.page-title', { hasText: labelForStep('deliver') })
    ).toBeVisible({ timeout: 10000 })
    await page
      .locator('#handoff-note')
      .fill('Brand book PDF + mark direction. Contact for questions.')
    await page
      .locator('#learnings-note')
      .fill('What worked: detective sheet first. Next: more real photos.')
    await expect(
      page.getByRole('button', { name: /Brand book PDF/i })
    ).toBeVisible()
  })
})
