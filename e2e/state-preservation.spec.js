import { test, expect } from '@playwright/test'
import { seedProject, skipIfNoSeed } from './seed.js'
import { openBriefFieldChapter } from './helpers.js'
import { WORKROOMS, goToStop } from './workroom-contract.js'

/**
 * Work survives the trip.
 *
 * The visual reset is re-mounting six screens. The risk that carries is not
 * that a screen looks wrong — that is visible — but that leaving a stop and
 * coming back silently drops what was on it. That failure is invisible in a
 * screenshot and invisible in a unit test, and it is the one this file exists
 * for.
 *
 * EVERY TRIP HERE IS IN-APP, never a reload, and that is load-bearing rather
 * than stylistic. The stops keep state in two different places:
 *
 *   - Brief answers, Research pins, the Identity screen and the mock-accepted
 *     stamp are project fields, written through the store and persisted.
 *   - The Touchpoints active surface is deliberately NOT persisted — it lives
 *     in a module-level Map keyed by project (SketchView's
 *     `lastActiveSurfaceByProject`), so it survives a workroom remount and is
 *     expected to reset on reload.
 *
 * A suite that navigated by reload would test the first group twice and the
 * second not at all, while appearing to cover both. Keyboard stop-switching is
 * used instead: keys 1..N are bound app-wide and keep working inside a room,
 * which makes them the one navigator available from every stop.
 *
 * No new persistence is introduced and nothing is written directly to storage
 * — every value below is set by pressing what a designer presses.
 */
test.describe('state preservation', () => {
  test('Brief answers survive Brief → Research → back', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const seeded = await seedProject(page, 'project')
    skipIfNoSeed(test, seeded)

    const field = await openBriefFieldChapter(page, 'goal')
    await expect(field).toBeVisible({ timeout: 10_000 })
    const typed = 'Regression probe — a calm signal families recognise.'
    await field.fill(typed)
    await field.blur()
    /* The store coalesces writes; leaving before it lands would test the
       debounce rather than the screen. */
    await page.waitForTimeout(800)

    await goToStop(page, 'project', 'research')
    await page
      .locator('.app.view-studio')
      .waitFor({ state: 'attached', timeout: 15_000 })

    await goToStop(page, 'studio', 'define')
    await page
      .locator('.app.view-project')
      .waitFor({ state: 'attached', timeout: 15_000 })

    const again = await openBriefFieldChapter(page, 'goal')
    await expect(again).toHaveValue(typed, { timeout: 10_000 })
  })

  test('Research pins survive Research → Directions → back', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const seeded = await seedProject(page, 'studio')
    skipIfNoSeed(test, seeded)

    const pins = page.locator('.research-pin-card')
    /* Wait on the COUNT, not on the first card being visible.
       Research is a lazy chunk and `seedProject` returns as soon as the shell
       reports the view — deliberately, since a quiet network is the wrong
       arrival signal here — so a bare `count()` can run in the gap and read 0
       on a working screen. Visibility is the wrong thing to wait for: the
       board renders cards the viewport has not reached, so `.first()` can sit
       un-"visible" while five cards exist. Presence is what this test is
       about, and presence is what the comparison below uses. */
    await expect(pins).not.toHaveCount(0, { timeout: 30_000 })
    const before = await pins.count()
    expect(
      before,
      'the fixture has no pins, so this test could not fail'
    ).toBeGreaterThan(0)
    const starredBefore = await page.locator('.research-pin-star.is-on').count()

    await goToStop(page, 'studio', 'ideate')
    await page
      .locator('.direction-room:not(.is-suspended)')
      .waitFor({ state: 'visible', timeout: 15_000 })

    await goToStop(page, 'spark', 'research')
    await page
      .locator('.app.view-studio')
      .waitFor({ state: 'attached', timeout: 15_000 })

    await expect(pins).toHaveCount(before)
    await expect(page.locator('.research-pin-star.is-on')).toHaveCount(
      starredBefore
    )
  })

  test('the Identity screen choice survives leaving and returning', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const seeded = await seedProject(page, 'brand')
    skipIfNoSeed(test, seeded)

    const room = page.locator('.identity-workroom:not(.is-suspended)')
    await room.waitFor({ state: 'visible', timeout: 15_000 })

    /* The dock is `nav.identity-tool-dock`, labelled "Identity tools". Note
       that helpers.js's `openIdentitySubstep` looks for a nav named "Identity
       screens", which no longer exists — it silently no-ops. Left alone here
       rather than repaired, because other specs already run against that
       behaviour and changing it is not this task. */
    const tabs = room.locator('.identity-tool-btn')
    await expect(tabs.first()).toBeVisible()
    const count = await tabs.count()
    expect(count).toBeGreaterThan(1)

    /* Pick a screen that is not the one already open, so "it stayed" cannot
       be satisfied by nothing having happened. */
    const activeFirst = await room
      .locator('.identity-tool-btn.is-active')
      .textContent()
    let target = null
    for (let i = 0; i < count; i += 1) {
      const label = ((await tabs.nth(i).textContent()) || '').trim()
      if (label && label !== (activeFirst || '').trim()) {
        target = label
        break
      }
    }
    expect(target, 'no second Identity screen to switch to').toBeTruthy()

    await room.locator('.identity-tool-btn', { hasText: target }).first().click()
    await expect(
      room.locator('.identity-tool-btn.is-active')
    ).toHaveText(target)
    await page.waitForTimeout(600)

    await goToStop(page, 'brand', 'sketch')
    await page
      .locator('.application-workroom:not(.is-suspended)')
      .waitFor({ state: 'visible', timeout: 15_000 })

    await goToStop(page, 'flow', 'design')
    const back = page.locator('.identity-workroom:not(.is-suspended)')
    await back.waitFor({ state: 'visible', timeout: 15_000 })
    await expect(
      back.locator('.identity-tool-btn.is-active'),
      'Identity forgot which screen was open'
    ).toHaveText(target)
  })

  test('the Touchpoints surface and its accepted stamp survive a round trip', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const seeded = await seedProject(page, 'flow')
    skipIfNoSeed(test, seeded)

    const room = page.locator('.application-workroom:not(.is-suspended)')
    await room.waitFor({ state: 'visible', timeout: 15_000 })

    const cells = room.locator('.app-stage-film-cell')
    const cellCount = await cells.count()
    expect(cellCount, 'the fixture has no touchpoint surfaces').toBeGreaterThan(
      1
    )

    /* Switch to a surface that is not the current one. */
    const activeId = await room
      .locator('.app-stage-film-cell.is-active')
      .getAttribute('data-touchpoint')
    let targetId = null
    for (let i = 0; i < cellCount; i += 1) {
      const id = await cells.nth(i).getAttribute('data-touchpoint')
      if (id && id !== activeId) {
        targetId = id
        break
      }
    }
    expect(targetId, 'no second surface to switch to').toBeTruthy()

    await room.locator(`[data-testid="filmstrip-${targetId}"]`).click()
    await expect(
      room.locator('.app-stage-film-cell.is-active')
    ).toHaveAttribute('data-touchpoint', targetId)

    /* The accepted stamp is a real check the designer sets, written through
       `setTouchpointApp` onto the project — the existing contract, pressed
       rather than injected. */
    const accept = room.locator('[data-testid="mock-accept-btn"]')
    await expect(accept).toBeVisible()
    const wasPressed = (await accept.getAttribute('aria-pressed')) === 'true'
    await accept.click()
    const nowPressed = !wasPressed
    await expect(accept).toHaveAttribute(
      'aria-pressed',
      String(nowPressed)
    )
    await page.waitForTimeout(800)

    // open → Escape → reopen
    await page.keyboard.press('Escape')
    await page
      .locator('.app.view-brand')
      .waitFor({ state: 'attached', timeout: 15_000 })
    await goToStop(page, 'brand', 'sketch')

    const again = page.locator('.application-workroom:not(.is-suspended)')
    await again.waitFor({ state: 'visible', timeout: 15_000 })
    await expect(
      again.locator('.app-stage-film-cell.is-active'),
      'reopening Touchpoints landed on a different surface'
    ).toHaveAttribute('data-touchpoint', targetId)
    await expect(
      again.locator('[data-testid="mock-accept-btn"]'),
      'the accepted stamp did not survive the reopen'
    ).toHaveAttribute('aria-pressed', String(nowPressed))

    /* Put it back, so a rerun starts from the same fixture state as the first
       run. The seed is replayed per test, but this keeps the assertion honest
       if that ever changes. */
    await again.locator('[data-testid="mock-accept-btn"]').click()
  })

  /**
   * Every room reopens on the same project rather than resetting it.
   *
   * A cheap, broad check that complements the specific ones above: the room's
   * own heading and the project name must be identical before and after a
   * close/reopen cycle. This is what catches a remount that silently swaps to
   * a different project or drops back to an empty one.
   */
  for (const wr of WORKROOMS) {
    test(`${wr.view}: closing and reopening keeps the same project`, async ({
      page,
    }) => {
      test.setTimeout(150_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const seeded = await seedProject(page, wr.view)
      skipIfNoSeed(test, seeded)

      const live = `${wr.room}:not(.is-suspended)`
      await page.locator(live).waitFor({ state: 'visible', timeout: 15_000 })
      const before = (await page.locator(live).innerText()).slice(0, 400)

      await page.keyboard.press('Escape')
      await page
        .locator(`.app.view-${wr.closesTo}`)
        .waitFor({ state: 'attached', timeout: 15_000 })

      await goToStop(page, wr.closesTo, wr.stepId)
      await page.locator(live).waitFor({ state: 'visible', timeout: 15_000 })
      const after = (await page.locator(live).innerText()).slice(0, 400)

      expect(after, `${wr.view} came back different after a reopen`).toBe(
        before
      )
    })
  }
})
