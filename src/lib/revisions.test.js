/**
 * Revision counting is the layer where being wrong costs unpaid work, so it
 * is pinned here rather than left to the UI to get right.
 */
import { describe, it, expect } from 'vitest'
import {
  revisionSummary,
  revisionLine,
  roundCharge,
  scopeGaps,
  DEFAULT_REVISIONS_INCLUDED,
} from './revisions'

const closed = (id) => ({ id, openedAt: '2026-07-01', closedAt: '2026-07-02' })
const open = (id) => ({ id, openedAt: '2026-07-03' })

describe('revisionSummary', () => {
  it('counts nothing as nothing', () => {
    const s = revisionSummary([], 2)
    expect(s.number).toBe(0)
    expect(s.completed).toBe(0)
    expect(s.isBeyond).toBe(false)
    expect(s.remaining).toBe(2)
    expect(s.nextIsBeyond).toBe(false)
  })

  it('an open round is the round you would say out loud', () => {
    const s = revisionSummary([closed('a'), open('b')], 2)
    expect(s.number).toBe(2)
    expect(s.completed).toBe(1)
    expect(s.openId).toBe('b')
  })

  it('finishing exactly what was sold is not beyond', () => {
    const s = revisionSummary([closed('a'), closed('b')], 2)
    expect(s.completed).toBe(2)
    expect(s.isBeyond).toBe(false)
    // ...but the next one is the first unpaid one, and that is worth saying
    // BEFORE the work happens, not after.
    expect(s.nextIsBeyond).toBe(true)
    expect(s.remaining).toBe(0)
  })

  it('an open third round against two included is beyond', () => {
    const s = revisionSummary([closed('a'), closed('b'), open('c')], 2)
    expect(s.number).toBe(3)
    expect(s.isBeyond).toBe(true)
  })

  it('treats zero included as everything being extra', () => {
    const s = revisionSummary([open('a')], 0)
    expect(s.isBeyond).toBe(true)
    expect(s.nextIsBeyond).toBe(true)
  })

  it('survives junk instead of crashing the Review page', () => {
    expect(revisionSummary(null, undefined).included).toBe(
      DEFAULT_REVISIONS_INCLUDED
    )
    expect(revisionSummary([null, undefined], 2).completed).toBe(0)
    expect(revisionSummary([], 'lots').included).toBe(
      DEFAULT_REVISIONS_INCLUDED
    )
  })
})

describe('revisionLine', () => {
  it('names the round and the agreement, never a date', () => {
    expect(revisionLine([], 2)).toBe('No rounds yet — 2 agreed')
    expect(revisionLine([open('a')], 2)).toBe('Round 1 of 2')
    expect(revisionLine([closed('a')], 2)).toBe('1 of 2 done')
    expect(revisionLine([closed('a'), closed('b')], 2)).toBe(
      '2 done — the next one is extra'
    )
    expect(revisionLine([closed('a'), closed('b'), open('c')], 2)).toBe(
      'Round 3 — past the 2 you agreed'
    )
  })

  it('never mentions elapsed time', () => {
    const all = [
      revisionLine([], 2),
      revisionLine([open('a')], 2),
      revisionLine([closed('a'), closed('b'), open('c')], 2),
    ].join(' ')
    expect(all).not.toMatch(/day|week|ago|hour|minute/i)
  })
})

describe('roundCharge', () => {
  it('charges a flat fee per extra round', () => {
    expect(roundCharge({ billing: 'perRound', rate: 100 })).toBe(100)
  })

  it('charges hours x rate when billing hourly', () => {
    expect(roundCharge({ billing: 'hourly', rate: 80, hours: 2.5 })).toBe(200)
  })

  it('returns null rather than zero when there is nothing to charge', () => {
    // null means "put no line on the invoice"; 0 would put a $0 line on it.
    expect(roundCharge({ billing: 'perRound', rate: 100, isBeyond: false })).toBe(
      null
    )
    expect(roundCharge({ billing: 'perRound', rate: 0 })).toBe(null)
    expect(roundCharge({ billing: 'hourly', rate: 80, hours: 0 })).toBe(null)
    expect(roundCharge({})).toBe(null)
  })
})

describe('scopeGaps', () => {
  const full = {
    scopeRevisionsIncluded: 2,
    scopeApprover: 'Sarah Whitton',
    scopeOutOf: 'No website build, no copywriting.',
    detective: {
      deliverablesPicked: ['logoPrimary'],
      technical: 'SVG and PNG',
    },
  }

  it('is empty when the scope is fully agreed', () => {
    expect(scopeGaps(full)).toEqual([])
  })

  it('names each missing part, in checklist order', () => {
    expect(scopeGaps({}).map((g) => g.id)).toEqual([
      'deliverables',
      'revisions',
      'formats',
      'approver',
      'outOfScope',
    ])
  })

  it('counts "as needed" — a blank revision count — as a gap', () => {
    const g = scopeGaps({ ...full, scopeRevisionsIncluded: 0 })
    expect(g.map((x) => x.id)).toEqual(['revisions'])
  })

  it('accepts free-text deliverables when nothing is ticked', () => {
    const g = scopeGaps({
      ...full,
      detective: { ...full.detective, deliverablesPicked: [], deliverables: 'A shop sign' },
    })
    expect(g).toEqual([])
  })
})
