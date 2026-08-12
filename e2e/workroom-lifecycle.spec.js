import { test, expect } from '@playwright/test'
import { seedProject, skipIfNoSeed } from './seed.js'
import {
  WORKROOMS,
  SHELL_STOPS,
  readLifecycle,
  landsInRoom,
  roomFor,
} from './workroom-contract.js'
import { getPrevJourney, labelForView } from '../src/lib/journey/journey.js'

/**
 * The workroom lifecycle, asserted from the DOM rather than from any one file.
 *
 * Three views implement this by hand today and the app-wide visual reset is
 * consolidating them. Nothing in the suite noticed that: a grep across e2e/
 * for `inert`, `aria-hidden`, `body.style.overflow` and launcher restoration
 * found ZERO assertions before this file. A room that stopped freezing body
 * scroll, or stopped putting focus inside itself, or leaked `inert` onto the
 * shell after closing, would have shipped green.
 *
 * Every assertion here is on observable behaviour — no import of the views, no
 * knowledge of which component owns the effect — so the consolidation can land
 * underneath it without editing this file.
 */
test.describe('workroom lifecycle', () => {
  for (const wr of WORKROOMS) {
    const live = `${wr.room}:not(.is-suspended)`

    test(`${wr.view}: opens, owns the viewport, and sleeps the shell`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, wr.view)
      skipIfNoSeed(test, seeded)

      /* Focus lands via a double rAF after mount; waiting on the condition
         rather than a fixed delay keeps this from being a flake generator. */
      await page.waitForFunction(
        (sel) => {
          const room = document.querySelector(sel)
          return !!room && room.contains(document.activeElement)
        },
        live,
        { timeout: 15_000 }
      )

      const l = await readLifecycle(page, live)

      expect(l.roomPresent, `${wr.room} did not mount on ${wr.view}`).toBe(true)
      expect(l.role, 'the room must announce itself as a dialog').toBe('dialog')
      expect(l.ariaModal, 'a room that owns the viewport is modal').toBe('true')

      // #root becomes inert
      expect(l.rootInert, '#root must be inert while a room is open').toBe(true)
      // #root is hidden from presentation
      expect(l.rootAriaHidden, '#root must be hidden from AT').toBe('true')
      expect(
        l.rootVisibility,
        '#root must be visually hidden, not merely covered — a room that only ' +
          'paints over the shell lets the shell show through a shorter room'
      ).toBe('hidden')
      // body scrolling is frozen
      expect(l.bodyOverflow, 'body scrolling must be frozen').toBe('hidden')
      // focus enters the workroom
      expect(l.focusInRoom, 'focus must enter the room').toBe(true)

      /* The room fills the viewport. Not a styling opinion — a room that does
         not is a room the inert shell is hidden behind, leaving blank page. */
      const box = await page.locator(live).boundingBox()
      const vp = page.viewportSize()
      expect(box.width).toBeGreaterThanOrEqual(vp.width - 1)
      expect(box.height).toBeGreaterThanOrEqual(vp.height - 1)
    })

    test(`${wr.view}: Tab and Shift+Tab stay inside the room`, async ({
      page,
    }) => {
      /* KNOWN DEFECT ON TOUCHPOINTS — pinned, not papered over.
       *
       * All three rooms trap focus with the same hand-written selector:
       *
       *   a[href], button:not([disabled]), input:not([disabled]),
       *   select:not([disabled]), textarea:not([disabled]),
       *   [tabindex]:not([tabindex="-1"])
       *
       * `summary` is missing from it, and a <summary> is natively focusable
       * without carrying a tabindex attribute. Touchpoints ends on one —
       * `.touchpoints-engine-hold-summary`, the "Recorded evidence · produce"
       * disclosure — so `items.indexOf(document.activeElement)` is -1 there,
       * the `index === items.length - 1` wrap never fires, and native Tab
       * carries focus out to <body>. `focusin` does not fire for body, so the
       * room never pulls it back: the keyboard user is silently outside a
       * modal whose shell is inert, with nothing focusable to go back to.
       *
       * Directions and Identity pass only because their last focusable
       * happens to be a matched element — the same latent gap is in all three.
       * The one-line fix is `summary` in that selector, in whichever component
       * ends up owning the trap. NOT MADE HERE: this task does not change
       * production code.
       *
       * `test.fail()` keeps the assertion running and still checks its result
       * — it simply says the current expected outcome is a failure. When the
       * selector is fixed this test PASSES UNEXPECTEDLY and turns the run red,
       * which is the prompt to delete these three lines.
       */
      if (wr.view === 'flow') {
        test.fail(
          true,
          'focus trap omits <summary>; Touchpoints ends on one — see comment'
        )
      }
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, wr.view)
      skipIfNoSeed(test, seeded)
      await page.waitForFunction(
        (sel) => {
          const room = document.querySelector(sel)
          return !!room && room.contains(document.activeElement)
        },
        live,
        { timeout: 15_000 }
      )

      /* Walk far enough to wrap. The rooms hold well over 25 focusables, so
         this does not prove a wrap on its own — containment is the contract,
         and the wrap is proved separately below by landing back inside. */
      for (let i = 0; i < 30; i += 1) {
        await page.keyboard.press('Tab')
        const inside = await page.evaluate(
          (sel) =>
            document.querySelector(sel)?.contains(document.activeElement) ??
            false,
          live
        )
        expect(inside, `Tab #${i + 1} escaped ${wr.room}`).toBe(true)
      }

      for (let i = 0; i < 30; i += 1) {
        await page.keyboard.press('Shift+Tab')
        const inside = await page.evaluate(
          (sel) =>
            document.querySelector(sel)?.contains(document.activeElement) ??
            false,
          live
        )
        expect(inside, `Shift+Tab #${i + 1} escaped ${wr.room}`).toBe(true)
      }
    })

    test(`${wr.view}: Escape closes to ${wr.closesTo} and restores the shell`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, wr.view)
      skipIfNoSeed(test, seeded)
      await page.waitForFunction(
        (sel) => {
          const room = document.querySelector(sel)
          return !!room && room.contains(document.activeElement)
        },
        live,
        { timeout: 15_000 }
      )

      await page.keyboard.press('Escape')
      await page
        .locator(`.app.view-${wr.closesTo}`)
        .waitFor({ state: 'attached', timeout: 15_000 })

      /* The room's declared exit and the path's own previous stop must be the
         same place. Asserted rather than assumed — a room that closes to a
         stop the path does not consider previous is a silent detour. */
      expect(getPrevJourney(wr.view)?.view).toBe(wr.closesTo)

      /* THE SHELL LOCK IS ONLY RELEASED WHEN THE DESTINATION IS A SHELL STOP,
         and this is the distinction the first draft of this test got wrong.
         Only Directions closes onto a page (Research). Identity closes onto
         Directions and Touchpoints onto Identity — both rooms — so `#root`
         correctly STAYS asleep across that handover. Asserting release
         unconditionally would have demanded a flash of live shell between two
         modals, which is a worse product and not what the app does. */
      /* Read the lock only once the destination has settled. The leaving
         room's cleanup and the arriving room's effect both touch `inert` in
         the same commit, so sampling mid-handover measures a frame no user
         ever sees. */
      const readLock = () =>
        page.evaluate(() => {
          const root = document.getElementById('root')
          return {
            rootInert: !!root?.hasAttribute('inert'),
            rootAriaHidden: root?.getAttribute('aria-hidden'),
            rootVisibility: root?.style.visibility || '',
            bodyOverflow: document.body.style.overflow,
          }
        })

      if (landsInRoom(wr.closesTo)) {
        const destination = roomFor(wr.closesTo)
        await expect(
          page.locator(`${destination}:not(.is-suspended)`)
        ).toHaveCount(1)
        // The room being left must not still claim the viewport.
        await expect(
          page.locator(`${wr.room}:not(.is-suspended)`)
        ).toHaveCount(0)
        await page.waitForFunction(
          () => !!document.getElementById('root')?.hasAttribute('inert'),
          undefined,
          { timeout: 10_000 }
        )
        const after = await readLock()
        expect(
          after.rootInert,
          'handing over to another room must keep the shell asleep'
        ).toBe(true)
        expect(after.bodyOverflow, 'body scroll must stay frozen').toBe(
          'hidden'
        )
      } else {
        const after = await readLock()
        expect(
          after.rootInert,
          'inert survived the close — the shell is now unusable'
        ).toBe(false)
        expect(after.rootAriaHidden).toBeNull()
        expect(after.rootVisibility).not.toBe('hidden')
        expect(
          after.bodyOverflow,
          'body scroll stayed frozen after the room closed'
        ).not.toBe('hidden')
      }
    })
  }

  /**
   * Where focus goes when a room closes.
   *
   * The rule is NOT "always back to the launcher", and finding that out is
   * most of the value of this test. Only Directions closes onto a page, and
   * there focus does return to the exact rail button that opened it. Identity
   * and Touchpoints close onto another ROOM, and that room takes focus for
   * itself on mount — which is correct for a modal that now owns the viewport,
   * and is the behaviour pinned here so the consolidation cannot quietly
   * change it in either direction.
   *
   * Driven through the step rail, not a reload: App captures the launcher from
   * `document.activeElement` as `setActiveView` runs (App.jsx:386-394), so a
   * room arrived at by reload has no launcher to return to.
   */
  for (const wr of WORKROOMS) {
    test(`${wr.view}: closing puts focus where the destination demands`, async ({
      page,
    }) => {
      test.setTimeout(150_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, 'studio')
      skipIfNoSeed(test, seeded)

      const rail = page.getByRole('navigation', { name: /Process position/i })
      const launcher = rail.getByRole('button', {
        name: new RegExp(`: ${labelForView(wr.view)}\\b`, 'i'),
      })
      await expect(launcher).toHaveCount(1)

      /* Focus, then Enter. A mouse click can leave focus on body on some
         platforms, and App can only capture an element that is ACTIVE — this
         is also exactly how a keyboard user opens the room. */
      await launcher.focus()
      const launcherText = ((await launcher.textContent()) || '').trim()
      await page.keyboard.press('Enter')

      const live = `${wr.room}:not(.is-suspended)`
      await page.waitForFunction(
        (sel) => {
          const room = document.querySelector(sel)
          return !!room && room.contains(document.activeElement)
        },
        live,
        { timeout: 15_000 }
      )

      await page.keyboard.press('Escape')
      await page
        .locator(`.app.view-${wr.closesTo}`)
        .waitFor({ state: 'attached', timeout: 15_000 })

      if (landsInRoom(wr.closesTo)) {
        const destination = `${roomFor(wr.closesTo)}:not(.is-suspended)`
        await page.waitForFunction(
          (sel) =>
            document.querySelector(sel)?.contains(document.activeElement) ??
            false,
          destination,
          { timeout: 15_000 }
        )
        const landed = await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          connected: document.activeElement?.isConnected ?? false,
        }))
        expect(
          landed.tag,
          'focus fell back to the document instead of entering the next room'
        ).not.toBe('BODY')
        expect(landed.connected).toBe(true)
      } else {
        /* Restoration runs two rAFs after the view change. */
        await page.waitForFunction(
          (expected) => {
            const el = document.activeElement
            return (
              el instanceof HTMLElement &&
              el.classList.contains('step-rail-step') &&
              (el.textContent || '').trim() === expected
            )
          },
          launcherText,
          { timeout: 15_000 }
        )
        const landed = await page.evaluate(() => ({
          cls:
            typeof document.activeElement?.className === 'string'
              ? document.activeElement.className
              : '',
          text: (document.activeElement?.textContent || '').trim(),
          connected: document.activeElement?.isConnected ?? false,
        }))
        expect(
          landed.cls,
          'focus did not come back to the rail button that opened the room'
        ).toContain('step-rail-step')
        expect(landed.text).toBe(launcherText)
        expect(
          landed.connected,
          'focus landed on a detached node — a stale launcher reference'
        ).toBe(true)
      }
    })
  }

  /**
   * A stale launcher must never be focused.
   *
   * The views guard this with `launcher?.isConnected`. Proved by opening a
   * room from a launcher that is then destroyed: closing must leave focus
   * somewhere real rather than throwing or focusing a detached node. The rail
   * is rebuilt when the project's stage set changes, so switching a stage off
   * and on replaces every button in it.
   */
  test('a launcher that no longer exists is not focused on close', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const seeded = await seedProject(page, 'spark')
    skipIfNoSeed(test, seeded)

    const live = '.direction-room:not(.is-suspended)'
    await page.waitForFunction(
      (sel) => {
        const room = document.querySelector(sel)
        return !!room && room.contains(document.activeElement)
      },
      live,
      { timeout: 15_000 }
    )

    /* Arriving by reload means App never captured a launcher: the ref is null,
       which is the strongest form of "no stale reference". Closing must still
       land somewhere usable rather than throwing. */
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e.message || e)))
    await page.keyboard.press('Escape')
    await page
      .locator('.app.view-studio')
      .waitFor({ state: 'attached', timeout: 15_000 })

    expect(errors, 'closing without a launcher threw').toEqual([])
    const connected = await page.evaluate(
      () => document.activeElement?.isConnected ?? false
    )
    expect(connected, 'focus is on a detached node after close').toBe(true)
  })

  /**
   * The negative half of the contract.
   *
   * Brief, Research, Brand book and Delivery are ordinary shell pages. If a
   * future change gives one of them a room — or leaks a room's lock onto one —
   * the shell silently stops working, and nothing else would catch it.
   */
  for (const stop of SHELL_STOPS) {
    test(`${stop.view}: renders in the shell, with no room lock`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, stop.view)
      skipIfNoSeed(test, seeded)
      await page.waitForTimeout(600)

      const l = await page.evaluate(() => {
        const root = document.getElementById('root')
        return {
          rootInert: root?.hasAttribute('inert'),
          rootAriaHidden: root?.getAttribute('aria-hidden'),
          rootVisibility: root?.style.visibility || '',
          bodyOverflow: document.body.style.overflow,
        }
      })
      expect(l.rootInert, `${stop.view} left #root inert`).toBe(false)
      expect(l.rootAriaHidden).toBeNull()
      expect(l.rootVisibility).not.toBe('hidden')
      expect(l.bodyOverflow).not.toBe('hidden')

      /* The rail is the shell's own navigation and must be operable here. */
      await expect(
        page.getByRole('navigation', { name: /Process position/i })
      ).toBeVisible()
    })
  }
})
