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

    /* The stage path, not the shell rail. Both carry the accessible name
       "Process position", but on a path stop the rail sits inside the inert,
       aria-hidden `#root` — so the role query resolves to the one a user can
       see, which is the stage's own path edge. Asserting `.step-rail-step`
       here was asserting hidden chrome. */
    const path = page.getByRole('navigation', { name: /Process position/i })
    await expect(path).toBeVisible()
    await expect(path.locator('.cc-stage-stop')).toHaveCount(
      JOURNEY_STEPS.length
    )
    /* No stage switched off: the stage path draws `stepsForProject`, so a
       stop the fixture lost would make this count fall short. That is the
       whole of the old `.step-rail-off` assertion, restated on the surface
       that is actually on screen. */

    for (const step of PRIMARY_STOPS) {
      await expect(
        path.getByRole('button', {
          name: new RegExp(`^${step.label}$`, 'i'),
        }),
        `${step.label} is missing from the path`
      ).toHaveCount(1)
    }
  })

  /**
   * The label on the forward control names the stop the path declares next —
   * and pressing it lands there.
   *
   * The forward control is the ledge's `.work-path-next`, in the live stage.
   * It used to be the shell rail's `.step-rail-cta`; on a stage stop the rail
   * is inert chrome now, so asserting it would be asserting a control no
   * pointer can reach. The landing half of this test absorbed the separate
   * "Continue lands on X" tests, which drove that rail CTA on the four stops
   * that used to render in the shell — same purpose, same destinations, one
   * navigation system.
   *
   * Identity is the one deliberate exception and it is not a bug: its ledge
   * Next walks the Identity sub-screens first (Mark → Color → Type →
   * Handover) and only names Touchpoints once they are done — DesignView's
   * ledge owns that walk. So its label is asserted as "a real destination"
   * and the landing click is not driven there: it lands on a sub-screen of
   * the same stop, which `.app.view-flow` could never observe.
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

      const live = `${roomFor(step.view)}:not(.is-suspended)`
      /* Scoped to the LEDGE, not the whole stage. `work-path-next` also does
         styling duty on in-plane primaries — Delivery's "Download brand book
         PDF" ship CTA wears it — and those are content, not path controls.
         The contract's words are exact: the ledge owns the stop's next
         action, so the ledge is where its absence on the last stop means
         something. */
      const cta = page.locator(`${live} .cc-stage-ledge .work-path-next`)

      if (!next) {
        /* Delivery is the last stop. No forward control is correct — and this
           is the assertion that would catch a stop being appended after it
           without the ledge learning about it. */
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
        ).toMatch(/^Next · .+/)
        return
      }

      expect(label).toBe(`Next · ${next.label}`)

      /* And it navigates. The old suite proved this only on shell stops,
         because the rail CTA was unreachable inside a room; the ledge is in
         the room, so every stop's forward control is drivable now. */
      await cta.click()
      await page
        .locator(`.app.view-${next.view}`)
        .waitFor({ state: 'attached', timeout: 20_000 })
    })
  }

  /**
   * Back names, and reaches, the previous stop — on the stage exit.
   *
   * Two older tests merged here, because the architecture merged the two
   * things they checked. One asserted the shell header's `.header-back`
   * label on every stop and clicked it on the four that rendered in the
   * shell; the other clicked the three hand-rolled rooms' recovery links.
   * Every stop is a stage now, so that header is invisible chrome on the
   * whole path — its click hung this suite against a control no user can
   * press — and `.cc-stage-exit` is the one escape everywhere, going to the
   * path-previous stop and to THE DESK on the first one, exactly as Workroom
   * derives it. Asserting the visible control's words AND that pressing it
   * lands where the words say covers everything both tests stood for.
   */
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
         exits, and an unscoped locator resolves to the oldest. */
      const back = page.locator(`${live} .cc-stage-exit`)
      await expect(
        back,
        'every stop must answer "where does back go" — a stop with no exit ' +
          'is a dead end'
      ).toHaveCount(1)
      await expect(back).toBeVisible()
      expect(
        /* The visible arrow is aria-hidden decoration; strip it rather than
           bake it into the expectation. */
        ((await back.textContent()) || '').replace('←', '').trim(),
        'the room names a destination the path does not consider previous'
      ).toBe(`Back to ${wr.closesToLabel}`)

      await back.click()
      await page
        .locator(`.app.view-${wr.closesTo}`)
        .waitFor({ state: 'attached', timeout: 15_000 })
      /* The contract's derivation must agree with the path's own: previous
         stop, desk at the head. */
      const prev = getPrevJourney(wr.view)
      expect(prev ? prev.view : 'desk').toBe(wr.closesTo)
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

    for (const wr of WORKROOMS) {
      await seedProject(page, wr.view)
      await page.waitForTimeout(400)

      expect(wr.closesTo, `${wr.view} points back at itself`).not.toBe(wr.view)

      /* Arrived by reload, so App captured no launcher — the exit must still
         say where it goes, and Escape (its keyboard twin) must still get
         there. This used to read the shell header's label; that header is
         invisible chrome on a stage stop, and its `home` fallback was never
         the live control's answer. */
      const live = `${wr.room}:not(.is-suspended)`
      const label = (
        (await page.locator(`${live} .cc-stage-exit`).textContent()) || ''
      )
        .replace('←', '')
        .trim()
      expect(label, `${wr.view} has an empty back label`).not.toBe('')
      expect(label).toBe(`Back to ${wr.closesToLabel}`)

      await page.keyboard.press('Escape')
      await page
        .locator(`.app.view-${wr.closesTo}`)
        .waitFor({ state: 'attached', timeout: 15_000 })
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

    /* THE RULE, NOT A ROSTER. Since the ledge pass, every stop with a
       declared next carries `.work-path-next` at the stage edge — so the
       expectation is the path itself, derived, rather than a recorded list.
       A stop that loses its pointer route now fails against the
       architecture's own rule, and a new stop extends the expectation
       without an edit here. The roster this replaces predates the
       Touchpoints and Directions ledges: it was missing `flow`, correctly at
       the time it was written, and its own comment asked for exactly this
       update when the gap closed. */
    const EXPECTED_POINTER_FORWARD = JOURNEY_STEPS.filter((s) =>
      getNextJourney(s.view)
    ).map((s) => s.view)

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
