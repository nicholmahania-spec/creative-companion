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
 * WHAT THIS CANNOT DO, stated plainly because it is a property of the problem
 * and not of this code. A stable seat and a clear seat are the same thing only
 * if some region of the viewport is reserved from the page — and reserving one
 * is the option the owner rejected. So on a surface whose column really is
 * tiled with live controls, `chooseLift` returns null and the pill goes home
 * and overlaps. Across 147 rest positions on Touchpoints, Assets and Strategy
 * that never happened; it is a fallback, not a plan.
 *
 * The geometry is pure and lives here so it can be tested without a DOM; the
 * one DOM-reading function is `collectBlockers`, and it asks the same question
 * as e2e/todo-fab-clearance.spec.js, so search and proof cannot drift apart.
 */

/** What counts as "a tap that could be stolen". Wider than the button/a/input
 *  the finding used, so the search can never be narrower than the check. */
export const INTERACTIVE_SELECTOR =
  'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [contenteditable="true"]'

/** Breathing room between the pill and the control it rests on. Purely so the
 *  rest position reads as deliberate rather than as a near miss. */
export const CLEARANCE_GAP = 6

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

  /* Otherwise stay put for as long as that is still honest, and this is the
     single most important line here. "Always take the lowest clear seat" looks
     obviously right and behaves terribly: a control drifting up the column
     drags the pill with it, because the lowest clear seat is always just above
     that control and rises by exactly the scroll delta. Walked down Strategy in
     60px steps the pill took 44 positions in 80 stops and moved 286px in one
     go. Holding a seat until it is actually taken cuts that to a handful of
     moves — the pill steps aside once, then lets the page slide past under it. */
  if (
    currentLift > 0 &&
    currentLift <= maxLift &&
    clearAt(top, bottom, blockers, currentLift)
  ) {
    return currentLift
  }
  return min
}

/**
 * What would take the tap at this point if the pill were not there.
 *
 * This is the predicate the whole mechanism turns on, and the obvious version
 * of it is wrong. "Is there an interactive element under the pill" — which is
 * what `elementsFromPoint(...).some(isInteractive)` asks — is not the same
 * question as "can the pill steal a tap", because `elementsFromPoint` returns
 * the entire stack, including elements that some *third* element already
 * covers. Measured on the brief form: `.define-brief-footer` is
 * `position: sticky; z-index: 5` with an opaque background, and live inputs
 * scroll behind it. The stack test called those a collision; they are not
 * reachable by a finger at all, with or without the pill, so there is nothing
 * there to steal. Chasing them drove the pill 286px up a page where it was
 * already sitting somewhere honest.
 *
 * So: take the topmost element that is not the pill, and ask what control
 * would receive its click. `closest()` because a tap on the label inside a
 * button is a tap on the button.
 */
function tapOwnerAt(doc, fab, x, y) {
  const stack = doc.elementsFromPoint(x, y)
  const top = stack.find((el) => el !== fab && !fab.contains(el))
  return top ? top.closest(INTERACTIVE_SELECTOR) : null
}

/**
 * The controls that would take a tap anywhere in the pill's column, within
 * climbing reach of home.
 *
 * Two passes. A rect sweep over the interactive elements is cheap (measured at
 * 0.1–0.5ms for the 49–74 candidates a real view carries) and narrows the
 * field; each survivor is then hit-tested with `tapOwnerAt`, which is the only
 * thing that gets a vote.
 *
 * The hit test walks a grid across each candidate rather than sampling a
 * couple of points, and that is not belt-and-braces either. Three points
 * missed a full-width `Add` button on Touchpoints by about a pixel: the
 * sticky continue row covers its lower half, so two of the three probes
 * returned the row, and the third landed exactly on the row's top border.
 * The pill then seated itself 11px into a live primary. Sampling has to be
 * fine enough that "covered here" cannot be mistaken for "covered".
 *
 * What is recorded is the OWNER's rect, not the candidate's — the owner is the
 * thing a finger would actually land on, so it is the thing the pill has to
 * stay off.
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
  const owners = new Set()
  const out = []

  const record = (owner) => {
    if (!owner || owners.has(owner)) return false
    owners.add(owner)
    const or = owner.getBoundingClientRect()
    out.push({ top: or.top, bottom: or.bottom })
    return true
  }

  for (const el of doc.querySelectorAll(INTERACTIVE_SELECTOR)) {
    if (el === fab || fab.contains(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (r.right <= column.left || r.left >= column.right) continue
    if (r.bottom <= bandTop || r.top >= column.bottom) continue

    const x0 = Math.max(r.left, column.left)
    const x1 = Math.min(r.right, column.right)
    const y0 = Math.max(r.top, bandTop)
    const y1 = Math.min(r.bottom, column.bottom)
    // ~6px vertical resolution, capped so a very tall candidate cannot turn
    // this into a scan of the whole page.
    const rows = Math.min(16, Math.max(2, Math.ceil((y1 - y0) / 6) + 1))
    let found = false
    for (let i = 0; i < rows && !found; i++) {
      const py = clamp(y0 + ((y1 - y0) * i) / (rows - 1), 0, win.innerHeight - 1)
      for (const f of [0.5, 0.15, 0.85]) {
        const px = clamp(x0 + (x1 - x0) * f, 0, win.innerWidth - 1)
        const owner = tapOwnerAt(doc, fab, px, py)
        record(owner)
        // The candidate itself owns a pixel here: nothing more to learn from
        // it, and this is the ordinary case, so the grid usually costs one probe.
        if (owner === el) found = true
      }
    }
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
