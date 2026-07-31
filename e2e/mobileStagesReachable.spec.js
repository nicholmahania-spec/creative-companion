import { test, expect } from '@playwright/test'
import { JOURNEY_STEPS } from '../src/lib/journey.js'
import { skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * Every journey stage must be reachable in the mobile drawer.
 *
 * It was not: `width: max-content !important` (written for the 768-860px
 * horizontal strip) also applied to the ≤767px drawer, so the list rendered
 * 652px wide inside a 358px card with `overflow-x: hidden`. Three of the
 * five stages were clipped with nothing to scroll — inside the panel the
 * user had deliberately opened to see the list.
 *
 * This is the one surface on mobile that names all five stages; the step
 * rail collapses the inactive four to unlabelled 24px dots. A stage that
 * does not render here cannot be found at all, and the two that did render
 * read as a complete list — so the process silently looked shorter than it
 * is, which is a working-memory and object-permanence failure rather than a
 * cosmetic one.
 *
 * Asserted on geometry, not on CSS: the bug was a computed width, and
 * `flex-wrap: wrap` reported "wrap" while the list still overflowed.
 */
test.describe('mobile drawer reaches every stage', () => {
  test('all journey stages render inside the drawer at 390px', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    const gate = await unlockAndOnboard(page, { name: 'Drawer Reach' })
    skipIfCloud(test, gate)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(400)

    await page.locator('.header-menu-toggle').first().click()
    await page.waitForTimeout(600)

    const m = await page.evaluate(() => {
      const sb = document.querySelector('.journey-sidebar')
      const sbRect = sb?.getBoundingClientRect()
      const items = [...document.querySelectorAll('.journey-bar-item')].map(
        (i) => {
          const b = i.getBoundingClientRect()
          return {
            right: b.right,
            left: b.left,
            width: b.width,
            withinCard:
              !!sbRect && b.right <= sbRect.right + 1 && b.left >= sbRect.left - 1,
          }
        }
      )
      return { count: items.length, items, cardWidth: sbRect?.width ?? null }
    })

    // The drawer renders one item per journey stage — derived, never a literal.
    expect(m.count).toBe(JOURNEY_STEPS.length)

    // Every one of them must sit inside the card. The card clips overflow,
    // so "outside the card" means unreachable, not merely off-position.
    const escaped = m.items.filter((i) => !i.withinCard)
    expect(
      escaped,
      `${escaped.length} of ${m.count} stages fall outside the ${m.cardWidth}px drawer`
    ).toHaveLength(0)

    // And each must be big enough to actually be a target.
    for (const i of m.items) expect(i.width).toBeGreaterThan(0)
  })
})
