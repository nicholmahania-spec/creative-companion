import { test, expect } from '@playwright/test'
import { skipIfCloud, toShell, unlockAndOnboard } from './helpers.js'

/**
 * DELETE HAS TO BE REACHABLE ON A DESKTOP.
 *
 * The sidebar's per-project `⋯` is hidden in the app shell, with the note
 * "Archive and Delete now live in Tools → This project". The reasoning was
 * right — a hover-only affordance is invisible at a glance and absent on
 * touch — but the destination was never built, so the two actions were
 * reachable from nowhere at all on desktop. A unit test pins the markup;
 * this drives the actual browser, because "the button exists in the DOM" was
 * exactly what was true before and it was not enough.
 *
 * THE DESTINATION MOVED, and the reachability question did not. Tools was a
 * drawer of cross-project tools holding three actions that only ever act on
 * the project you are looking at, so Hours, Archive and Delete were moved to
 * the Desk's own "Project" panel (`src/views/DeskView.jsx`: "PROJECT
 * ADMINISTRATION HAS ONE HOME, AND IT IS THE PROJECT" — same handlers, same
 * undo). This spec follows them: what it protects is that exactly one home
 * exists and a desktop user can reach it, not which drawer it is in.
 */
test.describe('deleting a project from a desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const gate = await unlockAndOnboard(page, {
      name: 'Desktop Delete',
      testerName: 'Desk Tester',
      expectOnboardDialog: true,
    })
    skipIfCloud(test, gate)
  })

  /* The actions live on the Desk, and a stage makes the shell inert — so
     standing in the shell is part of reaching them, not setup noise. */
  const projectPanel = async (page) => {
    await toShell(page)
    const panel = page.locator('.desk-project-actions')
    await expect(panel).toBeVisible({ timeout: 10000 })
    return panel
  }

  test('the sidebar row menu really is unreachable, and the desk carries it', async ({
    page,
  }) => {
    /* The premise. If this ever stops being true the actions have two homes
       and that is a deliberate decision, not an accident. */
    const rowMenus = page.locator(
      '.app-shell > .journey-sidebar .journey-project-row-menu-btn'
    )
    for (let i = 0; i < (await rowMenus.count()); i += 1) {
      await expect(rowMenus.nth(i)).not.toBeVisible()
    }

    const panel = await projectPanel(page)
    await expect(
      panel.getByRole('button', { name: /Delete project/ })
    ).toBeVisible()
    await expect(
      panel.getByRole('button', { name: /Archive project/ })
    ).toBeVisible()

    /* And Tools no longer carries a second copy — one home, not two. */
    await page.locator('#tools-menu-button').click()
    await expect(page.locator('#tools-menu')).toBeVisible()
    await expect(
      page.locator('#tools-menu').getByRole('menuitem', { name: /Delete project/ })
    ).toHaveCount(0)
  })

  test('deletes with the mouse, and the undo puts it back', async ({ page }) => {
    const panel = await projectPanel(page)
    await panel.getByRole('button', { name: /Delete project/ }).click()

    /* No confirm dialog by design — the app offers an undo instead, because a
       confirmation is a decision and an undo is not. */
    await expect(page.getByText(/Project deleted/i).first()).toBeVisible({
      timeout: 5000,
    })

    const undo = page.getByRole('button', { name: /undo/i }).first()
    await expect(undo).toBeVisible({ timeout: 5000 })
    await undo.click()

    /* Back on the desk. The undo also lifts the tombstone — asserted in the
       unit suite; here we only need the project to return. */
    const back = await projectPanel(page)
    await expect(
      back.getByRole('button', { name: /Delete project/ })
    ).toBeVisible({ timeout: 10000 })
  })

  test('is reachable by keyboard alone', async ({ page }) => {
    const panel = await projectPanel(page)
    const del = panel.getByRole('button', { name: /Delete project/ })
    /* Tabbed to, not `.focus()`ed. `:focus-visible` is a keyboard heuristic:
       programmatic focus does not arm it in Chromium, so a ring that only
       exists for keyboard users would read as missing — and a ring that only
       exists for mouse users would read as present. The walk IS the claim in
       the title. */
    await page.locator('body').click({ position: { x: 2, y: 2 } })
    let reached = false
    for (let i = 0; i < 120 && !reached; i += 1) {
      await page.keyboard.press('Tab')
      reached = await del.evaluate((el) => el === document.activeElement)
    }
    expect(reached, 'Delete project must be reachable by Tab alone').toBe(true)
    /* Focus must be visible, not just present — a keyboard user cannot act on
       a control they cannot see. */
    const outline = await del.evaluate((el) => {
      const st = getComputedStyle(el)
      return `${st.outlineStyle}|${st.outlineWidth}|${st.boxShadow}`
    })
    expect(outline).not.toBe('none|0px|none')
  })
})
