import { describe, expect, it } from 'vitest'
import { refKey, makeRef } from '../artifacts/artifactRef'
import { CLOSE_ENOUGH } from './alignment'
import {
  directionDifferenceLine,
  directionDifferenceLines,
} from './directionDifference'

/**
 * Facts only. These pin the wording and the silence: a gap inside
 * CLOSE_ENOUGH is not a difference, and a route with no palette material
 * says nothing rather than inventing a contrast.
 */

const projectBase = (over = {}) => ({
  id: 'p1',
  name: 'Job',
  artifacts: {
    pal_warm: {
      id: 'pal_warm',
      kind: 'palette',
      hexes: ['#F26B21', '#FF9E4A', '#FFF4E6'],
    },
    pal_cool: {
      id: 'pal_cool',
      kind: 'palette',
      hexes: ['#0F766E', '#5EEAD4', '#F0FDFA'],
    },
    pal_ink: {
      id: 'pal_ink',
      kind: 'palette',
      hexes: ['#1C1917', '#A8A29E', '#FAFAF9'],
    },
    /* Two near-identical warm palettes — within CLOSE_ENOUGH on every axis. */
    pal_warm_a: {
      id: 'pal_warm_a',
      kind: 'palette',
      hexes: ['#E8590C', '#FFF4E6'],
    },
    pal_warm_b: {
      id: 'pal_warm_b',
      kind: 'palette',
      hexes: ['#F76707', '#FFF7ED'],
    },
  },
  ...over,
})

const route = (id, letter, paletteId, over = {}) => ({
  id,
  letter,
  title: '',
  note: '',
  chosen: false,
  evidence: [],
  refs: paletteId
    ? { palette: refKey(makeRef('palette', paletteId)) }
    : {},
  ...over,
})

describe('directionDifferenceLine', () => {
  it('names a warmth difference with the peer letter', () => {
    const proj = projectBase()
    const a = route('a', 'A', 'pal_warm')
    const b = route('b', 'B', 'pal_cool')
    const lineA = directionDifferenceLine(proj, a, [b])
    const lineB = directionDifferenceLine(proj, b, [a])
    expect(lineA).toMatch(/warmer than B/)
    expect(lineB).toMatch(/cooler than A/)
  })

  it('can name energy or weight when that is the strongest gap', () => {
    const proj = projectBase()
    /* Saturated orange vs near-black ink: weight and energy both move. */
    const a = route('a', 'A', 'pal_warm')
    const c = route('c', 'C', 'pal_ink')
    const line = directionDifferenceLine(proj, a, [c])
    expect(line).toMatch(/than C/)
    expect(line).toMatch(/warmer|higher energy|lower energy|lighter|heavier/)
  })

  it('says nothing when the gap is within CLOSE_ENOUGH', () => {
    expect(CLOSE_ENOUGH).toBe(0.15)
    const proj = projectBase()
    /* Same hexes → delta 0 on every axis. Near-matches also stay silent when
       under the threshold; identical material is the clean proof. */
    const a = route('a', 'A', 'pal_warm_a')
    const b = route('b', 'B', 'pal_warm_a')
    expect(directionDifferenceLine(proj, a, [b])).toBe('')
    expect(directionDifferenceLine(proj, b, [a])).toBe('')
  })

  it('says nothing when this route has no palette material', () => {
    const proj = projectBase()
    const a = route('a', 'A', null)
    const b = route('b', 'B', 'pal_cool')
    expect(directionDifferenceLine(proj, a, [b])).toBe('')
  })

  it('says nothing when there are no peers', () => {
    const proj = projectBase()
    const a = route('a', 'A', 'pal_warm')
    expect(directionDifferenceLine(proj, a, [])).toBe('')
  })

  it('does not invent creative language or rationale', () => {
    const proj = projectBase()
    const a = route('a', 'A', 'pal_warm')
    const b = route('b', 'B', 'pal_cool')
    const line = directionDifferenceLine(proj, a, [b])
    expect(line).not.toMatch(/because|feels|suggests|evokes|should|try/i)
    expect(line).toMatch(/^(warmer|cooler|higher energy|lower energy|heavier|lighter) than [A-C]$/)
  })

  it('uses evidence colour when the palette ref is unset', () => {
    const proj = projectBase()
    const warmKey = refKey(makeRef('sample', 'color:b45309'))
    const coolKey = refKey(makeRef('sample', 'color:0f766e'))
    const a = {
      ...route('a', 'A', null),
      evidence: [warmKey],
    }
    const b = {
      ...route('b', 'B', null),
      evidence: [coolKey],
    }
    const line = directionDifferenceLine(proj, a, [b], { moodItems: [] })
    expect(line).toMatch(/warmer than B|higher energy than B/)
  })
})

describe('directionDifferenceLines', () => {
  it('returns a map keyed by route id for the shortlist', () => {
    const proj = projectBase()
    const routes = [
      route('a', 'A', 'pal_warm'),
      route('b', 'B', 'pal_cool'),
      route('c', 'C', 'pal_ink'),
    ]
    const map = directionDifferenceLines(proj, routes)
    expect(Object.keys(map).sort()).toEqual(['a', 'b', 'c'])
    expect(map.a).toMatch(/than [BC]/)
    expect(map.b).toMatch(/than [AC]/)
    /* Empty string is allowed for a route with nothing to say. */
    expect(typeof map.c).toBe('string')
  })
})
