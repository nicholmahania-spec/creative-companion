import { describe, it, expect } from 'vitest'
import { touchpointsStatusLine } from '../views/SketchView.jsx'

describe('touchpointsStatusLine — words, not N of M', () => {
  it('names empty brief state', () => {
    expect(
      touchpointsStatusLine({
        hasBriefSurfaces: false,
        apps: [],
        proofs: {},
      })
    ).toBe('No surfaces yet')
  })

  it('does not use digit counts when some are open', () => {
    const line = touchpointsStatusLine({
      hasBriefSurfaces: true,
      apps: ['website', 'social', 'print'],
      proofs: { website: { note: 'Hero wordmark' } },
    })
    expect(line).toMatch(/Website noted/i)
    expect(line).toMatch(/enough for the path/i)
    expect(line).not.toMatch(/\d+\s+of\s+\d+/)
  })

  it('says all noted when every app is ready', () => {
    expect(
      touchpointsStatusLine({
        hasBriefSurfaces: true,
        apps: ['website', 'social'],
        proofs: {
          website: { done: true },
          social: { note: 'Grid' },
        },
      })
    ).toBe('All applications noted')
  })
})
