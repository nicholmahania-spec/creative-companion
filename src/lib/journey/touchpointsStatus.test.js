import { describe, it, expect } from 'vitest'
import { touchpointsStatusLine } from '../../views/SketchView.jsx'

describe('touchpointsStatusLine — evidence only, not completion', () => {
  it('names empty brief state', () => {
    expect(
      touchpointsStatusLine({
        hasBriefSurfaces: false,
        apps: [],
        proofs: {},
      })
    ).toBe('No surfaces yet')
  })

  it('names surfaces with evidence without calling them checked or complete', () => {
    const line = touchpointsStatusLine({
      hasBriefSurfaces: true,
      apps: ['website', 'social', 'print'],
      proofs: { website: { note: 'Hero wordmark' } },
    })
    expect(line).toMatch(/Evidence on Website/i)
    expect(line).not.toMatch(/checked|complete|enough for the path/i)
    expect(line).not.toMatch(/\d+\s+of\s+\d+/)
  })

  it('says evidence on every surface when each has a record', () => {
    expect(
      touchpointsStatusLine({
        hasBriefSurfaces: true,
        apps: ['website', 'social'],
        proofs: {
          website: { done: true },
          social: { note: 'Grid' },
        },
      })
    ).toBe('Evidence on every surface')
  })

  it('counts a colour sample as evidence', () => {
    expect(
      touchpointsStatusLine({
        hasBriefSurfaces: true,
        apps: ['print', 'social'],
        proofs: {
          print: { check: { readable: true, colours: [] } },
        },
      })
    ).toBe('Evidence on Print')
  })

  it('says nothing recorded when only empty rows exist', () => {
    expect(
      touchpointsStatusLine({
        hasBriefSurfaces: true,
        apps: ['website'],
        proofs: { website: {} },
      })
    ).toBe('Nothing recorded yet')
  })
})
