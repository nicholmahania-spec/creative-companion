import { test, expect } from '@playwright/test'
import {
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'

/**
 * Regression guards for defects that actually shipped on the Define page.
 *
 * These live in Playwright rather than vitest deliberately. Every bug below
 * is a cascade, layout or contrast failure — a real browser has to resolve
 * the stylesheet and lay the page out to see any of them. A jsdom unit test
 * would have passed while the primary button was white-on-white.
 */

/** WCAG relative-luminance contrast between an element's text and the first
 *  opaque background painted behind it. Runs in the page so the real cascade
 *  and compositing apply. */
async function contrastOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const parse = (c) => {
      if (!c || c === 'transparent') return null
      const n = (c.match(/[\d.]+/g) || []).map(Number)
      if (!n.length) return null
      const scale = c.startsWith('color(') ? 255 : 1
      return { r: n[0] * scale, g: n[1] * scale, b: n[2] * scale, a: n.length > 3 ? n[3] : 1 }
    }
    const over = (f, b) => ({
      r: f.r * f.a + b.r * (1 - f.a),
      g: f.g * f.a + b.g * (1 - f.a),
      b: f.b * f.a + b.b * (1 - f.a),
      a: 1,
    })
    const lum = (c) => {
      const f = (v) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
    }
    /* An element's own painted fill first, INCLUDING a gradient.
     *
     * Primary and secondary buttons are painted with a gradient plate plus a
     * conic-gradient border ring, so their `background-color` is transparent
     * and their real fill lives in `background-image`. Walking straight past
     * that to the nearest solid ancestor measured the wrong surface entirely:
     * on the brief footer it resolved white text against the footer's
     * rgb(245,245,245) and reported ~1.07:1, when the button actually paints
     * white on rgb(91,66,243) — about 5.9:1, comfortably over the floor.
     *
     * The plate is a solid two-stop linear-gradient, so its first colour IS
     * the fill. Reading it is what makes this measure the button rather than
     * whatever happens to sit behind the button. */
    const ownFill = (node) => {
      const img = getComputedStyle(node).backgroundImage
      if (!img || img === 'none') return null
      const m = img.match(/rgba?\([^)]+\)/)
      return m ? parse(m[0]) : null
    }

    let node = el
    let bg = ownFill(el)
    if (bg && bg.a >= 1) node = null
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor)
      if (c && c.a > 0) {
        bg = bg ? over(bg, c) : c
        if (bg.a >= 1) break
      }
      const g = ownFill(node)
      if (g && g.a > 0) {
        bg = bg ? over(bg, g) : g
        if (bg.a >= 1) break
      }
      node = node.parentElement
    }
    if (!bg) bg = { r: 255, g: 255, b: 255, a: 1 }
    const fg = over(parse(getComputedStyle(el).color), bg)
    const L1 = lum(fg)
    const L2 = lum(bg)
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
  }, selector)
}

async function openDefine(page) {
  const step = stepByIdIn(page, 'define')
  if (await step.count()) {
    await step.first().click()
    await page.waitForTimeout(600)
  }
}

test.describe('Define page regressions', () => {
  test('primary buttons stay legible in dark mode', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Contrast Project',
      testerName: 'Contrast Tester',
    })
    skipIfCloud(test, gate)
    await openDefine(page)

    /* Actually switch to dark. This test has been asserting in LIGHT mode
       since it was written — measured — so the dark-mode regression named in
       its own title was never guarded. `.app.deep` is how the app themes
       itself, and it is the same toggle button-states uses. */
    await page.evaluate(() => {
      document.querySelector('.app')?.classList.add('deep')
    })
    await page.waitForTimeout(320)

    // Shipped at 1.10:1 — background was themed via --ts-ink while the label
    // stayed a hard-coded #FFFFFF, so in .app.deep it was white on white.
    const primary = page.locator('.btn-primary').first()
    if (!(await primary.count())) test.skip(true, 'no primary button on screen')
    const ratio = await contrastOf(page, '.btn-primary')
    expect(ratio, 'primary button text vs its own fill').toBeGreaterThanOrEqual(4.5)
  })

  test('no modal opens on arrival', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Quiet Project',
      testerName: 'Quiet Tester',
    })
    skipIfCloud(test, gate)
    await openDefine(page)

    // The running-to-do prompt used to auto-open on every project arrival.
    // A prompt whose answer is always the same is a toll, not a prompt.
    await expect(page.locator('.running-todo-prompt-overlay')).toHaveCount(0)
  })

  test('brief chrome reading order matches focus order', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Order Project',
      testerName: 'Order Tester',
    })
    skipIfCloud(test, gate)
    await openDefine(page)

    // Title → form → footer. No CSS `order` scramble — visual top must
    // match DOM top (WCAG 2.4.3).
    const orders = await page.evaluate(() => {
      /* The Brief's own title and footer chrome moved into the stage's two
         slots when the stop became a Workroom: `.cc-stage-masthead` holds
         what `.define-brief-title` used to, and `.cc-stage-ledge` holds the
         footer's action. The class names changed; the rule under test — the
         WCAG 2.4.3 one, that visual top matches DOM top — did not. */
      const parts = ['cc-stage-masthead', 'define-chapters', 'cc-stage-ledge']
      const nodes = [...document.querySelectorAll(parts.map((c) => `.${c}`).join(', '))]
      /* Name a node by WHICH of the three it matched, not by its first class
         token. The old helper took `className.split(/\s+/)[0]`, so the title —
         `<h1 class="page-title define-brief-title">` — reported as
         "page-title" and the test failed on a page whose reading order was
         perfectly correct. Nothing guarantees the order of class attributes,
         so identifying an element by its first one is a coin flip that this
         test lost when a shared `page-title` class was added in front. */
      const name = (n) => parts.find((c) => n.classList.contains(c)) || n.tagName
      const dom = nodes.map(name)
      const visual = [...nodes]
        .sort(
          (a, b) =>
            a.getBoundingClientRect().top - b.getBoundingClientRect().top
        )
        .map(name)
      return { dom, visual }
    })
    expect(orders.dom).toContain('cc-stage-masthead')
    expect(orders.dom).toContain('define-chapters')
    expect(orders.dom).toContain('cc-stage-ledge')
    expect(orders.dom.length).toBeGreaterThanOrEqual(3)
    expect(orders.visual).toEqual(orders.dom)
  })

  test('chapter rail stays visible while scrolling on wide screens', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Rail Project',
      testerName: 'Rail Tester',
    })
    skipIfCloud(test, gate)
    await page.setViewportSize({ width: 1500, height: 900 })
    await openDefine(page)

    // The brief hides the rail on purpose (dual chapter map = clutter).
    // Standalone sheet uses can still render it; skip when absent.
    const rail = page.locator('.define-chapter-rail')
    if (!(await rail.count())) test.skip(true, 'rail not rendered on The brief')

    // The rail is the only per-chapter "N needed" readout; it used to leave
    // the viewport after the first screenful of a ~22-field master scroll.
    const before = await page.evaluate(() => {
      const r = document.querySelector('.define-chapter-rail').getBoundingClientRect()
      const c = document.querySelector('.define-chapters').getBoundingClientRect()
      return { railLeft: r.left, chaptersRight: c.right }
    })
    expect(before.railLeft, 'rail sits in the right gutter').toBeGreaterThanOrEqual(
      before.chaptersRight
    )

    await page.evaluate(() => window.scrollTo(0, 900))
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => {
      const r = document.querySelector('.define-chapter-rail').getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, viewportH: window.innerHeight }
    })
    expect(after.bottom, 'rail still on screen after scrolling').toBeGreaterThan(0)
    expect(after.top, 'rail stuck near the top, not scrolled away').toBeLessThan(
      after.viewportH / 2
    )
  })

  /**
   * The phone counterpart of the test above, and the reason it is needed:
   * `.define-chapter-rail` renders on neither surface here — the brief passes
   * showChapterRail={false}, and DetectiveSheet gates it on `!isMobile` as
   * well — so at 390px the chapter head is the ONLY thing on the page that
   * says which chapter you are in. The brief measures 5563px at this width,
   * so an unpinned head is off screen for 5 of the 6.6 screenfuls.
   *
   * Asserted on geometry rather than on `position: sticky` in the cascade:
   * the declaration existing proves nothing. `overflow-x: hidden` on an
   * ancestor silently turns every sticky child into a static one (four
   * declarations in shell.css were dead this way — see its comment at the
   * html/body rule), and that failure reads as a correct stylesheet.
   */
  test('the chapter you are in stays named on a phone', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Sticky Project',
      testerName: 'Sticky Tester',
    })
    skipIfCloud(test, gate)
    await page.setViewportSize({ width: 390, height: 844 })
    await openDefine(page)

    // Park in the middle of a chapter, far below its own heading.
    await page.evaluate(() =>
      document
        .getElementById('detective-field-spectrumHighEndAffordable')
        ?.scrollIntoView({ block: 'center', behavior: 'auto' })
    )
    await page.waitForTimeout(400)

    const state = await page.evaluate(() => {
      const field = document
        .getElementById('detective-field-spectrumHighEndAffordable')
        .getBoundingClientRect()
      const owner = document
        .getElementById('detective-field-spectrumHighEndAffordable')
        .closest('.define-chapter')
      const head = owner.querySelector('.define-chapter-head').getBoundingClientRect()
      const headerH =
        document.querySelector('.header')?.getBoundingClientRect().height ?? 0
      return {
        title: owner.querySelector('.define-chapter-title').textContent.trim(),
        headTop: Math.round(head.top),
        headBottom: Math.round(head.bottom),
        fieldTop: Math.round(field.top),
        headerH: Math.round(headerH),
        viewportH: window.innerHeight,
        scrollY: Math.round(window.scrollY),
      }
    })

    expect(state.scrollY, 'the page actually scrolled').toBeGreaterThan(600)
    expect(
      state.fieldTop,
      'the field is well below its own chapter heading in the document'
    ).toBeGreaterThan(0)
    expect(
      state.headBottom,
      `"${state.title}" scrolled off screen — nothing on this page names the ` +
        `chapter any more, and the rail does not render at 390px`
    ).toBeGreaterThan(0)
    expect(
      state.headTop,
      'the chapter heading is pinned below the app header, not floating over it'
    ).toBeGreaterThanOrEqual(state.headerH - 2)
    expect(
      state.headTop,
      'the chapter heading is pinned near the top, not merely still on screen'
    ).toBeLessThan(state.headerH + 8)
  })

  test('focus mask never dims answers below the legibility floor', async ({ page }) => {
    const gate = await unlockAndOnboard(page, {
      name: 'Mask Project',
      testerName: 'Mask Tester',
    })
    skipIfCloud(test, gate)
    await openDefine(page)

    // Masked fields are the user's own answers, kept on screen as
    // working-memory scaffolding. 0.25 measured ~2:1 and 0.4 ~2.5:1 in light;
    // the floor exists so no stored pref can push them under 4.5:1.
    const masked = await page.evaluate(() => {
      const shell = document.querySelector('.app')
      if (!shell) return null
      const v = getComputedStyle(shell).getPropertyValue('--focus-mask-opacity').trim()
      return v ? Number(v) : null
    })
    if (masked === null) test.skip(true, 'mask variable not set on this build')
    expect(masked).toBeGreaterThanOrEqual(0.65)
    expect(masked).toBeLessThanOrEqual(0.8)
  })
})
