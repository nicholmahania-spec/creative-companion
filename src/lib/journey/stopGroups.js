/**
 * The Workspaces rail's three phases, and the seams between them.
 *
 * WHY THE RAIL HAS SEAMS AT ALL, because they are not decoration. On a phone
 * the To-do pill searches upward for a resting place that holds no interactive
 * control (`src/lib/fabClearance.js`). Its reach is 368px — a 320px lift cap
 * plus its own 48px — and a seat needs 48px of clear column plus the 6px
 * `CLEARANCE_GAP`. Measured 2026-08-15 at 320/390/430: seven stops run 481.7px
 * unbroken on 4px gaps, so at some scroll offsets the run spans the whole
 * reach, `chooseLift` correctly returns null, and the pill goes home and
 * covers part of a stop. That is a real 214px window of stolen taps, not a
 * test artifact. Shrinking a stop is not available — it would need a 42.3px
 * target, below the 44px floor. Splitting the run is.
 *
 * WHY THESE THREE GROUPS, and not the pixel-equalising split the experiment
 * used. The grouping is authorial: it says which stops produce the brand.
 *
 *   GROUNDWORK  Brief, Research, Directions — nothing here authors the brand.
 *               Directions in particular produces a route, a rationale and
 *               references; `DirectionComposition.jsx` states that choosing a
 *               direction "does not overwrite the project's mark, faces or
 *               palette", and Identity reads it as an offer it must accept.
 *   DESIGN      Identity, Touchpoints — Identity is where the brand becomes an
 *               authored object, and Touchpoints reads that system live
 *               (`activeProject.palette`), not by reference.
 *   HANDOFF     Brand book, Delivery — what leaves the studio.
 *
 * Owner decision, 2026-08-15, after a measured comparison of six groupings.
 *
 * WHAT THIS MODULE MAY NOT DO. It decides WHERE a seam goes, never how big one
 * is: the size is a clearance constant and belongs beside the pill's own
 * geometry, in `lazy-desk.css`. And it is keyed to step ids, never to
 * position — an `nth-child` seam lands in the wrong place the moment the rail
 * renders a reduced stop set.
 */

/** Ordered, and the order is the journey's. Ids, never labels — the same rule
 *  `journey.js` states at the top, and four of these ids already read nothing
 *  like the label a designer sees. */
export const STOP_GROUPS = Object.freeze([
  Object.freeze({ id: 'groundwork', stepIds: Object.freeze(['define', 'research', 'ideate']) }),
  Object.freeze({ id: 'design', stepIds: Object.freeze(['design', 'sketch']) }),
  Object.freeze({ id: 'handoff', stepIds: Object.freeze(['book', 'deliver']) }),
])

/**
 * How many stops fit without help.
 *
 * Three stops including Delivery — the only card that wraps to two lines, and
 * so the tallest — measured 252.2px against a 266px ceiling, which is the
 * longest run that still leaves the pill a seat at every scroll offset. Four
 * measured 321.6px and reopened the collision. So a rail of three or fewer
 * gets no seam: it would be a gap that buys nothing, which is exactly the
 * "useless seam" an `expansion` project (Brief, Touchpoints, Delivery) would
 * otherwise carry.
 */
export const STOPS_THAT_FIT = 3

/** The group a step belongs to, or null for an id no group claims. */
export function groupIdForStep(stepId) {
  const g = STOP_GROUPS.find((grp) => grp.stepIds.includes(stepId))
  return g ? g.id : null
}

/**
 * Which of the rendered stops should open a visual group.
 *
 * Driven by what is ACTUALLY on the rail, so a reduced stop set collapses its
 * empty groups on its own: a group with no active stop contributes no seam,
 * and the first stop on the rail never carries one — a leading seam is dead
 * space above the list rather than a break inside it.
 *
 * @param {string[]} activeStepIds ids in rail order
 * @returns {Set<string>} ids that should be drawn as a group's first stop
 */
export function groupBreaksFor(activeStepIds) {
  const ids = (activeStepIds || []).filter(Boolean)
  if (ids.length <= STOPS_THAT_FIT) return new Set()

  const seen = new Set()
  const breaks = new Set()
  for (const id of ids) {
    const group = groupIdForStep(id)
    /* An id no group claims cannot open one — it keeps whatever seam the
       stop before it established, which is the safe direction to fail in. */
    if (!group || seen.has(group)) continue
    /* The first group to appear opens the rail, not a seam inside it. */
    if (seen.size > 0) breaks.add(id)
    seen.add(group)
  }
  return breaks
}
