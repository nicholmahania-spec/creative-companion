import { test, expect } from '@playwright/test'
import { unlockAndOnboard, skipIfCloud } from './helpers.js'

/**
 * Account menu keyboard behaviour — WAI-ARIA APG menu button pattern.
 *
 * The menu previously announced itself as role="dialog" aria-modal="true" and
 * shipped no keyboard handling at all: no Escape, no arrows. These lock in the
 * behaviour the pattern promises, since none of it is visible to the build,
 * the unit suite (which runs in `node`, with no DOM), or a mouse user.
 */
test.describe('Account menu keyboard', () => {
  test.beforeEach(async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Account Menu Project',
      testerName: 'Menu Tester',
      expectOnboardDialog: true,
    })
    skipIfCloud(test, gate)
  })

  const openMenu = async (page) => {
    await page.locator('#account-menu-button').click()
    await expect(page.locator('#account-menu')).toBeVisible()
  }

  test('is exposed as a menu, not a modal dialog', async ({ page }) => {
    await openMenu(page)
    const menu = page.locator('#account-menu')
    await expect(menu).toHaveAttribute('role', 'menu')
    /* The old markup wrapped this menu in role="dialog" aria-modal="true".
       Nothing inside the account overlay should claim either now. */
    await expect(
      page.locator('.account-overlay [role="dialog"]')
    ).toHaveCount(0)
    await expect(page.locator('.account-overlay [aria-modal]')).toHaveCount(0)
    /* role="menu" may only own menuitem / group / separator. */
    await expect(menu.locator('> :not([role])')).toHaveCount(0)
  })

  test('opening focuses the first item', async ({ page }) => {
    await openMenu(page)
    const first = page.locator('#account-menu [role="menuitem"]').first()
    await expect(first).toBeFocused()
  })

  test('arrows move between items and wrap', async ({ page }) => {
    await openMenu(page)
    const items = page.locator('#account-menu [role="menuitem"]')
    const count = await items.count()
    expect(count).toBeGreaterThan(1)

    await expect(items.nth(0)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(items.nth(1)).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(items.nth(0)).toBeFocused()
    /* Wrap backwards off the first item lands on the last. */
    await page.keyboard.press('ArrowUp')
    await expect(items.nth(count - 1)).toBeFocused()
    await page.keyboard.press('Home')
    await expect(items.nth(0)).toBeFocused()
    await page.keyboard.press('End')
    await expect(items.nth(count - 1)).toBeFocused()
  })

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    await openMenu(page)
    /* Move focus deeper in first. Without this the assertion below passes
       vacuously against the old markup, which never moved focus off the
       trigger at all — so "focus returned" and "focus never left" are
       indistinguishable. */
    await page.keyboard.press('ArrowDown')
    await expect(
      page.locator('#account-menu [role="menuitem"]').nth(1)
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('#account-menu')).toHaveCount(0)
    await expect(page.locator('#account-menu-button')).toBeFocused()
    await expect(page.locator('#account-menu-button')).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  test('Tab leaves the menu and closes it', async ({ page }) => {
    await openMenu(page)
    await page.keyboard.press('Tab')
    await expect(page.locator('#account-menu')).toHaveCount(0)
  })
})
