import { describe, expect, it } from 'vitest'
import {
  versionIdentityPreview,
  versionKindFromChangeType,
  versionKindLabel,
} from './versionService'

describe('version history previews', () => {
  it('builds a glanceable title and palette from snapshot data', () => {
    const p = versionIdentityPreview({
      logoWordmark: 'Harbor',
      tagline: 'Bread that waits',
      typeHeading: 'Fraunces',
      typeBody: 'Source Serif',
      palette: ['#1a1a1a', { hex: '#c4a574' }, 'nope'],
    })
    expect(p.title).toBe('Harbor')
    expect(p.lines.some((l) => l.includes('Bread'))).toBe(true)
    expect(p.palette).toEqual(['#1a1a1a', '#c4a574'])
  })

  it('labels kinds without clocks', () => {
    expect(versionKindFromChangeType('hourly')).toBe('hourly')
    expect(versionKindFromChangeType('version bump')).toBe('bump')
    expect(versionKindLabel('hourly')).toBe('Hourly save')
    expect(versionKindLabel('bump')).toBe('Named save')
    expect(versionKindLabel('hourly')).not.toMatch(/\d{1,2}:\d{2}/)
  })

  it('empty identity still has a title, not blank cards', () => {
    expect(versionIdentityPreview({}).title).toBe('Empty identity')
  })
})
