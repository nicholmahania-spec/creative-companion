import { test, expect } from '@playwright/test'
import {
  headingForStep,
  openIdentitySubstep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * The health meter says which jobs it reads.
 *
 * The palette offers NINE jobs — Primary, Secondary, three accents, two
 * neutrals, Text, Background — and the score reads four of them. That
 * narrow denominator is deliberate and pinned by a test: widening it is how
 * "measurement that punished use" got in before, where every colour added
 * dragged the number down.
 *
 * The defect was that nothing said so. Assign Secondary, both extra accents
 * and both neutrals, write a reason for every one, and the meter does not
 * move — which reads as broken rather than as out of scope. Worse for
 * exactly the designer this app is for: an unexplained flat number is an
 * invitation to keep grinding at something that was never being measured.
 *
 * Checked in a browser rather than by grep because the note is UI: a
 * constant can exist in the module and still never reach the screen, which
 * is precisely what happened to five of the nine role labels last week.
 */
test('the palette meter names the jobs it scores', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Health Scope' })
  skipIfCloud(test, gate)

  const path = await pathNav(page)
  await stepByIdIn(path, 'design').click()
  await expect(headingForStep(page, 'design').first()).toBeVisible({
    timeout: 10000,
  })

  await openIdentitySubstep(page, 'colors')

  const panel = page.locator('.palette-health')
  await expect(panel).toBeVisible({ timeout: 8000 })

  /* A FRESH PROJECT MUST NOT OPEN ON A FAILING GRADE.
     The unit-level fix for this ("score is null until there is something to
     measure") was written, commented as done, and never reachable: `started`
     also accepted a palette on its own, and App.jsx substitutes
     DEFAULT_PALETTE whenever a project has none, so `palette.length` was
     never 0. Measured in this exact state before the fix: 33%, red,
     "Tighten roles" — a failing grade for work not yet begun, at the moment
     of task initiation. Only a browser can catch that, because the wiring
     that broke it lives two components above the scorer. */
  const chip = panel.locator('.palette-health-score')
  await expect(chip).toHaveText('—')
  await expect(chip).not.toHaveClass(/is-low/)
  await expect(
    panel.locator('.palette-health-bar'),
    'no bar to fill when nothing is measured'
  ).toHaveCount(0)

  /* One note, not one per state. The earlier version of this panel returned
     early for the unscored case and duplicated the head markup, which is the
     shape that leaves a line on one branch only. */
  const scope = panel.locator('.palette-health-scope')
  await expect(scope).toHaveCount(1)
  await expect(scope).toBeVisible()

  /* The designer's words. `cover` and `quiet` are storage keys — the panel
     must not be where someone first reads their background called "quiet". */
  const text = (await scope.innerText()).trim()
  for (const job of ['Primary', 'Text', 'Accent', 'Background']) {
    expect(text, `the note must name ${job}`).toContain(job)
  }
  for (const stored of ['cover', 'quiet']) {
    expect(text.toLowerCase(), `the note leaked the stored key ${stored}`).not.toContain(
      stored
    )
  }

  /* And it must not overclaim. Naming Secondary or the neutrals would be the
     same defect pointed the other way: telling a designer their work counts
     when the maths ignores it. */
  for (const unscored of ['Secondary', 'Neutral', 'Accent 2', 'Accent 3']) {
    expect(text, `the note must not claim to read ${unscored}`).not.toContain(
      unscored
    )
  }
})
