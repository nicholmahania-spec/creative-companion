import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { packHandoffStatus } from '../../views/DeskView.jsx'

/* The copy assertions below are unchanged; they now read `.line` because the
   function returns the state alongside the words. See the `ready` block at the
   bottom for why that shape exists. */
const line = (args) => packHandoffStatus(args).line

describe('packHandoffStatus (desk ambient A)', () => {
  it('thin pack says there is not enough to send', () => {
    expect(line({ thin: true, pathFull: false })).toBe(
      'Not enough here to send yet'
    )
    expect(line({ thin: true, pathFull: true })).toBe(
      'Not enough here to send yet'
    )
  })

  it('core but path incomplete has the basics', () => {
    expect(line({ thin: false, pathFull: false })).toBe(
      'Has the basics, not ready to send'
    )
  })

  it('path full and not thin is ready', () => {
    expect(line({ thin: false, pathFull: true })).toBe(
      'Ready to send to the client'
    )
  })

  it('never uses shame or version numbers', () => {
    const lines = [
      line({ thin: true, pathFull: false }),
      line({ thin: false, pathFull: false }),
      line({ thin: false, pathFull: true }),
    ]
    for (const text of lines) {
      expect(text).not.toMatch(/you|incomplete|behind|v\d|%/i)
    }
  })

  /* The old assertion was `startsWith('Pack ')`, which pinned the jargon it
     was meant to police — "Pack still thin for handoff" passed a check for
     shame-free copy while being the least readable line on the screen. What
     actually matters is that these stay plain: no studio vocabulary a
     first-time reader has to be taught. */
  it('uses no studio jargon', () => {
    const lines = [
      line({ thin: true, pathFull: false }),
      line({ thin: false, pathFull: false }),
      line({ thin: false, pathFull: true }),
    ]
    for (const text of lines) {
      expect(text).not.toMatch(/handoff|leave-behind|deliverable|\bpack\b/i)
    }
  })

  /**
   * THE STATE, AND WHY IT IS NOT A STRING COMPARISON.
   *
   * DeskView gated its "Open Delivery — pack ready" button on
   * `packStatus === 'Pack ready for handoff'`. That string stopped being
   * returned when this copy was rewritten, so the comparison was permanently
   * false and the button was unreachable — on a finished project the desk
   * offered "Edit identity" instead. Nothing failed, because nothing was
   * checking that the two agreed.
   *
   * `ready` travels with the line it describes, so the two cannot drift. These
   * assertions fail if anyone reintroduces a literal-string gate.
   */
  describe('ready travels with the line', () => {
    it('is false while there is not enough to send', () => {
      expect(packHandoffStatus({ thin: true, pathFull: false }).ready).toBe(false)
      expect(packHandoffStatus({ thin: true, pathFull: true }).ready).toBe(false)
    })

    it('is false while the path is unfinished', () => {
      expect(packHandoffStatus({ thin: false, pathFull: false }).ready).toBe(false)
    })

    it('is true exactly when the line says so', () => {
      const done = packHandoffStatus({ thin: false, pathFull: true })
      expect(done.ready).toBe(true)
      expect(done.line).toBe('Ready to send to the client')
    })

    /* Exactly one of the four states may be ready. A second would mean the
       boolean had become its own authority rather than a description. */
    it('is true in one state and no other', () => {
      const all = [
        packHandoffStatus({ thin: true, pathFull: false }),
        packHandoffStatus({ thin: true, pathFull: true }),
        packHandoffStatus({ thin: false, pathFull: false }),
        packHandoffStatus({ thin: false, pathFull: true }),
      ]
      expect(all.filter((r) => r.ready)).toHaveLength(1)
      /* The stale literal must never come back as a return value. */
      expect(all.map((r) => r.line)).not.toContain('Pack ready for handoff')
    })

    /**
     * AND THE CALLER, because everything above passes with the bug present.
     *
     * The original defect was never in this function — it was in how DeskView
     * READ it. Reinstating `packStatus.line === 'Pack ready for handoff'` at
     * the call site leaves every assertion above green while the affordance
     * goes unreachable again, which is precisely the shape of failure that ran
     * unnoticed until an audit found it.
     *
     * So this reads the call site. A source assertion is the right tool here
     * because the invariant IS about the source: the desk must take the boolean
     * the function hands it and must not re-derive readiness by comparing
     * words. Same reasoning as `journeySingleSource.test.js`, which greps for
     * restated labels for the same reason.
     */
    it('the desk reads the boolean and never compares the words', () => {
      const src = readFileSync(
        new URL('../../views/DeskView.jsx', import.meta.url).pathname,
        'utf8'
      )
      /* Guards the guard — if the variable is renamed this test must be
         updated rather than silently passing against nothing. */
      expect(src).toContain('packHandoffReady')
      expect(src).toContain('packStatus.ready')
      expect(
        src,
        'the desk is comparing the status line to a string literal again — that is how the ready affordance went unreachable'
      ).not.toMatch(/packStatus(\.line)?\s*===\s*['"`]/)
      /* Comments stripped first. The stale literal is NAMED in the comment
         above `packHandoffStatus`, deliberately — the explanation of a defect
         has to be allowed to quote it. What must not come back is the literal
         as live code, where it could be assigned to a constant and compared
         against out of the regex's reach. */
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      expect(code).not.toContain('Pack ready for handoff')
    })
  })
})
