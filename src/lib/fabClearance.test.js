import { describe, it, expect } from 'vitest'
import {
  chooseLift,
  collectBlockers,
  CLEARANCE_GAP,
  EXTENT_STEP,
  maxLiftFor,
} from './fabClearance.js'

/**
 * The seat arithmetic behind the To-do pill's clearance.
 *
 * These are the cases that were got wrong in the browser first, written down
 * so they cannot be got wrong again silently. The DOM half (which controls
 * count as blockers) is covered by e2e/todo-fab-clearance.spec.js, because it
 * is a hit-testing question and only a real engine can answer it.
 */

// The pill at 390x844: 48px tall, resting 17.6px above the bottom.
const PILL = { top: 778, bottom: 826 }
const MAX = maxLiftFor(844)

const lift = (blockers, currentLift = 0) =>
  chooseLift({ ...PILL, blockers, maxLift: MAX, currentLift })

describe('chooseLift', () => {
  it('stays home when nothing is under the pill', () => {
    expect(lift([])).toBe(0)
    expect(lift([{ top: 100, bottom: 200 }])).toBe(0)
  })

  it('rests on the top edge of the control it would have covered', () => {
    // The measured `finish` case: a sticky "Back to the desk" at 796–840.
    expect(lift([{ top: 796, bottom: 840 }])).toBe(826 - 796 + CLEARANCE_GAP)
  })

  it('clears a whole cluster, not just the first control it meets', () => {
    // Touchpoints at the top of the page: a note field and the sticky
    // continue row, with only 15px between them — landing between the two
    // was the bug, so the seat has to be above both.
    const seat = lift([
      { top: 800, bottom: 840 }, // Next · Assets
      { top: 696, bottom: 785 }, // note field
    ])
    expect(seat).toBe(826 - 696 + CLEARANCE_GAP)
    expect(seat - 48).toBeGreaterThan(-1) // the pill's own top stays on screen
  })

  it('comes home the moment home is honest again', () => {
    expect(lift([], 136)).toBe(0)
  })

  it('keeps a seat that is still clear rather than dropping to a lower one', () => {
    /* The chase. A control drifting up the column offers a different seat on
       every rest; taking it drags the pill up 60px per scroll stop. Holding a
       clear seat is what stops that. */
    const bar = { top: 796, bottom: 840 } // sticky footer: home is never free
    expect(lift([bar, { top: 700, bottom: 744 }], 136)).toBe(136)
    // ...but a seat that has been taken is given up, for the lowest free one.
    expect(lift([bar, { top: 660, bottom: 704 }], 136)).toBe(
      826 - 796 + CLEARANCE_GAP
    )
  })

  it('gives up when the column is tiled with controls', () => {
    /* Rows 48px tall on a 92px pitch leave 44px gaps — four short of the pill.
       There is no honest seat and the caller must know that rather than be
       handed a plausible-looking wrong one. */
    const blockers = []
    for (let top = 826 - 45; top > 826 - MAX - 100; top -= 92) {
      blockers.push({ top, bottom: top + 48 })
    }
    expect(lift(blockers)).toBeNull()
  })

  it('never climbs past the cap, even when a clear seat exists above it', () => {
    const blockers = [{ top: 826 - MAX - 200, bottom: 826 }]
    expect(lift(blockers)).toBeNull()
  })

  it('keeps the pill in the lower half of a phone screen', () => {
    // 320px of an 844px viewport: the pill's top can reach 458, no higher.
    expect(maxLiftFor(844)).toBe(320)
    expect(778 - maxLiftFor(844)).toBeGreaterThan(844 / 2 - 1)
    // Short viewports scale down rather than flinging it off the top.
    expect(maxLiftFor(600)).toBe(240)
  })
})

/**
 * The DOM half, and why it is here after all.
 *
 * The note at the top of this file is right that whether a control counts as a
 * blocker is a hit-testing question only a real engine can answer, and
 * e2e/todo-fab-clearance.spec.js still owns that. What is asserted below is a
 * different question that a real engine cannot pin down: given a control whose
 * TARGET is larger than its BOX, does `collectBlockers` record the target?
 *
 * That distinction is invisible to e2e — a browser reports the enlarged target
 * through `elementsFromPoint` and the plain box through `getBoundingClientRect`
 * without saying which one the search used, so a regression would look exactly
 * like a scroll offset that happened not to collide. Here the two can be made
 * to disagree on purpose, which is the only way to hold the search to its own
 * contract: it can never be narrower than the check.
 *
 * The geometry is the one measured on Desk at 320x844 — a 19px text link grown
 * to the 44px touch floor by a centred pseudo-element. Before `tapExtent` the
 * search recorded 794-813, `chooseLift` cleared it at a 38px seat, and the pill
 * landed 7px inside a live link.
 */
const LINK_BOX = { top: 794, bottom: 813 }
const LINK_TARGET = { top: 781.5, bottom: 825.5 } // 44px, centred on the box

/** The smallest document `collectBlockers` actually touches. */
function fakeDom({ box, target, left = 56, right = 249 }) {
  const link = {
    tagName: 'BUTTON',
    getBoundingClientRect: () => ({
      top: box.top,
      bottom: box.bottom,
      left,
      right,
      width: right - left,
      height: box.bottom - box.top,
    }),
    closest: () => link,
    contains: (el) => el === link,
  }
  const fab = {
    contains: (el) => el === fab,
    ownerDocument: null,
  }
  const doc = {
    defaultView: { innerWidth: 320, innerHeight: 844 },
    querySelectorAll: () => [link],
    /* The engine answers for the TARGET, which is what a finger hits. */
    elementsFromPoint: (x, y) =>
      y >= target.top && y <= target.bottom && x >= left && x <= right
        ? [link]
        : [],
  }
  fab.ownerDocument = doc
  return { doc, fab, link }
}

describe('collectBlockers records the target, not the box', () => {
  const COLUMN = { left: 201, right: 287, top: 778, bottom: 826, maxLift: 320 }

  it('grows a blocker to the tap target its pseudo-element creates', () => {
    const { fab } = fakeDom({ box: LINK_BOX, target: LINK_TARGET })
    const [blocker] = collectBlockers(fab, COLUMN)

    expect(blocker).toBeDefined()
    // Not the 19px box it paints.
    expect(blocker.bottom - blocker.top).toBeGreaterThan(
      LINK_BOX.bottom - LINK_BOX.top
    )
    // The 3px probe step means the edge is found within one step of the truth.
    expect(blocker.top).toBeLessThanOrEqual(LINK_TARGET.top + EXTENT_STEP)
    expect(blocker.top).toBeGreaterThanOrEqual(LINK_TARGET.top - EXTENT_STEP)
  })

  it('no longer seats the pill inside that link — the measured regression', () => {
    const { fab } = fakeDom({ box: LINK_BOX, target: LINK_TARGET })
    const blockers = collectBlockers(fab, COLUMN)
    const seat = chooseLift({
      top: COLUMN.top,
      bottom: COLUMN.bottom,
      blockers,
      maxLift: COLUMN.maxLift,
      currentLift: 0,
    })

    /* 38 is what shipped: clear of the box, 7px into the target. Whatever seat
       is chosen now, the pill's footprint must not touch the real target. */
    expect(seat).not.toBe(38)
    const pillTop = COLUMN.top - seat
    const pillBottom = COLUMN.bottom - seat
    const overlaps =
      LINK_TARGET.top < pillBottom && LINK_TARGET.bottom > pillTop
    expect(overlaps).toBe(false)
  })

  it('leaves a control whose target is its box exactly where it was', () => {
    // The ordinary case must not start paying for the enlarged one.
    const { fab } = fakeDom({ box: LINK_BOX, target: LINK_BOX })
    const [blocker] = collectBlockers(fab, COLUMN)
    expect(blocker.top).toBe(LINK_BOX.top)
    expect(blocker.bottom).toBe(LINK_BOX.bottom)
  })
})
