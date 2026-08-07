import { describe, it, expect } from 'vitest'
import { chooseLift, CLEARANCE_GAP, maxLiftFor } from './fabClearance.js'

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
