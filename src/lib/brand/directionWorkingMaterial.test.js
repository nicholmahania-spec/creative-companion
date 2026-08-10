import { describe, expect, it } from 'vitest'
import { refKey, makeRef } from '../artifacts/artifactRef'
import {
  directionWorkingMaterial,
  activeDirectionWorkingMaterial,
  projectViewForDirectionMaterial,
} from './directionWorkingMaterial'

const projectBase = (over = {}) => ({
  id: 'p1',
  name: 'Job name',
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
  palette: ['#1C1917', '#0F766E', '#A8A29E', '#FAFAF9'],
  logoImage: '',
  logoConcepts: [
    { id: 'm1', label: 'Stamp', image: 'data:image/png;base64,AA', chosen: false },
  ],
  artifacts: {
    pal_a: {
      id: 'pal_a',
      kind: 'palette',
      hexes: ['#F26B21', '#FFF4E6'],
      roles: { cover: '#F26B21' },
    },
    type_a: {
      id: 'type_a',
      kind: 'typePairing',
      heading: 'Fraunces SemiBold',
      body: 'Plus Jakarta Sans Regular',
    },
  },
  directions: [],
  activeDirectionId: null,
  ...over,
})

const dir = (over = {}) => ({
  id: 'a',
  title: 'Warm editorial',
  note: '',
  chosen: true,
  refs: {},
  evidence: [],
  ...over,
})

describe('directionWorkingMaterial', () => {
  it('returns null without a direction', () => {
    expect(directionWorkingMaterial(projectBase(), null)).toBeNull()
  })

  it('resolves palette and type refs without inventing mark', () => {
    const d = dir({
      refs: {
        palette: refKey(makeRef('palette', 'pal_a')),
        typePairing: refKey(makeRef('typePairing', 'type_a')),
      },
    })
    const w = directionWorkingMaterial(projectBase(), d, [])
    expect(w.colour.source).toBe('ref')
    expect(w.colour.hexes).toEqual(['#F26B21', '#FFF4E6'])
    expect(w.type.source).toBe('ref')
    expect(w.type.heading).toBe('Fraunces SemiBold')
    expect(w.mark.source).toBe('none')
    expect(w.parts.mark.state).toBe('missing')
    expect(w.parts.colour.state).toBe('captured')
  })

  it('falls back to colour evidence without writing roles', () => {
    const d = dir({
      evidence: [refKey(makeRef('sample', 'color:b45309'))],
    })
    const w = directionWorkingMaterial(projectBase(), d, [])
    expect(w.colour.source).toBe('evidence')
    expect(w.colour.hexes).toContain('#B45309')
    expect(w.colour.roles).toBeNull()
    expect(w.parts.colour.state).toBe('evidence')
  })

  it('reports type sample reactions as evidence, not a pairing', () => {
    const d = dir({
      evidence: [refKey(makeRef('sample', 'type:fraunces:700'))],
    })
    const w = directionWorkingMaterial(projectBase(), d, [])
    expect(w.type.source).toBe('evidence')
    expect(w.type.heading).toBe('')
    expect(w.type.samples.length).toBeGreaterThan(0)
    expect(w.parts.type.summary).toMatch(/Sample reactions|no pairing/i)
  })

  it('resolves a mark concept ref', () => {
    const d = dir({
      refs: { mark: refKey(makeRef('markConcept', 'm1')) },
    })
    const w = directionWorkingMaterial(projectBase(), d, [])
    expect(w.mark.source).toBe('ref')
    expect(w.mark.concept.id).toBe('m1')
    expect(w.parts.mark.state).toBe('captured')
  })
})

describe('projectViewForDirectionMaterial', () => {
  it('overlays type and mark for display only; leaves palette field alone', () => {
    const p = projectBase()
    const d = dir({
      refs: {
        typePairing: refKey(makeRef('typePairing', 'type_a')),
        mark: refKey(makeRef('markConcept', 'm1')),
      },
    })
    const w = directionWorkingMaterial(p, d, [])
    const view = projectViewForDirectionMaterial(p, w)
    expect(view.typeHeading).toBe('Fraunces SemiBold')
    expect(view.logoImage).toMatch(/^data:/)
    /* Project object is not mutated; store palette untouched. */
    expect(p.typeHeading).toBe('Plus Jakarta Sans Bold')
    expect(p.logoImage).toBe('')
    expect(view.palette).toEqual(p.palette)
  })

  it('does not invent type or mark when the route lacks them', () => {
    const p = projectBase()
    const w = directionWorkingMaterial(p, dir(), [])
    const view = projectViewForDirectionMaterial(p, w)
    expect(view.typeHeading).toBe(p.typeHeading)
    expect(view.logoImage).toBe('')
  })
})

describe('activeDirectionWorkingMaterial', () => {
  it('reads activeDirectionId', () => {
    const p = projectBase({
      activeDirectionId: 'a',
      directions: [dir({ id: 'a' })],
    })
    expect(activeDirectionWorkingMaterial(p, []).title).toBe('Warm editorial')
    expect(activeDirectionWorkingMaterial({ ...p, activeDirectionId: null })).toBeNull()
  })
})

describe('incomplete type / mark hierarchy inputs', () => {
  it('type none has empty samples and missing part state', () => {
    const w = directionWorkingMaterial(projectBase(), dir(), [])
    expect(w.type.source).toBe('none')
    expect(w.type.samples).toEqual([])
    expect(w.parts.type.state).toBe('missing')
    expect(w.mark.source).toBe('none')
    expect(w.parts.mark.state).toBe('missing')
  })

  it('type evidence exposes samples without inventing a pairing', () => {
    const d = dir({
      evidence: [refKey(makeRef('sample', 'type:fraunces:700'))],
    })
    const w = directionWorkingMaterial(projectBase(), d, [])
    expect(w.type.source).toBe('evidence')
    expect(w.type.heading).toBe('')
    expect(w.type.body).toBe('')
    expect(w.type.samples.length).toBeGreaterThan(0)
    expect(w.parts.type.state).toBe('evidence')
  })

  it('type ref is captured and projectView overlays display only', () => {
    const p = projectBase()
    const d = dir({
      refs: { typePairing: refKey(makeRef('typePairing', 'type_a')) },
    })
    const w = directionWorkingMaterial(p, d, [])
    expect(w.type.source).toBe('ref')
    expect(w.parts.type.state).toBe('captured')
    const view = projectViewForDirectionMaterial(p, w)
    expect(view.typeHeading).toBe('Fraunces SemiBold')
    expect(p.typeHeading).toBe('Plus Jakarta Sans Bold')
  })

  it('mark ref is captured; absent mark stays missing', () => {
    const withMark = directionWorkingMaterial(
      projectBase(),
      dir({ refs: { mark: refKey(makeRef('markConcept', 'm1')) } }),
      []
    )
    expect(withMark.mark.source).toBe('ref')
    expect(withMark.parts.mark.state).toBe('captured')
    const without = directionWorkingMaterial(projectBase(), dir(), [])
    expect(without.mark.source).toBe('none')
    expect(without.parts.mark.state).toBe('missing')
  })
})
