/**
 * The one line on the Delivery screen that makes a claim about shipping.
 *
 * A module rather than an export off the view, for two reasons: a view that
 * exports a non-component costs a `react-refresh/only-export-components` error
 * against a budget that is only allowed to move down, and this is not really
 * view logic — it is the sentence the delivery contract is entitled to say,
 * which is worth being able to test without mounting a screen.
 *
 * IT CALCULATES NOTHING. Every input is read off the `packReadiness` result.
 * There is exactly one readiness authority in this app — `packReadiness`, which
 * consults `deliverableChecklist`, which consults `packagePlan` — and a second
 * one living in a status line is how two surfaces start disagreeing about
 * whether a job can ship.
 */

/**
 * WHY A DELIVERABLE GAP OUTRANKS THE REST.
 *
 * `packReadiness` learned to consult `deliverableChecklist`, so `allDone` is
 * already false when the client cannot be given something they bought. But the
 * fall-through then landed on "Preview the book, then download" — the screen
 * stopped claiming ready and said nothing about why, while the package panel a
 * few inches below named the missing item precisely. A status line that goes
 * quiet at the moment it finally has something to report is worse than one that
 * never spoke: it reads as approval.
 *
 * It NAMES the item and never counts them. `deliverableGaps` carries the
 * checklist rows whole, so the noun here is the same noun the panel prints, and
 * a second phrasing for one fact is how the two screens drift.
 *
 * @param {object} ready              packReadiness(pack)
 * @param {object|null} firstCoreGap  first unfilled core check, if any
 * @param {number} gapCount           how many checks are unfilled at all
 * @returns {string}
 */
export function deliverStatusLine(ready, firstCoreGap, gapCount) {
  if (ready?.allDone) return 'Ready to ship'
  const missing = (ready?.deliverableGaps || [])[0]
  if (missing) return `Not in the package yet · ${missing.label}`
  if (firstCoreGap) return `Still to add · ${firstCoreGap.label}`
  if (gapCount > 0) return 'Add a handoff note when you ship'
  return 'Preview the book, then download'
}
