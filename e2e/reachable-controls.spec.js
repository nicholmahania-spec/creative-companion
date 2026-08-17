import { test, expect } from '@playwright/test'
import { skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * Controls that exist in the markup but cannot be reached on screen.
 *
 * This is its own failure class and it is invisible to every other kind of
 * test. Nothing throws, nothing is missing from the DOM, and a query for the
 * element succeeds — it is only the geometry that is wrong. jsdom has no
 * layout, so a unit test cannot tell a 0px-wide button from a 40px one, and
 * reading the CSS cannot either once four override layers are in play. Only a
 * real browser distinguishes them, which is why these live here.
 *
 * Both bugs asserted below shipped and survived review:
 *
 * 1. `.pref-switch` set a height and no width. Its knob is absolutely
 *    positioned and its state text is `.sr-only`, so it had no content to be
 *    sized by and collapsed to nothing. Break lock on the Timer screen was a
 *    label with blank space beside it. Settings' switches only looked fine
 *    because `.settings-studio` supplied its own width.
 * 2. The Tools menu held 589px of content in a 420px box with no scrollbar and
 *    no depth cue, so its last four rows — Settings, Keyboard shortcuts, the
 *    theme switch and Log out — were simply not on screen.
 */

test('Settings is reachable, and holds what left the Tools menu', async ({ page }) => {
  const gate = await unlockAndOnboard(page)
  skipIfCloud(test, gate)

  await page.getByRole('button', { name: /^Settings$/ }).first().click()
  await expect(page.locator('.settings-studio')).toBeVisible()

  /* The three controls that used to sit below the Tools menu's fold. If any
     stops being here, taking them out of that menu becomes a removal. */
  await expect(page.getByText(/Switch to (dark|light)/)).toBeVisible()
  await expect(page.getByText('Keyboard shortcuts')).toBeVisible()
  await expect(page.getByRole('button', { name: /Sign out|^Lock$/ })).toBeVisible()
})

test('every preference switch has a visible, clickable body', async ({ page }) => {
  const gate = await unlockAndOnboard(page)
  skipIfCloud(test, gate)

  const check = async (where) => {
    const found = await page.evaluate(() =>
      [...document.querySelectorAll('.pref-switch')].map((el) => {
        const r = el.getBoundingClientRect()
        /* `elementFromPoint` is viewport-relative: it answers for coordinates
           on screen right now, and returns whatever happens to be at those
           coordinates for anything scrolled past. Only the switches actually
           in view can be asked "would a click land on you?" — the rest are
           still checked for size, which is the defect this file is about. */
        const inView =
          r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth
        const hit = inView
          ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          : null
        return {
          w: r.width,
          h: r.height,
          inView,
          reachable: inView ? el === hit || el.contains(hit) : null,
        }
      })
    )
    expect(found.length, `no switches found on ${where}`).toBeGreaterThan(0)
    found.forEach((s) => {
      expect(s.w, `a switch on ${where} is ${s.w}px wide`).toBeGreaterThan(20)
      expect(s.h, `a switch on ${where} is ${s.h}px tall`).toBeGreaterThan(12)
    })
    const onScreen = found.filter((s) => s.inView)
    expect(onScreen.length, `no switches were on screen on ${where}`).toBeGreaterThan(0)
    onScreen.forEach((s) => {
      expect(s.reachable, `a switch on ${where} is covered by something else`).toBe(true)
    })
  }

  await page.getByRole('button', { name: /^Settings$/ }).first().click()
  await expect(page.locator('.settings-studio')).toBeVisible()
  await check('Settings')

  /* Timer is the screen the bug actually shipped on — its root is
     `insights-studio`, not `settings-studio`, so it never received the width
     that was masking the missing base rule. */
  await page.getByRole('button', { name: /^Timer$/ }).first().click()
  await expect(page.locator('.insights-break-row')).toBeVisible()
  await check('Timer')

  /* The `.insights-break-hint` assertion that used to close this test is gone.
     It required the Break lock switch to state its consequence in a visible
     line — "When the timer ends, the screen locks until you take the break."
     That line was removed in c4c5f57 ("remove educational sayings and process
     tips from app chrome"), and the owner confirmed on 2026-08-05 that it
     stays removed. The switch is labelled "Break lock" and nothing else.

     Recorded rather than quietly deleted, because the assertion was not
     wrong — it encoded a real principle, that a control should say what it
     does where you can see it. That principle lost to a deliberate decision
     about chrome, and the next person to notice the gap should find this note
     instead of re-deriving the rule and reinstating the line.

     What this test still covers is unchanged and is its actual subject: every
     preference switch has a visible, clickable body. */
})
