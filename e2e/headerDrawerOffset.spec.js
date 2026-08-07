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
          headerHeight: header
            ? header.getBoundingClientRect().height
            : null,
          token: parseFloat(raw),
        }
      })

      expect(m.headerHeight).not.toBeNull()
      /* Height, not viewport `bottom`.
       *
       * `bottom` is height PLUS current scroll offset, and this measured it
       * at whatever offset the page happened to hold — so the assertion moved
       * with scroll state that has nothing to do with the coupling it names.
       * Height is the quantity `--header-h` is supposed to track, and it is
       * the same number at any scroll position.
       *
       * The drawer/header coupling is still genuinely asserted: if
       * `--header-h` drifts from the header's real height, this fails. The
       * separate `test.fail` case below covers the defect found while fixing
       * this, so that it is executable rather than only described. */
      expect(m.token).toBeGreaterThanOrEqual(m.headerHeight - 1)
      expect(m.token).toBeLessThanOrEqual(m.headerHeight + 8)
    })

    /**
     * FIXED 2026-08-07 — this was a `test.fail()` marker and it paid out.
     *
     * The diagnosis it carried was exactly right: a sticky element sticks to
     * its nearest ancestor that is a scroll container, four ancestors
     * qualified (`html`, `body`, `#root`, `.app`), each declaring
     * `overflow-x: hidden` which COMPUTES to `hidden auto`, none of them ever
     * scrolled, so the document scrolled instead and the header rode off the
     * top with it. All four did need changing, as the note said.
     *
     * It also predicted its own outcome — "the moment someone fixes the
     * header it flips to failing and says so" — and that is precisely how
     * this surfaced: the fix landed, CI went red here, and the failure read
     * `Expected to fail, but passed.` A prose note could not have done that.
     *
     * The repair avoided the trap the note flagged. `hidden` → `clip` would
     * have forbidden programmatic scrolling on those boxes, which
     * `sessionResume.js` and `journeyProgress.js` both depend on; removing
     * the property outright leaves programmatic scrolling intact.
     *
     * `test.fail()` is gone and the assertion stays. It is a live regression
     * guard now rather than a marker — if anything reintroduces a scroll
     * container above the header, this fails again, in the right direction.
     * Wider coverage of the same class of defect lives in
     * no-horizontal-overflow.spec.js.
     */
    test(`the header stays on screen while scrolling at ${width}px`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      const gate = await unlockAndOnboard(page, { name: 'Drawer Offset' })
      skipIfCloud(test, gate)

      await page.setViewportSize({ width, height: 844 })
      await page.waitForTimeout(400)
      await page.evaluate(() => window.scrollBy(0, 600))
      await page.waitForTimeout(300)

      const top = await page.evaluate(
        () => document.querySelector('.header')?.getBoundingClientRect().top
      )
      // Sticky means "still at the top after scrolling", not "was there once".
      expect(top).toBeGreaterThanOrEqual(-1)
    })
  }
})
