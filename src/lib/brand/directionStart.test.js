import { describe, expect, it } from 'vitest'
import { refKey, makeRef } from '../artifacts/artifactRef'
import {
  SPLIT_MIN_KEPT,
  classifyDirectionStart,
  computeEvidenceSplit,
  evidenceHex,
  evidenceAxes,
} from './directionStart'

const colorItem = (hex) => ({
  key: refKey(makeRef('sample', `color:${hex.replace('#', '').toLowerCase()}`)),
  kind: 'sample',
  pin: null,
  sample: {
    id: `color:${hex.replace('#', '').toLowerCase()}`,
    category: 'color',
    hex,
    label: hex,
  },
  missing: false,
})

const typeItem = (id = 'fraunces') => ({
  key: refKey(makeRef('sample', `type:${id}:700`)),
  kind: 'sample',
  pin: null,
  sample: {
    id: `type:${id}:700`,
    category: 'type',
    family: 'Fraunces',
    weight: 700,
    label: 'Fraunces Bold',
  },
  missing: false,
})

describe('evidence axes', () => {
  it('reads warmth from a colour sample and not from type', () => {
    expect(evidenceHex(colorItem('#F26B21'))).toBe('#F26B21')
    expect(evidenceAxes(colorItem('#F26B21'))?.warmth).not.toBeNull()
    expect(evidenceHex(typeItem())).toBeNull()
    expect(evidenceAxes(typeItem())).toBeNull()
  })
})

describe('computeEvidenceSplit', () => {
  it('needs at least SPLIT_MIN_KEPT measurable items', () => {
    expect(SPLIT_MIN_KEPT).toBe(4)
    const few = [
      colorItem('#F26B21'),
      colorItem('#FF9E4A'),
      colorItem('#0F766E'),
    ]
    expect(computeEvidenceSplit(few)).toBeNull()
  })

  it('splits warmer vs cooler when colours diverge', () => {
    const items = [
      colorItem('#F26B21'), // warm
      colorItem('#FF9E4A'), // warm
      colorItem('#B45309'), // warm
      colorItem('#0F766E'), // cool
      colorItem('#0369A1'), // cool
      colorItem('#1D4ED8'), // cool
    ]
    const split = computeEvidenceSplit(items)
    expect(split).not.toBeNull()
    expect(split.axis).toBe('warmth')
    expect(split.highCount).toBeGreaterThan(0)
    expect(split.lowCount).toBeGreaterThan(0)
    expect(split.highCount + split.lowCount).toBe(split.measured)
    expect(split.summary).toMatch(
      /^Start from what you kept — 2 routes, \d+ warmer, \d+ cooler$/
    )
    /* Citations only — keys, not names or hex copies as authoring. */
    expect(split.highKeys.every((k) => k.startsWith('sample:'))).toBe(true)
  })

  it('does not invent a split from typefaces alone', () => {
    const items = [
      typeItem('fraunces'),
      typeItem('jakarta'),
      typeItem('inter'),
      typeItem('plex-mono'),
      typeItem('syne'),
    ]
    expect(computeEvidenceSplit(items)).toBeNull()
  })

  it('refuses a one-sided pole', () => {
    /* All warm oranges — low group empty. */
    const items = [
      colorItem('#F26B21'),
      colorItem('#FF9E4A'),
      colorItem('#EA580C'),
      colorItem('#C2410C'),
    ]
    const split = computeEvidenceSplit(items)
    /* May fall through to energy/weight or null; must never invent a cool group. */
    if (split) {
      expect(split.highCount).toBeGreaterThan(0)
      expect(split.lowCount).toBeGreaterThan(0)
    }
  })
})

describe('classifyDirectionStart', () => {
  it('is nothing when nothing is kept', () => {
    const c = classifyDirectionStart([], [])
    expect(c.state).toBe('nothing')
    expect(c.kept).toBe(0)
    expect(c.offer).toBeNull()
    expect(c.reason).toMatch(/♥|heart/i)
  })

  it('is thin when kept is under the split floor and no routes exist', () => {
    const items = [colorItem('#F26B21'), colorItem('#0F766E')]
    const c = classifyDirectionStart(items, [])
    expect(c.state).toBe('thin')
    expect(c.kept).toBe(2)
    expect(c.offer).toBeNull()
    expect(c.reason).toMatch(/2 kept/)
  })

  it('is thin when four+ kept but no measurable colour', () => {
    const items = [
      typeItem('a'),
      typeItem('b'),
      typeItem('c'),
      typeItem('d'),
      typeItem('e'),
    ]
    const c = classifyDirectionStart(items, [])
    expect(c.state).toBe('thin')
    expect(c.reason).toMatch(/readable colour|kept/)
  })

  it('offers a split when four+ colour items diverge and routes are empty', () => {
    const items = [
      colorItem('#F26B21'),
      colorItem('#FF9E4A'),
      colorItem('#B45309'),
      colorItem('#0F766E'),
      colorItem('#0369A1'),
      colorItem('#1D4ED8'),
    ]
    const c = classifyDirectionStart(items, [])
    expect(c.state).toBe('split')
    expect(c.offer?.summary).toMatch(/2 routes/)
  })

  it('is ready when routes already exist — never overwrites', () => {
    const items = [
      colorItem('#F26B21'),
      colorItem('#FF9E4A'),
      colorItem('#B45309'),
      colorItem('#0F766E'),
      colorItem('#0369A1'),
      colorItem('#1D4ED8'),
    ]
    const c = classifyDirectionStart(items, [{ id: 'a', letter: 'A' }])
    expect(c.state).toBe('ready')
    expect(c.offer).toBeNull()
  })
})
