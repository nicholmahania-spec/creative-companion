import { describe, expect, it } from 'vitest'
import {
  colourDraftSeed,
  isColourDraftMode,
  draftReplaceAt,
  draftAddHex,
  draftRemoveAt,
  draftDiffersFromProject,
} from './identityColourDraft'

const working = (colour) => ({
  directionId: 'a',
  colour: colour || { source: 'none', hexes: [], roles: null },
})

describe('colourDraftSeed', () => {
  it('is inactive without a direction', () => {
    const s = colourDraftSeed(null)
    expect(s.active).toBe(false)
    expect(isColourDraftMode(s)).toBe(false)
  })

  it('seeds from evidence hexes, not factory palette', () => {
    const s = colourDraftSeed(
      working({ source: 'evidence', hexes: ['#E11D48', '#65A30D'], roles: null })
    )
    expect(s.active).toBe(true)
    expect(s.source).toBe('evidence')
    expect(s.hexes).toEqual(['#E11D48', '#65A30D'])
  })

  it('seeds from palette ref hexes', () => {
    const s = colourDraftSeed(
      working({ source: 'ref', hexes: ['#F26B21', '#FFF4E6'], roles: { cover: '#F26B21' } })
    )
    expect(s.source).toBe('ref')
    expect(s.hexes).toEqual(['#F26B21', '#FFF4E6'])
  })

  it('starts empty when the route has no colour (factory is not the draft)', () => {
    const s = colourDraftSeed(working({ source: 'none', hexes: [] }))
    expect(s.source).toBe('none')
    expect(s.hexes).toEqual([])
  })
})

describe('draft edits', () => {
  it('replaces, adds, removes without inventing roles', () => {
    let h = ['#E11D48', '#65A30D']
    h = draftReplaceAt(h, 0, '#111111')
    expect(h[0]).toBe('#111111')
    h = draftAddHex(h, '#FAFAF9')
    expect(h).toHaveLength(3)
    h = draftRemoveAt(h, 1)
    expect(h).toEqual(['#111111', '#FAFAF9'])
  })

  it('detects difference from project palette', () => {
    expect(draftDiffersFromProject(['#E11D48'], ['#1C1917', '#0F766E'])).toBe(
      true
    )
    expect(draftDiffersFromProject(['#1C1917'], ['#1C1917'])).toBe(false)
  })
})
