import { describe, it, expect } from 'vitest'
import {
  REPRESENTATION_KINDS,
  representationForSurface,
  specimenGeometry,
  applicationBrandMaterial,
  specimenHonestyLine,
} from './applicationRepresentation.js'

describe('applicationRepresentation seam', () => {
  it('defaults every surface to schematic representation', () => {
    expect(representationForSurface('businessCard')).toEqual({
      kind: REPRESENTATION_KINDS.SCHEMATIC,
      surfaceId: 'businessCard',
    })
    expect(representationForSurface('website').kind).toBe('schematic')
  })

  it('preserves surface identity separate from representation kind', () => {
    const r = representationForSurface('packaging')
    expect(r.surfaceId).toBe('packaging')
    expect(r.kind).toBe('schematic')
  })

  it('exposes natural geometry for craft judgment', () => {
    expect(specimenGeometry('businessCard').aspect).toMatch(/3\.5/)
    expect(specimenGeometry('businessCard').frame).toBe('card')
    expect(specimenGeometry('app').frame).toBe('phone')
    expect(specimenGeometry('unknown-surface').frame).toBe('sheet')
  })

  it('honesty line never claims production or verification', () => {
    const line = specimenHonestyLine('businessCard')
    expect(line).toMatch(/Schematic/i)
    expect(line).toMatch(/not a produced file/i)
    expect(line).not.toMatch(/verified|shipped|package ready|approved file/i)
  })

  it('reads identity material without inventing writers', () => {
    const m = applicationBrandMaterial(
      {
        logoWordmark: 'Field Notes',
        tagline: 'Creative partner',
        colorRoles: { cover: '#123456', accent: '#AABBCC', quiet: '#F0F0F0' },
        typeHeading: 'Inter Bold',
        typeBody: 'Inter Regular',
        contacts: [{ name: 'Alex', title: 'Director', phone: '555', email: 'a@b.c' }],
      },
      ['#123456', '#AABBCC', '#888888', '#F0F0F0']
    )
    expect(m.name).toBe('Field Notes')
    expect(m.tag).toBe('Creative partner')
    expect(m.cover).toBe('#123456')
    expect(m.contact.name).toBe('Alex')
    expect(m.headingFont).toMatch(/Inter/i)
  })
})
