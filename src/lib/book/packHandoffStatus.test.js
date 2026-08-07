import { describe, expect, it } from 'vitest'
import { packHandoffStatus } from '../../views/DeskView.jsx'

describe('packHandoffStatus (desk ambient A)', () => {
  it('thin pack says there is not enough to send', () => {
    expect(packHandoffStatus({ thin: true, pathFull: false })).toBe(
      'Not enough here to send yet'
    )
    expect(packHandoffStatus({ thin: true, pathFull: true })).toBe(
      'Not enough here to send yet'
    )
  })

  it('core but path incomplete has the basics', () => {
    expect(packHandoffStatus({ thin: false, pathFull: false })).toBe(
      'Has the basics, not ready to send'
    )
  })

  it('path full and not thin is ready', () => {
    expect(packHandoffStatus({ thin: false, pathFull: true })).toBe(
      'Ready to send to the client'
    )
  })

  it('never uses shame or version numbers', () => {
    const lines = [
      packHandoffStatus({ thin: true, pathFull: false }),
      packHandoffStatus({ thin: false, pathFull: false }),
      packHandoffStatus({ thin: false, pathFull: true }),
    ]
    for (const line of lines) {
      expect(line).not.toMatch(/you|incomplete|behind|v\d|%/i)
    }
  })

  /* The old assertion was `startsWith('Pack ')`, which pinned the jargon it
     was meant to police — "Pack still thin for handoff" passed a check for
     shame-free copy while being the least readable line on the screen. What
     actually matters is that these stay plain: no studio vocabulary a
     first-time reader has to be taught. */
  it('uses no studio jargon', () => {
    const lines = [
      packHandoffStatus({ thin: true, pathFull: false }),
      packHandoffStatus({ thin: false, pathFull: false }),
      packHandoffStatus({ thin: false, pathFull: true }),
    ]
    for (const line of lines) {
      expect(line).not.toMatch(/handoff|leave-behind|deliverable|\bpack\b/i)
    }
  })
})
