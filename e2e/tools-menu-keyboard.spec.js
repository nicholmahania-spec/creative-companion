import { test, expect } from '@playwright/test'
import { skipIfCloud, toShell, unlockAndOnboard } from './helpers.js'

/**
 * Tools menu keyboard behaviour — WAI-ARIA APG menu button pattern.
 *
 * Same defect the Account menu carried: role="dialog" + aria-modal="true"
 * wrapped around a role="menu", with no arrow keys. It also owned two loose
 * <p> headings, which role="menu" may not have — its only valid children are
 * menuitem, group and separator — so those now name a role="group" each.
 */
test.describe('Tools menu keyboard', () => {
  test.beforeEach(async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Tools Menu Project',
      testerName: 'Tools Tester',
      expectOnboardDialog: true,
    })
    skipIfCloud(test, gate)
  })

  const openMenu = async (page) => {
    await toShell(page)
    await page.locator('#tools-menu-button').click()
    await expect(page.locator('#tools-menu')).toBeVisible()
  }

  test('is exposed as a menu with grouped items, not a modal dialog', async ({
    page,
  }) => {
    await openMenu(page)
    const menu = page.locator('#tools-menu')
    await expect(menu).toHaveAttribute('role', 'menu')
    await expect(page.locator('.tools-overlay [role="dialog"]')).toHaveCount(0)
    await expect(page.locator('.tools-overlay [aria-modal]')).toHaveCount(0)

    /* Only menuitem / group / separator may be owned by role="menu". The two
       headings previously sat here as bare <p>. */
    await expect(menu.locator('> :not([role])')).toHaveCount(0)

    const groups = menu.locator('[role="group"]')
    await expect(groups).toHaveCount(2)
    await expect(groups.nth(0)).toHaveAccessibleName(/Go to/i)
    await expect(groups.nth(1)).toHaveAccessibleName(/This project/i)
  })

  test('arrows cross group boundaries and wrap', async ({ page }) => {
    await openMenu(page)
    const items = page.locator('#tools-menu [role="menuitem"]')
    const count = await items.count()
    expect(count).toBeGreaterThan(2)

    await expect(items.nth(0)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(items.nth(1)).toBeFocused()

    /* End lands on the last item, which is in the SECOND group — arrow
       navigation must not stop at a group edge. */
    await page.keyboard.press('End')
    await expect(items.nth(count - 1)).toBeFocused()
    const lastGroup = await items
      .nth(count - 1)
      .evaluate((el) => el.closest('[role="group"]')?.getAttribute('aria-labelledby'))
    expect(lastGroup).toBe('tools-group-project')

    /* Wrapping forward off the last item returns to the first group. */
    await page.keyboard.press('ArrowDown')
    await expect(items.nth(0)).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(items.nth(count - 1)).toBeFocused()
    await page.keyboard.press('Home')
    await expect(items.nth(0)).toBeFocused()
  })

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    await openMenu(page)
    /* Move focus deeper first, or the assertion passes vacuously against the
       old markup, which never moved focus off the trigger at all. Wait for the
       opening focus to land before pressing: an arrow that arrives while
       activeElement is still outside the list resolves to the FIRST item, not
       the second. */
    await expect(page.locator('#tools-menu [role="menuitem"]').first()).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('#tools-menu [role="menuitem"]').nth(1)).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('#tools-menu')).toHaveCount(0)
    await expect(page.locator('#tools-menu-button')).toBeFocused()
  })

  test('items still navigate', async ({ page }) => {
    await openMenu(page)
    /* The point of the menu is that it goes somewhere — the roles and key
       handling must not have broken activation. */
    await page.getByRole('menuitem', { name: /Timer/i }).click()
    await expect(page.locator('#tools-menu')).toHaveCount(0)
    await expect(
      page.getByRole('heading', { level: 1 })
    ).toBeVisible({ timeout: 10000 })
  })
})
