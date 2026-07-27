/**
 * The work clock's record and the invoice must not be the same array.
 *
 * A clock is a note you keep to yourself; an invoice is a claim you make to
 * another person. When the clock wrote into `timeLog`, every idle page left
 * open and every stage passed through quietly became something a client was
 * asked to pay for. These tests pin the two properties that keep them apart:
 *
 *   1. the clock writes to `workLog` and never to `timeLog`
 *   2. `timeLog` contains no measured (`auto`) row after any load
 *
 * (2) is separate from (1) on purpose. A migration runs once, so it can
 * establish the invariant but cannot hold it — a stale tab running the old
 * writer, or a synced payload from an older client, can reintroduce a
 * billable row that nobody typed.
 */
import { describe, it, expect } from 'vitest'
import { liftMeasuredRows } from './workLogSeparation'

describe('work log / invoice separation', () => {
  it('lifts measured rows out of the billable log', () => {
    const [p] = liftMeasuredRows([
      {
        timeLog: [
          { id: 'a', hours: 2, note: 'Logo drafts' },
          { id: 'b', hours: 0.12, stage: 'research', auto: true },
        ],
        workLog: [],
      },
    ])
    expect(p.timeLog.map((e) => e.id)).toEqual(['a'])
    expect(p.workLog.map((e) => e.id)).toEqual(['b'])
  })

  it('never discards measured time — it moves, it does not vanish', () => {
    const [p] = liftMeasuredRows([
      {
        timeLog: [{ id: 'b', hours: 0.5, auto: true }],
        workLog: [{ id: 'old', hours: 1 }],
      },
    ])
    const total = p.workLog.reduce((s, e) => s + e.hours, 0)
    expect(total).toBe(1.5)
  })

  it('leaves a hand-entered log untouched', () => {
    const before = [{ timeLog: [{ id: 'a', hours: 2 }], workLog: [] }]
    expect(liftMeasuredRows(before)[0]).toBe(before[0])
  })

  it('is idempotent — a second load changes nothing', () => {
    const once = liftMeasuredRows([
      { timeLog: [{ id: 'b', hours: 1, auto: true }], workLog: [] },
    ])
    expect(liftMeasuredRows(once)[0]).toBe(once[0])
  })

  it('tolerates a project that has never logged anything', () => {
    expect(liftMeasuredRows([{}])[0]).toEqual({})
  })
})
