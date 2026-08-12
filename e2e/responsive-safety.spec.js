import { test, expect } from '@playwright/test'
import { seedProject, skipIfNoSeed } from './seed.js'
import {
  PRIMARY_STOPS,
  WORKROOMS,
  landsInRoom,
  roomFor,
  recoveryFor,
} from './workroom-contract.js'

/**
 * The six primary stops at three widths.
 *
 * `no-horizontal-overflow.spec.js` already guards 320/390/430 and
 * `mobile-view-sweep.spec.js` sweeps every view at 390 — so phones are
 * covered. What neither covers is TABLET AND DESKTOP: nothing in the suite
 * measured 768 or 1440 before this file, and the workrooms in particular were
 * measured at no width at all, because both existing specs read `.app`, which
 * is inside the `#root` a room hides.
 *
 * Three failures are checked here that a width-only sweep cannot see:
 *   - a room that does not fill the viewport, leaving the hidden shell showing
 *   - a fixed footer or nav sitting on top of the stop's primary control
 *   - a focus target parked outside the visible work area
 */
const WIDTHS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]

/** The element that owns the viewport: the live room, else the shell. */
function scopeFor(view) {
  return landsInRoom(view) ? `${roomFor(view)}:not(.is-suspended)` : '.app'
}

test.describe('responsive safety', () => {
  for (const vp of WIDTHS) {
    test(`the six primary stops hold together at ${vp.width}px (${vp.name})`, async ({
      page,
    }) => {
      test.setTimeout(300_000)
      await page.setViewportSize({ width: vp.width, height: vp.height })
      const seeded = await seedProject(page, 'project')
      skipIfNoSeed(test, seeded)

      for (const step of PRIMARY_STOPS) {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await seedProject(page, step.view)
        await page.waitForTimeout(700)

        const scope = scopeFor(step.view)
        const m = await page.evaluate(
          ({ sel, w }) => {
            const el = document.querySelector(sel)
            const de = document.documentElement
            if (!el) return { missing: true }
            const r = el.getBoundingClientRect()
            return {
              missing: false,
              scrollW: el.scrollWidth,
              clientW: el.clientWidth,
              docScrollW: de.scrollWidth,
              docClientW: de.clientWidth,
              width: Math.round(r.width),
              height: Math.round(r.height),
              viewportW: w,
            }
          },
          { sel: scope, w: vp.width }
        )

        expect(m.missing, `${step.label}: "${scope}" did not render`).toBe(
          false
        )

        // no horizontal overflow — inside the owning element…
        expect(
          m.scrollW,
          `${step.label} overflows at ${vp.width}px — ${m.scrollW}px of ` +
            `content in a ${m.clientW}px box. Find the child refusing to ` +
            `shrink with min-width: 0; do not hide the overflow.`
        ).toBeLessThanOrEqual(m.clientW + 1)

        // …and at the document, which is what a real scrollbar reflects.
        expect(
          m.docScrollW,
          `${step.label}: the document scrolls sideways at ${vp.width}px`
        ).toBeLessThanOrEqual(m.docClientW + 1)

        /* A room must fill the viewport. It hides the shell behind it, so a
           room narrower or shorter than the screen leaves blank page rather
           than the app. */
        if (landsInRoom(step.view)) {
          expect(
            m.width,
            `${step.label}: the room is ${m.width}px inside a ${vp.width}px screen`
          ).toBeGreaterThanOrEqual(vp.width - 1)
          expect(
            m.height,
            `${step.label}: the room is ${m.height}px tall in a ${vp.height}px screen`
          ).toBeGreaterThanOrEqual(vp.height - 1)
        }
      }
    })

    test(`primary controls stay reachable and uncovered at ${vp.width}px`, async ({
      page,
    }) => {
      test.setTimeout(480_000)
      await page.setViewportSize({ width: vp.width, height: vp.height })
      const seeded = await seedProject(page, 'project')
      skipIfNoSeed(test, seeded)

      for (const step of PRIMARY_STOPS) {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await seedProject(page, step.view)
        await page.waitForTimeout(700)

        /* A NAMED SET, not every button on the screen.
         *
         * The first version of this swept every `button, a[href]` inside the
         * owning element and asked whether anything overlapped it. That
         * reported controls sitting under a sticky footer inside inner scroll
         * panels — ordinary stacking a designer resolves by scrolling — and a
         * check that cries wolf on ordinary stacking gets muted, at which
         * point it guards nothing.
         *
         * These are the controls the stop cannot function without: the way
         * forward, the way back, and the path itself. One of THESE being
         * unreachable is unambiguously a bug at any width. On a workroom stop
         * only the room's controls are listed — the shell's live inside the
         * inert `#root` and are not operable there by design. */
        const live = `${roomFor(step.view)}:not(.is-suspended)`
        const selectors = landsInRoom(step.view)
          ? [
              /* The recovery link specifically. `.text-link` room-wide also
                 catches contextual pointers like "Upload finished files in
                 Assets", which live inside closed <details> — present in the
                 DOM, not on screen, and not a way out of the room. */
              `${live} ${recoveryFor(step.view)}`,
              `${live} .work-path-next`,
            ]
          : ['.header-back', '.step-rail-step', '.step-rail-cta', '.work-path-next']

        const problems = await page.evaluate(
          ({ sels }) => {
            const out = []
            const seen = new Set()
            for (const sel of sels) {
              for (const el of document.querySelectorAll(sel)) {
                if (seen.has(el)) continue
                seen.add(el)

                const style = getComputedStyle(el)
                const r = el.getBoundingClientRect()
                const visible =
                  r.width > 0 &&
                  r.height > 0 &&
                  style.visibility !== 'hidden' &&
                  style.display !== 'none' &&
                  Number(style.opacity) > 0.01
                if (!visible) continue

                const label = (
                  el.textContent ||
                  el.getAttribute('aria-label') ||
                  sel
                )
                  .trim()
                  .replace(/\s+/g, ' ')
                  .slice(0, 50)

                if (r.left < -1 || r.right > window.innerWidth + 1) {
                  out.push({
                    why: 'outside the viewport horizontally',
                    label,
                    left: Math.round(r.left),
                    right: Math.round(r.right),
                  })
                  continue
                }

                /* Reachability, asked the way a tap asks it: scroll the
                   control to the middle of the screen, then see what is
                   actually on top of its own centre. Scrolling first is what
                   separates "permanently buried under fixed chrome" from
                   "currently below the fold", which is not a defect. */
                const priorX = window.scrollX
                const priorY = window.scrollY
                el.scrollIntoView({ block: 'center', inline: 'nearest' })
                const r2 = el.getBoundingClientRect()
                const cx = Math.min(
                  Math.max(r2.left + r2.width / 2, 1),
                  window.innerWidth - 1
                )
                const cy = Math.min(
                  Math.max(r2.top + r2.height / 2, 1),
                  window.innerHeight - 1
                )
                const hit = document.elementFromPoint(cx, cy)
                const reachable =
                  !hit || el.contains(hit) || hit.contains(el)
                window.scrollTo(priorX, priorY)
                if (reachable) continue

                let node = hit
                let blocker = null
                while (node && node !== document.body) {
                  const pos = getComputedStyle(node).position
                  if (pos === 'fixed' || pos === 'sticky') {
                    blocker = node
                    break
                  }
                  node = node.parentElement
                }
                out.push({
                  why: blocker
                    ? 'covered by fixed/sticky chrome even after scrolling'
                    : 'covered by another element even after scrolling',
                  label,
                  blocker: (
                    (blocker || hit)?.className ||
                    (blocker || hit)?.tagName ||
                    ''
                  )
                    .toString()
                    .slice(0, 60),
                })
              }
            }
            return out
          },
          { sels: selectors }
        )

        expect(
          problems,
          `${step.label} at ${vp.width}px: a primary control is unreachable —\n` +
            JSON.stringify(problems, null, 2)
        ).toEqual([])
      }
    })
  }

  /**
   * A room that has focus must have that focus somewhere on screen.
   *
   * Focus parked outside the visible work area is the failure a keyboard user
   * hits first and a screenshot never shows: Tab appears to do nothing because
   * the focused control is off-canvas.
   */
  for (const vp of WIDTHS) {
    test(`focus stays inside the visible work area at ${vp.width}px`, async ({
      page,
    }) => {
      test.setTimeout(300_000)
      await page.setViewportSize({ width: vp.width, height: vp.height })
      const seeded = await seedProject(page, 'project')
      skipIfNoSeed(test, seeded)

      for (const wr of WORKROOMS) {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await seedProject(page, wr.view)
        const live = `${wr.room}:not(.is-suspended)`
        await page.waitForFunction(
          (sel) => {
            const room = document.querySelector(sel)
            return !!room && room.contains(document.activeElement)
          },
          live,
          { timeout: 15_000 }
        )

        for (let i = 0; i < 8; i += 1) {
          await page.keyboard.press('Tab')
          const bad = await page.evaluate(() => {
            const el = document.activeElement
            if (!el || el === document.body) return null
            const r = el.getBoundingClientRect()
            if (r.width === 0 && r.height === 0) return null // sr-only skip link
            const off =
              r.right < 0 ||
              r.left > window.innerWidth ||
              r.bottom < 0 ||
              r.top > window.innerHeight
            return off
              ? {
                  label: (el.textContent || '').trim().slice(0, 40),
                  rect: {
                    l: Math.round(r.left),
                    t: Math.round(r.top),
                    r: Math.round(r.right),
                    b: Math.round(r.bottom),
                  },
                }
              : null
          })
          expect(
            bad,
            `${wr.view} at ${vp.width}px: Tab #${i + 1} focused something ` +
              `off-screen — ${JSON.stringify(bad)}`
          ).toBeNull()
        }
      }
    })
  }
})
