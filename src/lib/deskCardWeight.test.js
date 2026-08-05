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
 * WHY THE OTHER TWO ARE STILL ON SCREEN, and why deleting them would be a bug
 * rather than a simplification: this card is the ONLY route in the entire app
 * to marking a step done or declining it. `setStepDone` and
 * `toggleStepNotNeeded` have no other caller — `MainOutlet.jsx` merely wires
 * them into this card. The gap card is also never empty, so removing them
 * would strand an unwanted stop permanently on the cold-start surface with no
 * way to clear it: a worse failure than the one being fixed, and a silent one.
 * Stage-page `Mark done` is not the escape hatch either — it was built and
 * then deliberately removed (a056d3d: "mark done stays on desk").
 *
 * So they stay, demoted to text links. Weight does the work that deletion
 * would have done, without taking a capability away.
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

  it('carries no secondary or ghost button', () => {
    // These are the two the card actually shipped with, so they are named
    // rather than caught by a general pattern — a regression here will most
    // likely be a straight revert.
    expect(block).not.toMatch(/btn-secondary/)
    expect(block).not.toMatch(/btn-ghost/)
  })
})

describe('done and declined stay reachable', () => {
  const block = gapCardBlock()

  /* The failure this guards is the plausible over-correction: reading the
     rule above as "delete the other two" and shipping a card that cannot be
     cleared. Both halves have to hold at once, so both are asserted. */
  it('still offers both administrative actions', () => {
    expect(block).toMatch(/onMarkStepDone\(gapRow\.id, true\)/)
    expect(block).toMatch(/onToggleNotNeeded\(gapRow\.id\)/)
  })

  it('offers them as quiet links, not as buttons', () => {
    const links = block.match(/className="desk-card-aside-link"/g) || []
    expect(links).toHaveLength(2)
  })

  it('has no other route to them, which is why they cannot be deleted here', () => {
    /* If someone ever DOES add a stage-page affordance, this test will fail
       and should be updated deliberately — at which point stripping the card
       further becomes a real option rather than a data-loss bug. Reversing
       a056d3d is a decision, not a refactor. */
    const outlet = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../app/MainOutlet.jsx'),
      'utf8'
    )
    const callers = (outlet.match(/toggleStepNotNeeded|setStepDone/g) || [])
      .length
    // Exactly the two wirings that feed this card, and nothing else.
    expect(callers).toBe(2)
  })
})
