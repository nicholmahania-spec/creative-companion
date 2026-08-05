import { test, expect } from '@playwright/test'
import { skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * Button hover/press guardrails.
 *
 * Two bugs shipped here and both were invisible to review and to the unit
 * suite, because both were pure cascade problems that only exist in a real
 * browser:
 *
 * 1. No variant had a working `:active`. The base `:active` rules are plain
 *    declarations while the fills that win are `!important`, so pressing any
 *    button repainted nothing. Reading the rules suggested it worked.
 * 2. The generic `.btn:hover` painted `--bg-muted` on every button with no
 *    disabled guard. Primary and secondary only *looked* correct, shielded by
 *    unrelated `!important` fills further down; ghost had no such shield, so a
 *    disabled ghost button lit up under the cursor.
 *
 * The second one survived a first fix attempt that guarded the wrong rule and
 * changed nothing — which is the whole reason this is asserted on computed
 * style in a browser rather than by grepping selectors. A selector-shape test
 * passes on rules that are dead, and fails on rules that are fine but
 * overridden; only the painted result distinguishes the two.
 *
 * Probes are mounted rather than hunted for. The contract belongs to the
 * stylesheet, not to whichever screen happens to render a disabled ghost
 * button today, and a disabled variant of each kind is not reliably reachable
 * in the app.
 */

const VARIANTS = ['primary', 'secondary', 'ghost']

/** Mount one enabled and one disabled button per variant into the app shell. */
async function mountProbes(page, { dark }) {
  await page.evaluate((isDark) => {
    document.querySelector('#btn-state-probes')?.remove()
    const app = document.querySelector('.app') || document.body
    app.classList.toggle('deep', isDark)

    const row = document.createElement('div')
    row.id = 'btn-state-probes'
    // Fixed and clear of other chrome so nothing overlaps the hover target.
    row.style.cssText =
      'position:fixed;top:0;left:0;z-index:99999;display:flex;gap:8px;padding:12px'

    for (const variant of ['primary', 'secondary', 'ghost']) {
      for (const disabled of [false, true]) {
        const b = document.createElement('button')
        b.className = `btn btn-${variant}`
        b.dataset.probe = disabled ? `${variant}-disabled` : variant
        if (disabled) b.disabled = true
        b.textContent = variant
        row.appendChild(b)
      }
    }
    app.appendChild(row)
  }, dark)
}

/**
 * `.btn` transitions background/border over `--transition` (200ms), so a
 * computed style read straight after the pointer moves still returns the
 * *starting* colour. That matters in both directions: it makes an enabled
 * button look like it never repainted, and — worse — it makes a disabled
 * button look correctly inert when it is in fact mid-repaint. Every read here
 * waits past the transition so "no change" means no change.
 */
const SETTLE_MS = 320

/**
 * Background of a probe at rest, under the cursor, and while held down.
 *
 * Reads `background-image` AS WELL AS `background-color`, and that is the
 * whole point rather than a detail. Primary and secondary are painted with a
 * gradient plate plus a conic-gradient border ring, so their fill lives
 * entirely in `background-image` and their `background-color` is
 * `rgba(0, 0, 0, 0)` in every state. Reading colour alone therefore reported
 * "never repaints" for the two most-used buttons in the app while they were
 * demonstrably changing — measured: primary goes rgb(91,66,243) →
 * rgb(67,48,192) on hover, secondary white → rgb(235,235,235).
 *
 * Ghost hid the bug, because it is the one variant filled with a plain colour,
 * so it alone kept passing.
 *
 * This makes the guard STRONGER, not looser: it now sees repaints it was blind
 * to, and the disabled assertions below still hold against the fuller reading.
 * The file's own docstring already said "only the painted result distinguishes
 * the two" — it was just reading a partial view of the painted result.
 */
async function paintStates(page, probe) {
  const el = page.locator(`[data-probe="${probe}"]`)
  const bg = () =>
    el.evaluate((n) => {
      const c = getComputedStyle(n)
      return `${c.backgroundColor} | ${c.backgroundImage}`
    })

  const rest = await bg()

  const box = await el.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(SETTLE_MS)
  const hover = await bg()

  await page.mouse.down()
  await page.waitForTimeout(SETTLE_MS)
  const press = await bg()
  await page.mouse.up()

  // Park the cursor clear and let it settle back, so the next probe starts
  // from rest rather than from this one's hover.
  await page.mouse.move(0, 600)
  await page.waitForTimeout(SETTLE_MS)

  return { rest, hover, press }
}

test.describe('button interaction states', () => {
  for (const theme of ['light', 'dark']) {
    test(`every variant answers hover and press in ${theme}`, async ({
      page,
    }) => {
      const gate = await unlockAndOnboard(page)
      skipIfCloud(test, gate)
      await mountProbes(page, { dark: theme === 'dark' })

      for (const variant of VARIANTS) {
        const { rest, hover, press } = await paintStates(page, variant)

        expect(hover, `${variant} must repaint on hover`).not.toBe(rest)
        // The press must step past the hover, not sit on it. Primary's press
        // once asked for the colour hover already painted, so a press that
        // "worked" was still invisible.
        expect(press, `${variant} press must differ from hover`).not.toBe(hover)
      }
    })

    test(`disabled buttons never repaint in ${theme}`, async ({ page }) => {
      const gate = await unlockAndOnboard(page)
      skipIfCloud(test, gate)
      await mountProbes(page, { dark: theme === 'dark' })

      for (const variant of VARIANTS) {
        const probe = `${variant}-disabled`
        const { rest, hover, press } = await paintStates(page, probe)

        expect(hover, `disabled ${variant} must not repaint on hover`).toBe(rest)
        expect(press, `disabled ${variant} must not repaint on press`).toBe(rest)
      }
    })
  }

  test('disabled buttons say they are unavailable', async ({ page }) => {
    const gate = await unlockAndOnboard(page)
    skipIfCloud(test, gate)
    await mountProbes(page, { dark: false })

    for (const variant of VARIANTS) {
      const style = await page
        .locator(`[data-probe="${variant}-disabled"]`)
        .evaluate((n) => {
          const cs = getComputedStyle(n)
          return { opacity: cs.opacity, cursor: cs.cursor }
        })

      // One treatment for every variant. `.btn:disabled` said 0.5 and
      // `.btn-primary:disabled` said 0.45 — close enough to read as a
      // rendering artefact rather than a decision.
      expect(style.opacity, `disabled ${variant} opacity`).toBe('0.5')
      // `not-allowed` rather than `pointer-events: none`, so the control can
      // still say it is unavailable instead of going inert.
      expect(style.cursor, `disabled ${variant} cursor`).toBe('not-allowed')
    }
  })
})
