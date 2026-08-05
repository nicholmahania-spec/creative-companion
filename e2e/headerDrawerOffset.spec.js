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
     * KNOWN FAILURE — the header does not stay on screen at these widths.
     *
     * This is `test.fail()`, not a comment and not a deletion. It RUNS on
     * every CI pass and is green while the bug exists; the moment someone
     * fixes the header it flips to failing and says so. A prose note cannot
     * do that — it just quietly becomes untrue. The suite stays green either
     * way, so this costs nothing today and pays out on the day it matters.
     *
     * The bug: a sticky element sticks to its nearest ancestor that is a
     * scroll container. Four ancestors qualify here — `html` (shell.css:213),
     * `body` (:220), `#root` (:235) and `.app` (:273) — each declaring
     * `overflow-x: hidden`, which COMPUTES to `hidden auto`, because a
     * two-value overflow turns a `visible` axis into `auto` when the other
     * axis is not visible. None of them ever scrolls: each is as tall as its
     * content (~5300px at 390px wide). So the DOCUMENT scrolls instead, and
     * the header — sticky relative to a box that never moves — rides off the
     * top with it, taking the hamburger that opens the drawer.
     *
     * Grepping for `hidden auto` finds nothing; it is computed, never
     * declared. And fixing only `.app` leaves `#root` as the next scrolling
     * ancestor, so the header still will not stick — all four need changing.
     *
     * Not fixed here on purpose. The obvious repair is `hidden` → `clip`,
     * but `clip` also forbids programmatic scrolling on those boxes, and the
     * app has scroll call sites that serve its founding executive-function
     * features — `sessionResume.js` ("where you left off") and
     * `journeyProgress.js` (`focusPathGapTarget`) among them. That is a
     * global layout change with real blast radius, and it does not belong in
     * a commit that repairs tests.
     */
    test(`the header stays on screen while scrolling at ${width}px`, async ({
      page,
    }) => {
      test.fail()
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
