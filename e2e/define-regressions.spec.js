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
    let node = el
    let bg = null
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor)
      if (c && c.a > 0) {
        bg = bg ? over(bg, c) : c
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

    // Title → start-here → form → demoted milestones. No CSS `order`
    // scramble — visual top must match DOM top (WCAG 2.4.3).
    const orders = await page.evaluate(() => {
      const sel =
        '.define-brief-title, .define-start-here, .define-chapters, .define-milestones-compact, .define-brief-footer'
      const nodes = [...document.querySelectorAll(sel)]
      const name = (n) =>
        (n.className || '').toString().split(/\s+/).find(Boolean) || n.tagName
      const dom = nodes.map(name)
      const visual = [...nodes]
        .sort(
          (a, b) =>
            a.getBoundingClientRect().top - b.getBoundingClientRect().top
        )
        .map(name)
      return { dom, visual }
    })
    expect(orders.dom).toContain('define-brief-title')
    expect(orders.dom).toContain('define-start-here')
    expect(orders.dom).toContain('define-chapters')
    expect(orders.dom).toContain('define-milestones-compact')
    expect(orders.dom.length).toBeGreaterThanOrEqual(4)
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

    const rail = page.locator('.define-chapter-rail')
    if (!(await rail.count())) test.skip(true, 'rail not rendered at this width')

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
