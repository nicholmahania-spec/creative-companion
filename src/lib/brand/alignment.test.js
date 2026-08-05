import { describe, it, expect } from 'vitest'
import {
  AXES,
  AXIS_IDS,
  CLOSE_ENOUGH,
  alignmentNote,
  axisValue,
  compareToTarget,
  strategyTarget,
} from './alignment.js'

describe('the module refuses to produce a single score', () => {
  it('exports no combined score of any name', async () => {
    /* This is the load-bearing test of the whole module. The "82% aligned"
       number did not survive review: the five axes are not independent
       (Shaikh & Chaparro recover three correlated factors), so a euclidean
       distance double-weights whichever pairs co-vary, and — worse — the
       average hides the one axis that carried the brief. If someone adds a
       scalar back as a convenience, this fails and they have to argue it. */
    const mod = await import('./alignment.js')
    const banned = /score|percent|overall|aligned$|distance/i
    const offenders = Object.keys(mod).filter((k) => banned.test(k))
    expect(offenders).toEqual([])
  })
})

describe('axisValue keeps "not said" distinct from zero', () => {
  it('never turns an unset axis into 0', () => {
    // 0 is the LOW POLE — casual, calm, cool. Reading absence as 0 would
    // invent a strategy the designer never wrote.
    expect(axisValue({}, 'warmth')).toBeNull()
    expect(axisValue({ warmth: null }, 'warmth')).toBeNull()
    expect(axisValue({ warmth: '' }, 'warmth')).toBeNull()
    expect(axisValue({ warmth: 0 }, 'warmth')).toBe(0)
  })

  it('clamps nonsense into range instead of propagating it', () => {
    expect(axisValue({ warmth: 5 }, 'warmth')).toBe(1)
    expect(axisValue({ warmth: -2 }, 'warmth')).toBe(0)
    expect(axisValue({ warmth: 'abc' }, 'warmth')).toBeNull()
  })
})

describe('strategyTarget averages per axis, not per attribute', () => {
  it('an attribute silent on an axis does not drag it to the middle', () => {
    /* "warm" says nothing about weight. If silence counted as 0.5, two
       attributes that both ignore weight would manufacture a weight target
       out of nothing. */
    const target = strategyTarget([
      { label: 'warm', warmth: 0.9 },
      { label: 'modern', era: 1 },
    ])
    expect(target.warmth).toBe(0.9)
    expect(target.era).toBe(1)
    expect(target.weight).toBeNull()
  })

  it('averages the attributes that did speak', () => {
    const target = strategyTarget([
      { warmth: 0.8 },
      { warmth: 0.6 },
      { warmth: null },
    ])
    expect(target.warmth).toBeCloseTo(0.7)
  })

  it('no attributes at all means no target, not a middle', () => {
    const target = strategyTarget([])
    AXIS_IDS.forEach((id) => expect(target[id]).toBeNull())
  })
})

describe('compareToTarget', () => {
  const target = { formality: 0.2, energy: 0.8, warmth: 0.9, weight: 0.5, era: 0.7 }

  it('returns every axis, always in the same order', () => {
    // Bars that reshuffle cannot be compared between two candidates.
    const rows = compareToTarget(target, {})
    expect(rows.map((r) => r.axis)).toEqual(AXES.map((a) => a.id))
  })

  it('marks an untagged axis unset — not a match', () => {
    const rows = compareToTarget(target, { warmth: 0.9 })
    const warmth = rows.find((r) => r.axis === 'warmth')
    const energy = rows.find((r) => r.axis === 'energy')
    expect(warmth.state).toBe('close')
    expect(energy.state).toBe('unset') // absence of data is not agreement
    expect(energy.delta).toBeNull()
  })

  it('names the direction in the axis own words', () => {
    const rows = compareToTarget(target, { formality: 0.9 })
    const f = rows.find((r) => r.axis === 'formality')
    expect(f.state).toBe('differs')
    expect(f.direction).toBe('formal') // not "+0.7"
  })

  it('treats a small gap as close', () => {
    const rows = compareToTarget(target, { warmth: 0.9 - CLOSE_ENOUGH })
    expect(rows.find((r) => r.axis === 'warmth').state).toBe('close')
  })

  it('surfaces a single-axis miss that a combined score would have buried', () => {
    /* The exact case from the review: wrong on Warmth alone. A scalar
       renders this ~78% — "worth a second look, not a blocker" — when
       Warmth was the entire brief. The bar says it plainly. */
    const rows = compareToTarget(target, {
      formality: 0.2,
      energy: 0.8,
      warmth: 0.1,
      weight: 0.5,
      era: 0.7,
    })
    const warmth = rows.find((r) => r.axis === 'warmth')
    expect(warmth.state).toBe('differs')
    expect(warmth.direction).toBe('cool')
    expect(rows.filter((r) => r.state === 'differs')).toHaveLength(1)
  })
})

describe('alignmentNote is a prompt, never a verdict', () => {
  const target = { formality: 0.2, energy: 0.8, warmth: 0.9, weight: 0.5, era: 0.7 }

  it('says nothing when everything is close', () => {
    // A system that comments on every choice trains you to stop reading it.
    expect(alignmentNote(compareToTarget(target, target))).toBe('')
  })

  it('names the axis that differs, in words', () => {
    const note = alignmentNote(compareToTarget(target, { warmth: 0.1 }))
    expect(note).toMatch(/warmth leans cool/i)
  })

  it('names at most two axes and counts the rest', () => {
    const note = alignmentNote(
      compareToTarget(target, {
        formality: 1,
        energy: 0,
        warmth: 0,
        weight: 1,
        era: 0,
      })
    )
    expect(note).toMatch(/and 3 more/)
    // two named, not five — a five-item sentence is a paragraph to skip
    expect(note.split(' leans ').length - 1).toBe(2)
  })

  it('never tells the designer what to choose', () => {
    const note = alignmentNote(compareToTarget(target, { warmth: 0.1 }))
    expect(note).not.toMatch(/should|instead|use |try |better|wrong/i)
  })
})
