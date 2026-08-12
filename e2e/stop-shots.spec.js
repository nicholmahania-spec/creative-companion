import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { seedProject, skipIfNoSeed } from './seed.js'
import { PRIMARY_STOPS, landsInRoom, roomFor } from './workroom-contract.js'

/**
 * A screenshot runner for the six primary stops — a testing tool, nothing else.
 *
 * OFF BY DEFAULT. It runs only with `SHOTS=1`, so it never gates CI and never
 * turns a rendering difference into a red build. That is deliberate: the
 * visual reset is CHANGING how these screens look, and a suite that failed on
 * that would be an obstacle to the work it is meant to protect. What this
 * gives instead is a cheap before/after the designer can look at.
 *
 *   SHOTS=1 npx playwright test e2e/stop-shots.spec.js
 *   SHOTS=1 SHOT_DIR=test-results/before npx playwright test e2e/stop-shots.spec.js
 *
 * Deterministic by construction: the same Soft Signal fixture every run, the
 * same two widths, animations frozen, and the caret hidden — so a diff between
 * two directories is a real difference and not a blinking cursor.
 *
 * `mobile-view-sweep.spec.js` already has a `MEASURE=1` mode that shoots every
 * view at 390. This is not a replacement for it: that one sweeps breadth at one
 * width for overflow review, this one shoots the six migrating stops at both
 * ends of the range and captures the ROOM on the three stops where the shell is
 * hidden — which the sweep, reading `.app`, cannot see.
 */
const ENABLED = !!process.env.SHOTS
const DIR = process.env.SHOT_DIR || 'test-results/stop-shots'
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]

test.describe('primary stop screenshots', () => {
  test.skip(
    !ENABLED,
    'screenshot runner — set SHOTS=1 to capture. Never gates CI.'
  )

  test('capture the six primary stops at 390 and 1440', async ({ page }) => {
    test.setTimeout(300_000)
    mkdirSync(DIR, { recursive: true })

    await page.setViewportSize(WIDTHS[1])
    const seeded = await seedProject(page, 'project')
    skipIfNoSeed(test, seeded)

    /* Freeze anything that would make two runs differ. */
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }`,
    })

    const written = []
    for (const vp of WIDTHS) {
      for (const step of PRIMARY_STOPS) {
        await page.setViewportSize(vp)
        await seedProject(page, step.view)
        await page.addStyleTag({
          content: `*, *::before, *::after {
            animation: none !important;
            transition: none !important;
            caret-color: transparent !important;
          }`,
        })
        await page.waitForTimeout(900)

        /* Shoot the element that owns the viewport. On the three workroom
           stops that is the room — a page-level shot there captures the
           hidden shell's dimensions rather than what is on screen. */
        const target = landsInRoom(step.view)
          ? page.locator(`${roomFor(step.view)}:not(.is-suspended)`)
          : page

        const path = `${DIR}/${step.id}-${vp.width}.png`
        if (target === page) {
          await page.screenshot({ path, fullPage: false })
        } else {
          await target.screenshot({ path })
        }
        written.push(path)
      }
    }

    console.log(`\nWrote ${written.length} screenshots:\n${written.join('\n')}\n`)
  })
})
