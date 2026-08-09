import { describe, expect, it } from 'vitest'
import { refKey, makeRef } from '../artifacts/artifactRef'
import {
  PREVIEW_RUNG_IDS,
  directionPreview,
} from './directionPreview'

/**
 * DISPLAY ONLY. These pin the resolution rules: refs win, evidence fills
 * gaps, nothing is invented, and the live Identity palette/type are not
 * silently borrowed so three routes stay comparable on their own material.
 */

const sampleColorKey = (hex) =>
  refKey(makeRef('sample', `color:${hex.replace('#', '').toLowerCase()}`))
const sampleTypeKey = (familyId, weight) =>
  refKey(makeRef('sample', `type:${familyId}:${weight}`))

const projectBase = (over = {}) => ({
  id: 'p1',
  name: 'Internal job',
  tagline: 'Same tagline on every route',
  typeHeading: 'Should Not Appear Unreferenced',
  typeBody: 'Should Not Appear Unreferenced Body',
  palette: ['#FF0000', '#00FF00', '#0000FF'],
  detective: { clientName: 'Harbor Co' },
  logoConcepts: [
    { id: 'm1', label: 'Mark One', image: 'data:image/png;base64,AAA' },
  ],
  artifacts: {
    pal_warm: {
      id: 'pal_warm',
      kind: 'palette',
      hexes: ['#F26B21', '#FFF4E6'],
    },
    pal_cool: {
      id: 'pal_cool',
      kind: 'palette',
      hexes: ['#0F766E', '#F0FDFA'],
    },
    type_a: {
      id: 'type_a',
      kind: 'typePairing',
      heading: 'Fraunces SemiBold',
      body: 'Plus Jakarta Sans Regular',
    },
    type_b: {
      id: 'type_b',
      kind: 'typePairing',
      heading: 'IBM Plex Mono Bold',
      body: 'IBM Plex Sans Regular',
    },
  },
  ...over,
})

const direction = (over = {}) => ({
  id: 'a',
  title: '',
  note: '',
  chosen: false,
  refs: {},
  evidence: [],
  ...over,
})

describe('directionPreview rungs', () => {
  it('exposes display and body only — not the full type bench', () => {
    expect([...PREVIEW_RUNG_IDS]).toEqual(['display', 'body'])
    const p = directionPreview(projectBase(), direction())
    expect(p.rungs.map((r) => r.id)).toEqual(['display', 'body'])
    expect(p.rungs[0].px).toBe(44)
    expect(p.rungs[1].px).toBe(16)
  })
})

describe('palette resolution', () => {
  it('uses the palette ref when set', () => {
    const p = directionPreview(
      projectBase(),
      direction({
        refs: { palette: refKey(makeRef('palette', 'pal_warm')) },
      })
    )
    expect(p.sources.palette).toBe('ref')
    expect(p.hexes).toEqual(['#F26B21', '#FFF4E6'])
    expect(p.paper).toBeTruthy()
    expect(p.ink).toBeTruthy()
    expect(p.paper).not.toBe(p.ink)
  })

  it('falls back to cited colour samples when the palette ref is unset', () => {
    const hex = '#B45309'
    const p = directionPreview(
      projectBase(),
      direction({ evidence: [sampleColorKey(hex)] }),
      { moodItems: [] }
    )
    expect(p.sources.palette).toBe('evidence')
    expect(p.hexes).toContain('#B45309')
  })

  it('does not borrow the project Identity palette when the route has none', () => {
    const p = directionPreview(projectBase(), direction())
    expect(p.sources.palette).toBe('none')
    expect(p.hexes).toEqual([])
    /* mapPaletteRoles([]) still yields a neutral paper — not #FF0000. */
    expect(p.hexes).not.toContain('#FF0000')
    expect(p.paper.toUpperCase()).not.toBe('#FF0000')
  })

  it('gives two routes different papers when their palettes differ', () => {
    const a = directionPreview(
      projectBase(),
      direction({
        id: 'a',
        refs: { palette: refKey(makeRef('palette', 'pal_warm')) },
      })
    )
    const b = directionPreview(
      projectBase(),
      direction({
        id: 'b',
        refs: { palette: refKey(makeRef('palette', 'pal_cool')) },
      })
    )
    expect(a.paper).not.toBe(b.paper)
  })
})

describe('type resolution', () => {
  it('uses the typePairing ref when set', () => {
    const p = directionPreview(
      projectBase(),
      direction({
        refs: { typePairing: refKey(makeRef('typePairing', 'type_a')) },
      })
    )
    expect(p.sources.type).toBe('ref')
    expect(p.rungs[0].faceLabel).toBe('Fraunces SemiBold')
    expect(p.rungs[1].faceLabel).toBe('Plus Jakarta Sans Regular')
    expect(p.rungs[0].face).toBe('heading')
    expect(p.rungs[1].face).toBe('body')
  })

  it('falls back to cited type samples when the type ref is unset', () => {
    /* fraunces and jakarta exist in the font catalog / sample registry. */
    const p = directionPreview(
      projectBase(),
      direction({
        evidence: [
          sampleTypeKey('fraunces', 700),
          sampleTypeKey('jakarta', 400),
        ],
      }),
      { moodItems: [] }
    )
    expect(p.sources.type).toBe('evidence')
    expect(p.rungs[0].faceLabel.toLowerCase()).toMatch(/fraunces/)
    expect(p.rungs[1].faceLabel.toLowerCase()).toMatch(/jakarta/)
  })

  it('does not borrow the project Identity pairing when the route has none', () => {
    const p = directionPreview(projectBase(), direction())
    expect(p.sources.type).toBe('none')
    expect(p.rungs[0].faceLabel).not.toBe('Should Not Appear Unreferenced')
    expect(p.rungs[1].faceLabel).not.toBe(
      'Should Not Appear Unreferenced Body'
    )
  })
})

describe('shared words and the route name', () => {
  it('uses the same tagline text on every route', () => {
    const proj = projectBase()
    const a = directionPreview(
      proj,
      direction({
        id: 'a',
        refs: { typePairing: refKey(makeRef('typePairing', 'type_a')) },
      })
    )
    const b = directionPreview(
      proj,
      direction({
        id: 'b',
        refs: { typePairing: refKey(makeRef('typePairing', 'type_b')) },
      })
    )
    /* Second rung is body-sized but carries the shared tagline text. */
    const tagA = a.rungs.find((r) => r.id === 'body').text
    const tagB = b.rungs.find((r) => r.id === 'body').text
    expect(tagA).toBe('Same tagline on every route')
    expect(tagB).toBe(tagA)
  })

  it('puts the route title on the display rung when named', () => {
    const p = directionPreview(
      projectBase(),
      direction({ title: 'Loud grotesk' })
    )
    expect(p.title).toBe('Loud grotesk')
    expect(p.rungs[0].text).toBe('Loud grotesk')
    expect(p.rungs[0].own).toBe(true)
  })

  it('does not invent a creative name when the title is empty', () => {
    const p = directionPreview(projectBase(), direction({ title: '' }))
    expect(p.title).toBe('')
    /* Falls through to client name from the brief — a real project fact. */
    expect(p.rungs[0].text).toBe('Harbor Co')
  })
})

describe('mark', () => {
  it('resolves the mark ref and nothing else', () => {
    const withMark = directionPreview(
      projectBase(),
      direction({
        refs: { mark: refKey(makeRef('markConcept', 'm1')) },
      })
    )
    expect(withMark.mark?.id).toBe('m1')
    expect(withMark.mark?.image).toMatch(/^data:/)

    const without = directionPreview(projectBase(), direction())
    expect(without.mark).toBeNull()
  })
})

describe('purity', () => {
  it('does not mutate the direction or project', () => {
    const proj = projectBase()
    const dir = direction({
      refs: { palette: refKey(makeRef('palette', 'pal_warm')) },
      evidence: [sampleColorKey('#0F766E')],
    })
    const projSnap = JSON.stringify(proj)
    const dirSnap = JSON.stringify(dir)
    directionPreview(proj, dir, { moodItems: [] })
    expect(JSON.stringify(proj)).toBe(projSnap)
    expect(JSON.stringify(dir)).toBe(dirSnap)
  })
})
