import { test, expect } from '@playwright/test'
import { unlockAndOnboard, skipIfCloud } from './helpers.js'

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

  const openTools = async (page) => {
    await page.locator('#tools-menu-button').click()
    await expect(page.locator('#tools-menu')).toBeVisible()
  }

  test('the sidebar row menu really is unreachable, and Tools carries it', async ({
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

    await openTools(page)
    await expect(
      page.getByRole('menuitem', { name: /Delete project/ })
    ).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: /Archive project/ })
    ).toBeVisible()
  })

  test('deletes with the mouse, and the undo puts it back', async ({ page }) => {
    await openTools(page)
    await page.getByRole('menuitem', { name: /Delete project/ }).click()

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
    await openTools(page)
    await expect(
      page.getByRole('menuitem', { name: /Delete project/ })
    ).toBeVisible()
  })

  test('is reachable by keyboard alone', async ({ page }) => {
    await page.locator('#tools-menu-button').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#tools-menu')).toBeVisible()

    const del = page.getByRole('menuitem', { name: /Delete project/ })
    for (let i = 0; i < 12; i += 1) {
      if (await del.evaluate((el) => el === document.activeElement)) break
      await page.keyboard.press('ArrowDown')
    }
    await expect(del).toBeFocused()
    /* Focus must be visible, not just present — a keyboard user cannot act on
       a control they cannot see. */
    const outline = await del.evaluate((el) => {
      const st = getComputedStyle(el)
      return `${st.outlineStyle}|${st.outlineWidth}|${st.boxShadow}`
    })
    expect(outline).not.toBe('none|0px|none')
  })
})
