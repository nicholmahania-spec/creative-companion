/**
 * The "What's next" card carries ONE button. It may never carry two.
 *
 * This card is read at the coldest moment the app has — a project opened days
 * later, by someone for whom starting is the expensive part. Its entire job is
 * to make beginning a single unconsidered act.
 *
 * It used to offer three controls of near-equal weight: `Open {stage}`,
 * `Mark done`, `Not needed`. Two of those are administrative. Sitting them
 * beside the work action asks the reader to first classify the stage — is this
 * a thing I do, a thing I already did, or a thing I skip? — before they are
 * allowed to do any of it. That classification is the tax, not the clicking.
 *
 * WHAT THIS TEST IS REALLY DEFENDING. The card is the app's scarcest real
 * estate and every future phase will want a slot on it. That pressure is
 * reasonable each time and ruinous cumulatively, which is exactly the shape of
 * problem a comment cannot hold and a test can.
 *
 * TWO BECAME ONE (2026-08-08, owner). This file used to argue that both
 * administrative links had to stay because the card was their only route in.
 * That was an argument about the CODE, not the product, and the owner said
 * so: "an implementation dependency is not proof that those controls belong."
 *
 * Traced properly, the two were not the same thing:
 *
 *   `toggleStepNotNeeded` wrote `stepsNotNeeded`, a field read by exactly one
 *   file — DeskView — whose only job was pruning the rail's "upcoming stops"
 *   leftovers list. That list is gone (all five workspaces are always shown
 *   now), so the field had nothing left to prune. It was an acknowledgement
 *   invented to maintain a to-do the Desk should not have kept. Deleted, with
 *   its store action and its prop.
 *
 *   `setStepDone` writes `pathDone`, which feeds `pathStepHasContent` and so
 *   decides WHICH STOP THE APP SUGGESTS NEXT. Every condition behind that is
 *   a proxy — Identity reads craft signals, Touchpoints reads
 *   `touchpointApps` — so a mark drawn in Illustrator or a stage signed off
 *   on the phone is invisible, and without a correction the wrong stop stays
 *   "next" forever. Real project state. It stays, as one quiet link, worded
 *   as a correction to the suggestion rather than as a completion tick.
 *
 * HOW TO SATISFY THIS TEST when it fails on you: your new action almost
 * certainly belongs in `.desk-card-aside` as a link, or on the stage page
 * itself. If you genuinely believe it deserves the primary slot, then
 * something else has to lose it — the card's contract is one, not "one plus
 * whatever was most recently important".
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const src = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../views/DeskView.jsx'),
  'utf8'
)

/** The `.desk-card` block: from the gap card open to the actions closing. */
function gapCardBlock() {
  const start = src.indexOf('className="desk-card"')
  expect(start, 'the desk gap card moved or was renamed').toBeGreaterThan(-1)
  const end = src.indexOf('desk-resume', start)
  expect(end, 'could not find the end of the gap card').toBeGreaterThan(start)
  return src.slice(start, end)
}

describe("the What's next card offers one button", () => {
  const block = gapCardBlock()

  it('renders exactly one `btn` class inside the gap card', () => {
    /* Counts the className strings rather than the buttons, because the thing
       that costs the reader is VISUAL WEIGHT, not the element name. A `btn`
       is a filled control that competes for the eye; a bare <button> styled
       as a link does not. */
    const btns = block.match(/className="btn\b[^"]*"/g) || []
    expect(btns, `found: ${btns.join(', ')}`).toHaveLength(1)
  })

  it('the one button is the primary, and it opens the work', () => {
    expect(block).toMatch(/className="btn btn-primary"/)
    expect(block).toMatch(/onOpenView\(gapRow\.view\)/)
  })

  /* The card's FACE is not a second door. `.desk-card-hit` made the whole
     face a button pointing at the same destination as the primary below it —
     a third `onOpenView(gapRow.view)` target on a screen that already had two.
     Removed 2026-08-16; this is what stops it coming back, because the `btn`
     count above would not catch it (it carried no `btn` class). */
  it('does not make the card face a competing interactive target', () => {
    /* The className, not the bare word — the source comment above the face
       names `.desk-card-hit` to say why it is gone, and this file reads raw
       source. What must never come back is the attribute. */
    expect(block).not.toMatch(/className="desk-card-hit"/)
    const opens = block.match(/onOpenView\(gapRow\.view\)/g) || []
    expect(opens, `found ${opens.length} openers in the card`).toHaveLength(1)
  })

  it('carries no secondary or ghost button', () => {
    // These are the two the card actually shipped with, so they are named
    // rather than caught by a general pattern — a regression here will most
    // likely be a straight revert.
    expect(block).not.toMatch(/btn-secondary/)
    expect(block).not.toMatch(/btn-ghost/)
  })
})

describe('the gap suggestion can be corrected, exactly once over', () => {
  const block = gapCardBlock()

  it('keeps the correction that stops the wrong stop being suggested forever', () => {
    expect(block).toMatch(/onMarkStepDone\(gapRow\.id, true\)/)
  })

  it('offers it as a quiet link, and only one of them', () => {
    /* One, not two. A second administrative link is what made the card ask
       the reader to classify the stage before doing any of it. */
    const links = block.match(/className="desk-card-aside-link"/g) || []
    expect(links).toHaveLength(1)
  })

  it('words it as a correction, not as a completion tick', () => {
    // "Already done" read as the interface asking to be acknowledged. What
    // the control actually does is tell the app its suggestion is wrong.
    expect(block).not.toMatch(/Already done/)
    expect(block).toMatch(/Not next/)
  })

  it('has retired the skip control and its state entirely', () => {
    expect(block).not.toMatch(/onToggleNotNeeded/)
    expect(block).not.toMatch(/Skip this one/)
    const store = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../store/useAppStore.js'),
      'utf8'
    )
    // No action, and no writer for the field it maintained.
    expect(store).not.toMatch(/toggleStepNotNeeded: \(/)
    expect(store).not.toMatch(/stepsNotNeeded:\s*cur/)
  })

  it('still has exactly one route to setStepDone', () => {
    const outlet = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../app/MainOutlet.jsx'),
      'utf8'
    )
    const callers = (outlet.match(/setStepDone/g) || []).length
    expect(callers).toBe(1)
  })
})

describe('the Desk is not a checklist', () => {
  /* The scaffolding the 2026-08-08 audit classified as dashboard-only. Each
     of these was derived state whose sole consumer was a list of things the
     app wanted acknowledged. Named individually so a revert is loud. */
  for (const gone of [
    'upcomingStops',
    'doneStops',
    'skippedStops',
    'stepsNotNeeded',
    'progressLabel',
  ]) {
    it(`has no ${gone}`, () => {
      expect(src).not.toMatch(new RegExp(`\\b${gone}\\b`))
    })
  }

  it('shows all five workspaces, not the ones left over', () => {
    expect(src).toMatch(/stopCards/)
    expect(src).toMatch(/rows\.map/)
  })
})
