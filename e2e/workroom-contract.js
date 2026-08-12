import { JOURNEY_STEPS } from '../src/lib/journey/journey.js'

/**
 * The three stops that own the viewport instead of rendering into the shell.
 *
 * Directions, Identity and Touchpoints each mount a `role="dialog"
 * aria-modal="true"` room and put `#root` to sleep behind it — inert,
 * aria-hidden, `visibility: hidden`, with body scrolling frozen. The lifecycle
 * is hand-written three times today (SparkView, DesignView, SketchView), which
 * is exactly why it needs a test that does not care which file implements it:
 * the contract is observable from the DOM, so a refactor that moves all three
 * behind one component passes this unchanged, and one that drops a step of the
 * lifecycle fails it.
 *
 * THE ROOMS STACK, and a test that misses this reads the wrong element. Going
 * Directions → Identity does not unmount Directions: it stays mounted and
 * gains `is-suspended`, and on Touchpoints both of the earlier rooms are
 * suspended behind the live one. So "the room" is always the one WITHOUT
 * `is-suspended`, never `[role=dialog]` — that selector matches three nodes on
 * Touchpoints and resolves to the oldest.
 *
 * `closesTo` is the stop the room's own recovery link returns to, and it is
 * asserted against `getPrevJourney` rather than trusted: these two agreeing is
 * the actual contract, and a room that walks somewhere else is the failure.
 */
export const WORKROOMS = [
  {
    stepId: 'ideate',
    view: 'spark',
    room: '.direction-room',
    closesTo: 'studio',
    recovery: '.direction-room-recovery .text-link',
  },
  {
    stepId: 'design',
    view: 'brand',
    room: '.identity-workroom',
    closesTo: 'spark',
    recovery: '.identity-studio-recovery .text-link',
  },
  {
    stepId: 'sketch',
    view: 'flow',
    room: '.application-workroom',
    closesTo: 'brand',
    recovery: '[data-testid="application-workroom-back"]',
  },
]

/** Path stops that render into the shell like an ordinary page. */
export const SHELL_STOPS = JOURNEY_STEPS.filter(
  (s) => !WORKROOMS.some((w) => w.view === s.view)
).map((s) => ({ stepId: s.id, view: s.view }))

/** The live room on screen, or `#root` when no room is open. */
export const LIVE_ROOM_SELECTOR = WORKROOMS.map(
  (w) => `${w.room}:not(.is-suspended)`
).join(', ')

/**
 * The six stops this suite calls primary.
 *
 * Brand book is a real path stop and is NOT skipped by anything here — it is
 * simply not one of the six the visual reset is migrating, so it is excluded
 * from the "primary" lists and covered by the whole-path walks alongside them.
 * Derived by subtraction so promoting or demoting a stop moves this list
 * rather than leaving it stale.
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
 * `#main-content` (WCAG 2.1.4, App.jsx:1651-1667), and a room is portalled to
 * `document.body` — so blurring BEFORE the room grabs focus lets the room take
 * it right back, and the keypress that follows is correctly ignored.
 *
 * That produced a test that failed on Touchpoints while the app was right.
 * Settle first, then blur, then press.
 */
export async function settleFocus(page, view) {
  if (!landsInRoom(view)) {
    await page.waitForTimeout(400)
    return
  }
  await page.waitForFunction(
    (sel) => {
      const room = document.querySelector(sel)
      return !!room && room.contains(document.activeElement)
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

/** The room's own way out — the recovery link, not every link it contains. */
export function recoveryFor(view) {
  return WORKROOMS.find((w) => w.view === view)?.recovery ?? null
}
