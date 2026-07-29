import { test, expect } from '@playwright/test'
import {
  headingForStep,
  labelForStep,
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
    await expect(page.locator('#detective-goal')).toBeVisible({ timeout: 8000 })
    await page.locator('#detective-goal').fill(
      'Make a calm cover system families can recognize in three seconds.'
    )
    await page.locator('#detective-audience').fill('Busy parents new to the program')
    await page.locator('#detective-feel').fill('Hopeful and clear — not hustle')
    // Define now renders as a split view (form + mood board) with every
    // chapter's fields shown at once — no chapter-tab click needed to
    // reveal the Identity chapter's fields.
    await expect(page.locator('#detective-brandWords')).toBeVisible({
      timeout: 5000,
    })
    await page.locator('#detective-brandWords').fill('calm, hopeful, clear')
    // Required filled → continue applies sheet to brief and opens Research
    await page.getByRole('button', { name: /Next · Research/i }).click()

    // 2 Research — note pin + star for leave-behind
    await expect(headingForStep(page, 'research').first()).toBeVisible()
    // Research is now the earliest gap → quiet G strip
    await expect(page.locator('.journey-gap-strip.is-on-gap')).toBeVisible()
    await expect(page.locator('.journey-gap-strip-btn.is-quiet')).toHaveText('G')
    await page.getByRole('button', { name: /^Note$/i }).click()
    await expect(page.locator('#board-note')).toBeVisible({ timeout: 5000 })
    await page.locator('#board-note').fill('Calm indigo field — safe energy')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.waitForTimeout(300)
    const star = page.locator('button.mood-pin-star').first()
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
    await page.locator('#dir-note-a').fill('Hierarchy carries calm')
    await page.locator('#dir-title-b').fill('Warm product toolkit')
    // Hyper-focus mask disables pointer events on unfocused cards — blur first
    await page.locator('#dir-title-b').blur()
    await page
      .locator('.ideate-dir-card')
      .first()
      .getByRole('button', { name: /Choose|Chosen/i })
      .click()

    // 4 Sketch — why field
    await stepByIdIn(path, 'sketch').click()
    await expect(headingForStep(page, 'sketch').first()).toBeVisible()
    const why = page.locator('#step-why')
    if (await why.count()) {
      await why.fill('Quiet hierarchy matches the detective goal')
    }

    // 5 Design — tagline (craft) + version bump
    await stepByIdIn(path, 'design').click()
    await expect(headingForStep(page, 'design').first()).toBeVisible()
    await page.locator('#brand-tagline').fill('Calm direction you can hand over')
    await page.getByRole('button', { name: 'v1', exact: true }).click()
    await expect(
      page.getByRole('button', { name: /^v[2-9]$/ })
    ).toBeVisible({ timeout: 5000 })

    // 6 Review — pack readiness + feedback notes
    // Review is a Tool now, not stop 6.
    await openTool(page, /^Review$/i)
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()
    await expect(page.getByText(/Ready · \d+\/\d+/i).first()).toBeVisible()
    await page
      .locator('#feedback-notes')
      .fill('Hierarchy clear. Keep guest line quieter.')

    // 7 Deliver — handoff + learnings + brand book CTA
    await stepByIdIn(path, 'deliver').click()
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
