import { test, expect } from '@playwright/test'
import { seedProject, skipIfNoSeed } from './seed.js'
import {
  WORKROOMS,
  PRIMARY_STOPS,
  landsInRoom,
  roomFor,
  pressStopKey,
} from './workroom-contract.js'
import {
  JOURNEY_STEPS,
  getNextJourney,
  getPrevJourney,
  labelForView,
} from '../src/lib/journey/journey.js'

/**
 * Where forward and back actually go.
 *
 * `journey.test.js` already proves the DECLARED chain — that `nextView` links
 * every stop and stops at the end. What nothing proved is that the app obeys
 * it: that the control on screen carries the destination the path declares,
 * and that pressing it lands there. Those are different failures. A rail that
 * says "Continue → Identity" and navigates to Touchpoints passes every unit
 * test in the repo.
 *
 * Destinations are read from JOURNEY_STEPS, never typed. The fixture is a
 * default `identity` project, so every stop is on — asserted below rather than
 * assumed, because a fixture that quietly lost a stop would turn "no dead
 * ends" into a vacuous pass.
 */
test.describe('path destinations', () => {
  test('the fixture really carries the whole path', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const seeded = await seedProject(page, 'project')
    skipIfNoSeed(test, seeded)

    const rail = page.getByRole('navigation', { name: /Process position/i })
    await expect(rail).toBeVisible()
    await expect(rail.locator('.step-rail-step')).toHaveCount(
      JOURNEY_STEPS.length
    )
    /* No stage switched off — the tail of the rail names them when there are,
       and an off stage would make "reachable" mean something weaker. */
    await expect(page.locator('.step-rail-off')).toHaveCount(0)

    for (const step of PRIMARY_STOPS) {
      await expect(
        rail.getByRole('button', {
          name: new RegExp(`: ${step.label}\\b`, 'i'),
        }),
        `${step.label} is missing from the rail`
      ).toHaveCount(1)
    }
  })

  /**
   * The label on the forward control names the stop the path declares next.
   *
   * Identity is the one deliberate exception and it is not a bug: its rail CTA
   * advances through the Identity sub-screens first (Mark → Color → Type →
   * Handover) and only names Touchpoints once they are done. That is
   * `advancePathOrIdentity` (App.jsx:1069), and it is asserted as such rather
   * than excused.
   */
  for (const step of JOURNEY_STEPS) {
    const next = getNextJourney(step.view)

    test(`${step.label}: the forward edge points at ${
      next ? next.label : 'nothing (end of path)'
    }`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, step.view)
      skipIfNoSeed(test, seeded)
      await page.waitForTimeout(500)

      const cta = page.locator('.step-rail-cta')

      if (!next) {
        /* Delivery is the last stop. No forward control is correct — and this
           is the assertion that would catch a stop being appended after it
           without the rail learning about it. */
        await expect(cta).toHaveCount(0)
        return
      }

      await expect(cta).toHaveCount(1)
      const label = ((await cta.textContent()) || '').trim()

      if (step.view === 'brand') {
        /* Sub-screens first. The label must name a real destination either
           way — an Identity screen or the next stop — never a stale one. */
        expect(
          label,
          'Identity must advance through its own screens before leaving'
        ).toMatch(/^Continue → .+/)
      } else {
        expect(label).toBe(`Continue → ${next.label}`)
      }
    })
  }

  /**
   * Back names, and reaches, the previous stop.
   *
   * The header's back affordance is derived from `getPrevJourney`, so this is
   * checking the derivation actually reaches the DOM. Note that on the three
   * workroom stops the header sits inside the inert `#root` and is NOT
   * operable — the room's own recovery link is the usable route, and it is
   * asserted separately below. The header label is still checked there,
   * because a wrong label is a wrong answer to "where does back go" even when
   * the control behind it is asleep.
   */
  for (const step of JOURNEY_STEPS) {
    const prev = getPrevJourney(step.view)
    const expected = prev ? prev.view : 'home'

    test(`${step.label}: back points at ${labelForView(expected)}`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, step.view)
      skipIfNoSeed(test, seeded)
      await page.waitForTimeout(500)

      const back = page.locator('.header-back')
      await expect(
        back,
        'every stop must answer "where does back go" — a stop with no back ' +
          'is a dead end'
      ).toHaveCount(1)
      expect(((await back.textContent()) || '').trim()).toBe(
        labelForView(expected)
      )

      if (!landsInRoom(step.view)) {
        await back.click()
        await page
          .locator(`.app.view-${expected}`)
          .waitFor({ state: 'attached', timeout: 15_000 })
      }
    })
  }

  /**
   * Forward actually navigates, from the stops where a pointer can reach it.
   *
   * Only the shell stops are driven here. On a workroom stop the rail lives
   * inside the inert `#root`, so `click()` would hang against a control no
   * user can press either — see the pointer-reachability test below, which is
   * where that gap is recorded rather than papered over.
   */
  for (const step of JOURNEY_STEPS) {
    const next = getNextJourney(step.view)
    if (!next || landsInRoom(step.view)) continue

    test(`${step.label}: Continue lands on ${next.label}`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, step.view)
      skipIfNoSeed(test, seeded)

      await page.locator('.step-rail-cta').click()
      await page
        .locator(`.app.view-${next.view}`)
        .waitFor({ state: 'attached', timeout: 20_000 })
    })
  }

  /** Each room's own recovery link goes where the path says previous is. */
  for (const wr of WORKROOMS) {
    test(`${wr.view}: the room's back link reaches ${wr.closesTo}`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, wr.view)
      skipIfNoSeed(test, seeded)

      const live = `${wr.room}:not(.is-suspended)`
      await page.locator(live).waitFor({ state: 'visible', timeout: 15_000 })

      /* Scoped to the LIVE room. The suspended rooms behind it carry their own
         "Back to …" links, and an unscoped locator resolves to the oldest. */
      const back = page
        .locator(live)
        .getByRole('button', { name: /^Back to / })
        .first()
      await expect(back).toBeVisible()
      expect(
        ((await back.textContent()) || '').trim(),
        'the room names a destination the path does not consider previous'
      ).toBe(`Back to ${labelForView(wr.closesTo)}`)

      await back.click()
      await page
        .locator(`.app.view-${wr.closesTo}`)
        .waitFor({ state: 'attached', timeout: 15_000 })
      expect(getPrevJourney(wr.view)?.view).toBe(wr.closesTo)
    })
  }

  /**
   * Direct entry leaves a working previous target.
   *
   * Landing on a stop by reload rather than by walking to it must not produce
   * a back control that points nowhere, points at itself, or points off the
   * project. This is the "pause and resume" case: the app restores the view
   * from `cc-active-view` on every load, so this is the ordinary way a
   * designer returns to work, not an edge case.
   */
  test('direct entry never produces a broken previous target', async ({
    page,
  }) => {
    test.setTimeout(480_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const seeded = await seedProject(page, 'project')
    skipIfNoSeed(test, seeded)

    for (const step of JOURNEY_STEPS) {
      await seedProject(page, step.view)
      await page.waitForTimeout(400)

      const prev = getPrevJourney(step.view)
      const target = prev ? prev.view : 'home'

      expect(target, `${step.label} points back at itself`).not.toBe(step.view)

      const label = (
        (await page.locator('.header-back').textContent()) || ''
      ).trim()
      expect(label, `${step.label} has an empty back label`).not.toBe('')
      expect(label).toBe(labelForView(target))

      /* The destination must be a place the app can actually land on. */
      const reachable = await page.evaluate(async (view) => {
        localStorage.setItem('cc-active-view', view)
        return true
      }, target)
      expect(reachable).toBe(true)
    }
  })

  /**
   * WHICH STOPS OFFER A FORWARD ROUTE YOU CAN CLICK — and Touchpoints does not.
   *
   * This is a finding, pinned rather than fixed. On Touchpoints the rail's
   * "Continue → Brand book" is inside the inert `#root`, and the room itself
   * renders only "Back to Identity" plus contextual links to Assets and (once
   * a file exists) Delivery. So the single forward step out of Touchpoints is
   * the keyboard shortcut. Directions is a near miss for the same reason but
   * does offer "Develop →" on each named route, which enters Identity.
   *
   * The list below is the CURRENT truth. It is asserted in both directions so
   * that the visual reset trips this test if it removes a pointer route — and
   * equally if it adds the missing one, at which point this list is what gets
   * updated, deliberately, with the gap closed.
   */
  test('pointer-reachable forward routes match the recorded set', async ({
    page,
  }) => {
    test.setTimeout(480_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const seeded = await seedProject(page, 'project')
    skipIfNoSeed(test, seeded)

    /* Stops with a visible, non-inert control that moves the path forward. */
    const EXPECTED_POINTER_FORWARD = ['project', 'studio', 'spark', 'brand', 'book']

    const found = []
    for (const step of JOURNEY_STEPS) {
      if (!getNextJourney(step.view)) continue
      await seedProject(page, step.view)
      await page.waitForTimeout(500)

      const has = await page.evaluate(
        ({ roomSel }) => {
          const room = roomSel ? document.querySelector(roomSel) : null
          const scope = room || document.getElementById('root')
          if (!room && document.getElementById('root')?.hasAttribute('inert')) {
            return false
          }
          const visible = (el) => {
            const r = el.getBoundingClientRect()
            return (
              r.width > 0 &&
              r.height > 0 &&
              getComputedStyle(el).visibility !== 'hidden'
            )
          }
          return [...scope.querySelectorAll('button')].some(
            (b) =>
              visible(b) &&
              /^(continue →|next ·|develop)/i.test(
                (b.textContent || '').trim()
              )
          )
        },
        { roomSel: landsInRoom(step.view) ? `${roomFor(step.view)}:not(.is-suspended)` : null }
      )
      if (has) found.push(step.view)
    }

    expect(
      found,
      'A stop gained or lost a clickable forward route. If this is deliberate, ' +
        'update EXPECTED_POINTER_FORWARD in this test and say why.'
    ).toEqual(EXPECTED_POINTER_FORWARD)
  })

  /**
   * The keyboard route out is universal, and on Touchpoints it is the only one.
   *
   * Keys 1..N are bound app-wide and keep working inside a room: the rooms'
   * capture-phase handler only claims Escape and Tab, so the digit still
   * reaches App. That is what stops Touchpoints from being a true dead end,
   * and it is worth its own assertion for exactly that reason.
   */
  for (const step of JOURNEY_STEPS) {
    const next = getNextJourney(step.view)
    if (!next) continue

    test(`${step.label}: the keyboard reaches ${next.label}`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, step.view)
      skipIfNoSeed(test, seeded)

      await pressStopKey(page, step.view, next.num)
      await page
        .locator(`.app.view-${next.view}`)
        .waitFor({ state: 'attached', timeout: 15_000 })
    })
  }
})
