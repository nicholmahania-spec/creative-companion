/**
 * Clearance for the mobile To-do pill.
 *
 * THE CONFLICT. The pill must always be there (it is the frictionless-capture
 * entry point — a thought that finds no pill is a thought lost) and it must
 * never win a tap that belonged to a control underneath it. At z-index 90 over
 * a document-scrolled page those two pull apart: measured at 390x844, the pill
 * sat on `Next · Assets` on Touchpoints and on `Back to the desk` on Assets.
 *
 * WHAT THE MEASUREMENT ACTUALLY SHOWED, and it is not what it looked like.
 * The Assets collision is not a mid-scroll accident — `Back to the desk` was
 * under the pill at *every* scroll offset, because it lives in
 * `.path-continue-row`, which is `position: sticky; bottom: 0; z-index: 20`.
 * Nearly every path view has one. So the pill's home is not "over arbitrary
 * page content"; it is parked on top of the app's own bottom action bar, and
 * the bar is a fixed feature of the viewport, not something you scroll past.
 *
 * THE MOVE. A control that has to share a plane with a sticky bar gets out of
 * its way — Material's snackbar and Maps' bottom sheet both push the FAB up,
 * and neither is felt as the button "moving". Generalise that from "known
 * chrome" to "whatever is actually there": at rest, find the lowest offset at
 * which the pill's own footprint holds no interactive element, and rest there.
 * Because the dominant blocker is sticky, the offset it picks is *constant for
 * the whole view* — the pill does not bob, it just sits one shelf higher.
 *
 * WHY NOT the alternatives, all of which were tried or costed first:
 *   - hide on scroll — the pill is absent exactly when the thought arrives.
 *   - shrink while scrolling (shipped, kept) — shrinking horizontally does
 *     nothing against a full-width row, and it is full size again at rest,
 *     which is when the tap happens.
 *   - reserve a right gutter — owner rejected: 90px off every mobile primary.
 *   - move it permanently bottom-left — owner rejected: muscle memory.
 *   - clip a notch out of the colliding control (clip-path does cut hit
 *     testing, so it would work) — it mutates arbitrary page elements from a
 *     background pass, bites the owner-settled Button-85 chrome, and looks
 *     broken on an input. The pill is ours to move; the page is not ours to
 *     carve.
 *   - make part of the pill pointer-transparent — a live-looking flank that
 *     silently fires the button underneath is worse than an overlap.
 *
 * The geometry is pure and lives here so it can be tested without a DOM; the
 * one DOM-reading function is `collectBlockers`, and it uses the same
 * predicate as the regression test (`elementsFromPoint`) so search and proof
 * cannot drift apart.
 */

/** What counts as "a tap that could be stolen". Wider than the button/a/input
 *  the finding used, so the search can never be narrower than the check. */
export const INTERACTIVE_SELECTOR =
  'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [contenteditable="true"]'

/** Breathing room between the pill and the control it rests on. Purely so the
 *  rest position reads as deliberate rather than as a near miss. */
export const CLEARANCE_GAP = 6

/** Don't re-seat the pill for a difference this small — a control that shifts
 *  a few pixels between two rests should not make the pill twitch. */
export const CLEARANCE_HOLD = 24

/**
 * Does the pill, lifted by `d`, hold any blocked band?
 * @param {{top:number,bottom:number}[]} blockers
 */
function clearAt(top, bottom, blockers, d) {
  const t = top - d
  const b = bottom - d
  for (const bl of blockers) {
    if (bl.top < b && bl.bottom > t) return false
  }
  return true
}

/**
 * The offset the pill should rest at, in px above its home position.
 *
 * Candidates are not a scan: the pill becomes clear of an obstructing cluster
 * exactly when its bottom edge passes above that cluster's top edge, so the
 * only positions worth testing are home and "resting on some blocker's top
 * edge". That also quantises the result onto a visible shelf instead of an
 * arbitrary pixel, which is what makes the rest position legible.
 *
 * @param {object} o
 * @param {number} o.top      pill top in viewport px, at home
 * @param {number} o.bottom   pill bottom in viewport px, at home
 * @param {{top:number,bottom:number}[]} o.blockers
 * @param {number} o.maxLift  never climb further than this
 * @param {number} [o.currentLift] where it is resting now (hysteresis)
 * @returns {number|null} px to lift, or null when nothing within reach is clear
 */
export function chooseLift({
  top,
  bottom,
  blockers,
  maxLift,
  currentLift = 0,
  gap = CLEARANCE_GAP,
  hold = CLEARANCE_HOLD,
}) {
  const candidates = [0]
  for (const bl of blockers) {
    const d = bottom - bl.top + gap
    if (d > 0 && d <= maxLift) candidates.push(Math.round(d))
  }
  candidates.sort((a, b) => a - b)

  let min = null
  for (const d of candidates) {
    if (clearAt(top, bottom, blockers, d)) {
      min = d
      break
    }
  }
  if (min === null) return null

  // Home whenever home is honest — the pill belongs at the bottom right, and
  // every frame it spends elsewhere is a frame the user has to look for it.
  if (min === 0) return 0

  // Otherwise prefer where it already is, so a page whose rows shift slightly
  // between two rests does not make the pill hop between two near-identical
  // shelves.
  if (
    currentLift > 0 &&
    currentLift <= maxLift &&
    Math.abs(currentLift - min) <= hold &&
    clearAt(top, bottom, blockers, currentLift)
  ) {
    return currentLift
  }
  return min
}

/**
 * The interactive rows that overlap the pill's column within climbing reach.
 *
 * Two passes on purpose. A rect test is cheap but too generous — it counts
 * elements that are clipped away by an ancestor's overflow, or made
 * pointer-transparent, neither of which can actually take a tap. So every
 * survivor is confirmed with `elementsFromPoint`, which is the same hit test
 * the browser runs on touch and the same one the regression test asserts on.
 *
 * @param {Element} fab
 * @param {{left:number,right:number,top:number,bottom:number,maxLift:number}} column
 * @returns {{top:number,bottom:number}[]}
 */
export function collectBlockers(fab, column) {
  const doc = fab.ownerDocument
  const win = doc.defaultView
  if (!win) return []
  const bandTop = column.top - column.maxLift
  const out = []

  for (const el of doc.querySelectorAll(INTERACTIVE_SELECTOR)) {
    if (el === fab || fab.contains(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (r.right <= column.left || r.left >= column.right) continue
    if (r.bottom <= bandTop || r.top >= column.bottom) continue
    // `checkVisibility` covers display/visibility/opacity/content-visibility in
    // one call; both the old and the current option names are passed because
    // engines shipped them at different times and ignore the ones they lack.
    if (
      typeof el.checkVisibility === 'function' &&
      !el.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
        opacityProperty: true,
        visibilityProperty: true,
        contentVisibilityAuto: true,
      })
    ) {
      continue
    }

    const px = clamp(
      (Math.max(r.left, column.left) + Math.min(r.right, column.right)) / 2,
      0,
      win.innerWidth - 1
    )
    const py = clamp(
      (Math.max(r.top, bandTop) + Math.min(r.bottom, column.bottom)) / 2,
      0,
      win.innerHeight - 1
    )
    if (!doc.elementsFromPoint(px, py).includes(el)) continue

    out.push({ top: r.top, bottom: r.bottom })
  }
  return out
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

/**
 * How far the pill may climb. Bounded so a pathologically dense page can never
 * fling it to the top of the screen and out of the thumb arc; 40% of the
 * viewport was enough for every position measured on Touchpoints, Assets and
 * Strategy (worst case needed 238px of 844).
 */
export function maxLiftFor(viewportHeight) {
  return Math.min(320, Math.round(viewportHeight * 0.4))
}
