import { describe, expect, it } from 'vitest'
import { packHandoffStatus } from '../../views/DeskView.jsx'

describe('packHandoffStatus (desk ambient A)', () => {
  it('thin pack reads thin for handoff', () => {
    expect(packHandoffStatus({ thin: true, pathFull: false })).toBe(
      'Pack still thin for handoff'
    )
    expect(packHandoffStatus({ thin: true, pathFull: true })).toBe(
      'Pack still thin for handoff'
    )
  })

  it('core but path incomplete has a core', () => {
    expect(packHandoffStatus({ thin: false, pathFull: false })).toBe(
      'Pack has a core'
    )
  })

  it('path full and not thin is ready', () => {
    expect(packHandoffStatus({ thin: false, pathFull: true })).toBe(
      'Pack ready for handoff'
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
      expect(line.startsWith('Pack ')).toBe(true)
    }
  })
})
