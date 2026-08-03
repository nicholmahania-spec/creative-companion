import { describe, expect, it } from 'vitest'
import {
  hoursForRange,
  weekFromWorkLog,
  formatHoursWorked,
  hoursLoggedWords,
  workLogsFromProjects,
  HOURS_RANGES,
} from './workWeek.js'

const now = new Date(2026, 7, 5) // Wed Aug 5 2026 local

function row(date, hours) {
  return { date, hours, stage: 'work' }
}

describe('HOURS_RANGES', () => {
  it('lists day through all time', () => {
    expect(HOURS_RANGES.map((r) => r.id)).toEqual([
      'day',
      'week',
      'month',
      'year',
      'all',
    ])
  })
})

describe('hoursForRange', () => {
  const log = [
    row('2026-08-05', 2), // today (Wed)
    row('2026-08-04', 3), // Tue this week
    row('2026-08-01', 1), // Sat previous week? Aug 1 2026 is Saturday - week Sun Aug 2 - Sat Aug 8, so Aug 1 is previous
    row('2026-07-15', 4), // previous month
    row('2025-12-01', 5), // previous year
  ]

  it('day totals only today', () => {
    const r = hoursForRange(log, 'day', now)
    expect(r.total).toBe(2)
    expect(r.rangeLabel).toBe('Today')
  })

  it('week includes current week only', () => {
    // Sun Aug 2 – Sat Aug 8: Aug 4 + Aug 5 = 5; Aug 1 is prior week
    const r = hoursForRange(log, 'week', now)
    expect(r.total).toBe(5)
    expect(r.buckets).toHaveLength(7)
  })

  it('month includes current month', () => {
    const r = hoursForRange(log, 'month', now)
    expect(r.total).toBe(2 + 3 + 1) // Aug 1,4,5
    expect(r.buckets.length).toBe(31)
  })

  it('year includes current year', () => {
    const r = hoursForRange(log, 'year', now)
    expect(r.total).toBe(2 + 3 + 1 + 4)
    expect(r.buckets).toHaveLength(12)
  })

  it('all time includes everything', () => {
    const r = hoursForRange(log, 'all', now)
    expect(r.total).toBe(2 + 3 + 1 + 4 + 5)
  })

  it('never invents hours on empty log', () => {
    for (const id of ['day', 'week', 'month', 'year', 'all']) {
      expect(hoursForRange([], id, now).total).toBe(0)
    }
  })
})

describe('weekFromWorkLog', () => {
  it('matches hoursForRange week total', () => {
    const log = [row('2026-08-05', 2), row('2026-08-04', 1)]
    expect(weekFromWorkLog(log, now).total).toBe(
      hoursForRange(log, 'week', now).total
    )
  })
})

describe('formatHoursWorked', () => {
  it('formats integers and tenths', () => {
    expect(formatHoursWorked(0)).toBe('0')
    expect(formatHoursWorked(16)).toBe('16')
    expect(formatHoursWorked(16.5)).toBe('16.5')
  })
})

describe('bar scale does not inflate thin weeks', () => {
  it('a 0.2h day is a short stub, not a full bar', () => {
    const r = hoursForRange([row('2026-08-02', 0.2)], 'week', now)
    const sun = r.buckets[0]
    expect(sun.fill).toBe(true)
    expect(sun.hPx).toBeLessThan(20)
    expect(sun.hPx).toBeGreaterThanOrEqual(4)
  })

  it('a 4h day reaches a full bar', () => {
    const r = hoursForRange([row('2026-08-02', 4)], 'week', now)
    expect(r.buckets[0].hPx).toBe(56)
  })
})

describe('hoursLoggedWords', () => {
  it('avoids raw clock numbers as the primary phrase', () => {
    expect(hoursLoggedWords(0)).toBe('No hours logged this week')
    expect(hoursLoggedWords(0.2)).toBe('A little on the clock')
    expect(hoursLoggedWords(1)).toBe('Some time logged')
    expect(hoursLoggedWords(3)).toBe('A solid stretch logged')
    expect(hoursLoggedWords(8)).toBe('A full week on the clock')
    expect(hoursLoggedWords(0.2)).not.toMatch(/\d/)
  })
})

describe('workLogsFromProjects', () => {
  it('flattens project workLogs', () => {
    const flat = workLogsFromProjects([
      { workLog: [row('2026-08-01', 1)] },
      { workLog: [row('2026-08-02', 2)] },
    ])
    expect(flat).toHaveLength(2)
  })
})
