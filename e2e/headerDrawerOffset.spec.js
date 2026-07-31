import { test, expect } from '@playwright/test'
import { skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * The mobile drawer is positioned with `top: var(--header-h)`, a measured
 * constant rather than a derived one — the header's padding differs per
 * breakpoint, so a calc() would be correct at one width and wrong at
 * another. That makes the token capable of drifting away from the real
 * header height without anything failing.
 *
 * When it drifts the wrong way the drawer covers the hamburger that opens
 * it: the control is on screen, looks live, and does nothing, which is the
 * worst kind of broken for someone who will not think to scroll or guess.
 * That is what nearly shipped when the header chips were raised to the 44px
 * hit-target floor and the three hard-coded `52px` literals stayed put.
 *
 * So: assert the coupling, at the widths where the drawer actually exists.
 */
test.describe('mobile drawer clears the header', () => {
  for (const width of [390, 700]) {
    test(`--header-h matches the real header at ${width}px`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      const gate = await unlockAndOnboard(page, { name: 'Drawer Offset' })
      skipIfCloud(test, gate)

      await page.setViewportSize({ width, height: 844 })
      await page.waitForTimeout(400)

      const m = await page.evaluate(() => {
        const header = document.querySelector('.header')
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue('--header-h')
          .trim()
        return {
          headerBottom: header
            ? header.getBoundingClientRect().bottom
            : null,
          token: parseFloat(raw),
        }
      })

      expect(m.headerBottom).not.toBeNull()
      // The drawer must start at or below the header's bottom edge. A small
      // gap is harmless (shows the scrim); an overlap hides the hamburger.
      expect(m.token).toBeGreaterThanOrEqual(m.headerBottom - 1)
      // ...but not so far below that a strip of dead space appears.
      expect(m.token).toBeLessThanOrEqual(m.headerBottom + 8)
    })
  }
})
