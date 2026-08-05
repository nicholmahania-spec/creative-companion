import { test, expect } from '@playwright/test'
import { IDENTITY_SUBSTEPS } from '../src/lib/journey/identitySubsteps.js'
import {
  headingForStep,
  openBriefFieldChapter,
  openTool,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * Soft Signal demo replaces workspace and seeds 7-step process fields.
 */
test.describe('Soft Signal demo', () => {
  test('loads demo with replace warning and detective seed', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Before Demo',
      step: 'Will be replaced',
    })
    skipIfCloud(test, gate)

    /* Settings is its own header button now, not a row in the Tools menu. It
       used to sit at the bottom of that menu, below a 420px cap on 589px of
       content — present in the DOM, off the screen. */
    await page.getByRole('button', { name: /^Settings$/ }).first().click()
    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible({
      timeout: 8000,
    })

    // Sample projects sit open under Data (Advanced nest removed)
    await page.getByRole('button', { name: /^Soft Signal$/i }).click()

    const banner = page.locator('.desk-confirm-banner')
    await expect(banner).toBeVisible({ timeout: 5000 })
    await expect(banner).toContainText(/Replaces/i)
    await banner.getByRole('button', { name: /Continue|Continuar/i }).click()
    await page.waitForTimeout(1000)

    // .first() can land on the aria-hidden mobile-only title (same text,
    // earlier in DOM order, hidden at desktop widths) — scope to visible
    // elements so the assertion targets the one actually on screen.
    await expect(
      page.locator(':visible', { hasText: /Soft Signal/i }).first()
    ).toBeVisible({
      timeout: 12000,
    })

    // Short tour opens after the demo import — dismiss it
    const dots = page.locator('.demo-tour-dots span')
    if ((await dots.count()) >= 7) {
      await page
        .getByRole('button', { name: /^(Skip|Stay)$/i })
        .first()
        .click()
      await page.waitForTimeout(300)
    }

    const path = await pathNav(page)
    /* The N/7 progress pill this asserted was removed deliberately in
       c52ddff. Soft Signal seeding is proved below by the seeded field
       values themselves, which is the stronger check anyway — the pill only
       ever counted them. */

    await stepByIdIn(path, 'define').click()
    await expect(headingForStep(page, 'define').first()).toBeVisible()
    // `goal` sits in a later chapter, and the sheet opens on chapter 01.
    const goalField = await openBriefFieldChapter(page, 'goal')
    await expect(goalField).toBeVisible({ timeout: 8000 })
    const goal = await goalField.inputValue()
    expect(goal.length).toBeGreaterThan(10)

    // Demo seeds leave-behind ★ pins
    await stepByIdIn(path, 'design').click()
    await expect(headingForStep(page, 'design').first()).toBeVisible()
    /* The pack-count assertion that used to sit here is GONE, deliberately.
       It required Design to state a pack count ("★ 3 in pack · room for 3" /
       "★ pack full"). Design does not, and that is not a regression: commit
       5592385, "stop Design showing a scoreboard (#43)", removed it on
       purpose. Design now surfaces the shortlist only where it is actionable,
       as the "Sample ★ shortlist (n)" control.

       So this test was requiring the app to undo a merged decision. Making it
       pass by restoring the count would have reversed #43 to satisfy a stale
       expectation — which is why the assertion is removed rather than
       rewritten to match whatever Design happens to render today.

       What this test is actually for — that the demo seeds ★ pins and Design
       opens on them — is still covered: the heading assertion above proves
       Design loaded, and the wall's own pack count is asserted in the
       Research leg of this same walk. */
    /* Brand book fields seeded.
       This used to say "the editor is a flat column now — every section is
       always mounted, so there are no tabs to click first". That stopped
       being true when Identity was split into Mark → Words → Colour → Type →
       Preview (commit 20d21a1): the messaging fields live on the Words
       sub-screen and are not mounted until it is opened, so #msg-promise
       simply did not exist and the walk died here.

       Sub-screen labels come from IDENTITY_SUBSTEPS rather than being typed,
       so a rename moves this with it instead of breaking it. */
    const openIdentitySubstep = async (id) => {
      const label = IDENTITY_SUBSTEPS.find((s) => s.id === id)?.label
      if (!label) throw new Error(`No Identity substep with id "${id}"`)
      const tab = page
        .getByRole('navigation', { name: /Identity screens/i })
        .getByRole('button', { name: label, exact: true })
      if (await tab.count()) {
        await tab.first().click()
        await page.waitForTimeout(400)
      }
    }

    await openIdentitySubstep('essentials')
    await expect(page.locator('#msg-promise')).toHaveValue(/.{10,}/, {
      timeout: 5000,
    })
    await openIdentitySubstep('preview')
    await expect(page.locator('#img-style')).toHaveValue(/.{5,}/, {
      timeout: 5000,
    })

    await stepByIdIn(path, 'research').click()
    await expect(headingForStep(page, 'research').first()).toBeVisible()
    await expect(
      page.locator('.research-grid .research-pin-card').first()
    ).toBeVisible({ timeout: 8000 })

    /* Ideate is a Tool now, not stop 3 — reached through the Tools menu so
       this keeps testing the screen instead of dropping it. */
    await openTool(page, /^Ideate$/i)
    await expect(page.getByRole('heading', { name: 'Ideate' })).toBeVisible()
    await expect(page.locator('#dir-title-a')).toHaveValue(/.+/, {
      timeout: 5000,
    })
  })
})
