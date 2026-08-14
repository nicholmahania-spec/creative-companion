import { JOURNEY_STEPS } from '../src/lib/journey/journey.js'

/**
 * The stage contract — every stop, one primitive.
 *
 * THIS FILE USED TO NAME THREE ROOMS AND FOUR SHELL PAGES, AND BOTH HALVES
 * WENT STALE AT ONCE. Directions, Identity and Touchpoints each hand-rolled
 * a modal room (`.direction-room`, `.identity-workroom`,
 * `.application-workroom`), so the fixture listed those three selectors and
 * their three bespoke recovery links, and derived "shell stop" by
 * subtraction. Then the consolidation this file's own header asked for
 * happened — one `Workroom` component owns the portal, the trap, the exit
 * and the path edge — and every stop moved onto it, not just the original
 * three. `SparkView` stopped rendering `.direction-room` at all, so every
 * selector built from that list matched nothing and the suite failed on a
 * working app; Brief, Research, Brand book and Delivery became rooms, so the
 * "renders in the shell" list asserted the opposite of the architecture.
 *
 * WHAT IS TRUE NOW, and what everything below derives from:
 *
 *   - every path stop mounts a `.cc-stage` (role="dialog" aria-modal) that
 *     owns the viewport and puts `#root` to sleep — inert, aria-hidden,
 *     `visibility: hidden`, body scroll frozen;
 *   - the stage element carries `.cc-stage--<stepId>`; a stop that has
 *     handed the viewport to the next one stays mounted with `is-suspended`,
 *     so "the room" is always the one WITHOUT that class;
 *   - `.cc-stage-exit` is the one escape, on every stop, and it goes to the
 *     stop before this one on the project's path — the first stop exits to
 *     the desk (Workroom.jsx's `exit`). Escape does the same thing;
 *   - the ledge (`.cc-stage-ledge`) owns the stop's next action; every
 *     non-terminal stop carries `.work-path-next` there.
 *
 * Derived from JOURNEY_STEPS rather than listed, so a stop added, removed or
 * reordered moves this fixture with it instead of leaving it describing an
 * app that no longer exists — which is exactly how the last version died.
 *
 * `closesTo` mirrors Workroom's own derivation and is what makes the "exit
 * reaches the previous stop" tests a contract rather than a tautology: the
 * app derives from the project-filtered step list at runtime, this derives
 * from the declared path, and the tests assert the two agree.
 */
export const WORKROOMS = JOURNEY_STEPS.map((step, i) => {
  const prev = i > 0 ? JOURNEY_STEPS[i - 1] : null
  return {
    stepId: step.id,
    view: step.view,
    room: `.cc-stage--${step.id}`,
    closesTo: prev ? prev.view : 'desk',
    /* The exit's own words: "Back to Research", "Back to the desk". The desk
       is not a path stop, so `labelForView('desk')` cannot name it — the
       label is the one Workroom prints. */
    closesToLabel: prev ? prev.label : 'the desk',
    recovery: '.cc-stage-exit',
  }
})

/**
 * Surfaces that genuinely render in the shell, with no room lock.
 *
 * This used to be "every path stop that is not a room", derived by
 * subtraction — and the subtraction now yields nothing, because every stop
 * is a room. Deriving an empty list would have made the negative half of the
 * lifecycle suite silently vacuous, which is worse than a wrong list. The
 * desk is the project's shell home and the exit target of the first stop, so
 * it is where a leaked room lock would strand a designer first.
 */
export const SHELL_VIEWS = ['desk']

/** The live room on screen, or nothing when a shell view has the viewport. */
export const LIVE_ROOM_SELECTOR = '.cc-stage:not(.is-suspended)'

/**
 * The six stops this suite calls primary.
 *
 * Brand book is a real path stop and is NOT skipped by anything here — it is
 * simply not one of the six the visual reset was migrating, so it is excluded
 * from the "primary" lists and covered by the whole-path walks alongside
 * them. Derived by subtraction so promoting or demoting a stop moves this
 * list rather than leaving it stale.
 */
export const PRIMARY_STOP_IDS = JOURNEY_STEPS.map((s) => s.id).filter(
  (id) => id !== 'book'
)

export const PRIMARY_STOPS = JOURNEY_STEPS.filter((s) =>
  PRIMARY_STOP_IDS.includes(s.id)
)

/** Read the whole lifecycle in one round trip, so nothing is half-observed. */
export async function readLifecycle(page, roomSelector) {
  return page.evaluate((sel) => {
    const root = document.getElementById('root')
    const room = document.querySelector(sel)
    const active = document.activeElement
    return {
      roomPresent: !!room,
      roomSuspended: room?.classList.contains('is-suspended') ?? null,
      role: room?.getAttribute('role') ?? null,
      ariaModal: room?.getAttribute('aria-modal') ?? null,
      rootInert: root?.hasAttribute('inert') ?? null,
      rootAriaHidden: root?.getAttribute('aria-hidden') ?? null,
      rootVisibility: root?.style.visibility ?? null,
      bodyOverflow: document.body.style.overflow,
      focusInRoom: room ? room.contains(active) : false,
      activeTag: active?.tagName ?? null,
      activeClass:
        typeof active?.className === 'string' ? active.className : '',
    }
  }, roomSelector)
}

/** Is this view one that mounts a room rather than a shell page? */
export function landsInRoom(view) {
  return WORKROOMS.some((w) => w.view === view)
}

/** The room selector for a workroom view, or null for a shell page. */
export function roomFor(view) {
  return WORKROOMS.find((w) => w.view === view)?.room ?? null
}

/**
 * Wait until focus has finished moving after landing on `view`.
 *
 * The rooms focus themselves inside a `requestAnimationFrame`, so for a short
 * window after arrival the active element is still whatever the shell left
 * behind. That matters for the digit shortcuts specifically: App only honours
 * a bare single-key shortcut while focus is on the body or inside
 * `#main-content` (WCAG 2.1.4), and a room is portalled to `document.body` —
 * so blurring BEFORE the room grabs focus lets the room take it right back,
 * and the keypress that follows is correctly ignored.
 *
 * That produced a test that failed on Touchpoints while the app was right.
 * Settle first, then blur, then press.
 */
export async function settleFocus(page, view) {
  if (!landsInRoom(view)) {
    await page.waitForTimeout(400)
    return
  }
  /* Focus ON BODY is also settled. A test that has just blurred a field —
     which several do deliberately, to flush a store write — leaves focus on
     body, and body never re-enters the room: the room's focusin handler only
     reacts to focusin events, which body does not fire. Waiting for
     focus-in-room there waits forever on a working app. The race this guard
     exists for is only the one where the room's mount-time grab lands AFTER
     the blur and steals the keypress; with focus already on body the grab has
     either happened or the press wins first. */
  await page.waitForFunction(
    (sel) => {
      const room = document.querySelector(sel)
      if (!room) return false
      const active = document.activeElement
      return room.contains(active) || active === document.body || active == null
    },
    `${roomFor(view)}:not(.is-suspended)`,
    { timeout: 15_000 }
  )
}

/** Jump to a stop with its digit shortcut, from any stop including a room. */
export async function pressStopKey(page, fromView, num) {
  await settleFocus(page, fromView)
  await page.evaluate(() => document.activeElement?.blur?.())
  await page.keyboard.press(String(num))
}

/**
 * Move to a stop by id, from a known current view, without racing focus.
 *
 * `helpers.js` already has `goToStepByKey`, and specs that never enter a room
 * are fine on it. This one settles focus first (see `settleFocus`), which is
 * what makes it safe to leave a workroom by keyboard.
 */
export async function goToStop(page, fromView, stepId) {
  const step = JOURNEY_STEPS.find((s) => s.id === stepId)
  if (!step) throw new Error(`No journey step with id "${stepId}"`)
  await pressStopKey(page, fromView, step.num)
}

/** The room's own way out — the stage exit, the same control on every stop. */
export function recoveryFor(view) {
  return WORKROOMS.find((w) => w.view === view)?.recovery ?? null
}
