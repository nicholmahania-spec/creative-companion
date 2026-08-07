import { test, expect } from '@playwright/test'
import {
  unlockAndOnboard,
  skipIfCloud,
  gotoView,
  RESTORABLE_VIEWS,
} from './helpers.js'
import { mkdirSync } from 'node:fs'

/**
 * Every view the app can land on must fit a phone.
 *
 * `no-horizontal-overflow.spec.js` covers the five JOURNEY_STEPS and stops
 * there, because walking to anything else means clicking chrome that is not
 * visible at 390px: the sidebar collapses behind `.header-menu-toggle`, the
 * step rail only renders on path stops, and Ideate/Review sit inside the
 * Tools menu. So the eleven non-path views — Home, Desk, Calendar, Clients,
 * Settings, Ideate, Review, Insights, New project, Brand book, Asset library
 * — had NO mobile layout coverage at all. Not "passing"; absent.
 *
 * `gotoView` closes that by using the session-restore key the app already
 * writes (see its comment), so this sweep is viewport-independent and does
 * not guess at labels.
 *
 * The view list is `RESTORABLE_VIEWS`, derived from the registry — a new view
 * is covered the day it is registered, with no edit here. That is deliberate:
 * a hand-listed sweep is how the eleven went missing in the first place.
 *
 * Both assertions are needed. `.app` is the element that knows about a shell
 * that refuses to shrink; `documentElement` is the one that knows about a
 * real scrollbar. While `overflow-x: hidden` was on the ancestor chain the
 * document-level number stayed pinned at the viewport width and hid the bug,
 * which is why the older spec asserts both too.
 *
 * MEASURE=1 additionally writes a full-page screenshot per view and prints
 * the height/scroll-pages table used for layout review.
 */

const WIDTH = 390
const HEIGHT = 844
const MEASURE = !!process.env.MEASURE
const SHOT_DIR = process.env.SWEEP_OUT || 'test-results/mobile-sweep'

test.describe('every view fits a phone', () => {
  test(`no view overflows ${WIDTH}px`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: WIDTH, height: HEIGHT })
    const gate = await unlockAndOnboard(page, { name: 'Sweep Project' })
    skipIfCloud(test, gate)
    await page.setViewportSize({ width: WIDTH, height: HEIGHT })
    if (MEASURE) mkdirSync(SHOT_DIR, { recursive: true })

    const rows = []

    for (const view of RESTORABLE_VIEWS) {
      // Throws with the view id if the shell did not actually land there.
      await gotoView(page, view)
      await page.waitForTimeout(600)

      const m = await page.evaluate(() => {
        const de = document.documentElement
        const app = document.querySelector('.app')
        const shellW = app ? app.clientWidth : de.clientWidth
        /* Name the element that escapes, not just the fact that one did.
           "something is 40px too wide" costs an afternoon; "aside.foo +40px"
           costs a minute. */
        const offenders = []
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.visibility === 'hidden') continue
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          const over = Math.round(r.right - shellW)
          if (over > 1 || r.left < -1) {
            const cls =
              typeof el.className === 'string' && el.className.trim()
                ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
                : ''
            offenders.push({ sel: el.tagName.toLowerCase() + cls, over })
          }
        }
        offenders.sort((a, b) => b.over - a.over)
        return {
          docScrollW: de.scrollWidth,
          docClientW: de.clientWidth,
          docScrollH: de.scrollHeight,
          appScrollW: app ? app.scrollWidth : de.scrollWidth,
          appClientW: app ? app.clientWidth : de.clientWidth,
          offenders: offenders.slice(0, 3),
          heading:
            document
              .querySelector('#main-content h1, #main-content h2')
              ?.textContent.trim() || '',
        }
      })

      let shotH = null
      if (MEASURE) {
        const buf = await page.screenshot({
          fullPage: true,
          path: `${SHOT_DIR}/${WIDTH}-${view}.png`,
        })
        shotH = buf.readUInt32BE(20) // PNG IHDR height
      }

      rows.push({
        view,
        heading: m.heading,
        shotH,
        docScrollH: m.docScrollH,
        pages: +(m.docScrollH / HEIGHT).toFixed(2),
        docOver: m.docScrollW - m.docClientW,
        appOver: m.appScrollW - m.appClientW,
        offenders: m.offenders,
      })

      const blame = m.offenders.length
        ? ' Widest: ' +
          m.offenders.map((o) => `${o.sel} (+${o.over}px)`).join(', ') +
          '.'
        : ''

      expect(
        m.appScrollW,
        `.app overflows at ${WIDTH}px on "${view}" — ${m.appScrollW}px of ` +
          `content in a ${m.appClientW}px shell.${blame} Find it with ` +
          `min-width: 0, not by hiding the overflow.`
      ).toBeLessThanOrEqual(m.appClientW + 1)

      expect(
        m.docScrollW,
        `document scrolls horizontally at ${WIDTH}px on "${view}".${blame}`
      ).toBeLessThanOrEqual(m.docClientW + 1)
    }

    const pad = (s, n) => String(s).padEnd(n)
    console.log(`\n=== ${WIDTH}x${HEIGHT} · ${rows.length} views ===`)
    console.log(
      pad('view', 12) +
        pad('scrollH', 9) +
        pad('pages', 7) +
        pad('shotH', 8) +
        pad('docOvf', 8) +
        pad('appOvf', 8) +
        'heading'
    )
    for (const r of rows) {
      console.log(
        pad(r.view, 12) +
          pad(r.docScrollH, 9) +
          pad(r.pages, 7) +
          pad(r.shotH ?? '-', 8) +
          pad(r.docOver, 8) +
          pad(r.appOver, 8) +
          r.heading
      )
    }
  })
})
