import { describe, expect, it } from 'vitest'
import { groupMessagesByDay, messageDayLabel } from './messageDayLabel'

/** A fixed "now": Thursday 2026-08-06, mid-afternoon local time. */
const NOW = new Date(2026, 7, 6, 15, 30)
/** Local-time ISO for a day offset from NOW, at a given hour. */
const ago = (days, hour = 10) =>
  new Date(2026, 7, 6 - days, hour).toISOString()

describe('messageDayLabel', () => {
  it('names today and yesterday', () => {
    expect(messageDayLabel(ago(0), NOW)).toBe('Today')
    expect(messageDayLabel(ago(1), NOW)).toBe('Yesterday')
  })

  it('uses the weekday name inside the current week', () => {
    expect(messageDayLabel(ago(2), NOW)).toBe('Tuesday')
    expect(messageDayLabel(ago(3), NOW)).toBe('Monday')
    expect(messageDayLabel(ago(6), NOW)).toBe('Friday')
  })

  it('collapses to a flat Earlier past the week', () => {
    // The label must stop growing once it is out of the actionable window, so
    // an old thread does not become a bigger accusation each time it opens.
    expect(messageDayLabel(ago(7), NOW)).toBe('Earlier')
    expect(messageDayLabel(ago(60), NOW)).toBe('Earlier')
    expect(messageDayLabel(ago(900), NOW)).toBe('Earlier')
  })

  it('groups by calendar day, not by 24-hour spans', () => {
    // 23:30 last night and 00:30 this morning are an hour apart but are
    // Yesterday and Today. A rolling 24h window would call both "Today".
    expect(messageDayLabel(ago(1, 23), NOW)).toBe('Yesterday')
    expect(messageDayLabel(ago(0, 0), NOW)).toBe('Today')
  })

  it('reads a future stamp as Today rather than a future weekday', () => {
    // Clock skew between a client's phone and this device is real.
    expect(messageDayLabel(ago(-1), NOW)).toBe('Today')
  })

  it('returns nothing for a missing or unusable stamp', () => {
    expect(messageDayLabel('', NOW)).toBe('')
    expect(messageDayLabel(null, NOW)).toBe('')
    expect(messageDayLabel('not a date', NOW)).toBe('')
  })
})

describe('the label never carries a number or a verdict', () => {
  /** Every label the function can produce, across a long span. */
  const labels = Array.from({ length: 400 }, (_, i) =>
    messageDayLabel(ago(i), NOW)
  ).filter(Boolean)

  it('never emits a digit', () => {
    // Numbers do not register for this owner. The guard exists because the
    // likely drift is someone "helpfully" appending (4 days) to Earlier.
    for (const l of labels) expect(l).not.toMatch(/\d/)
  })

  it('never names the owner as the cause of a gap', () => {
    // An elapsed count states a fact about the person, and the only edit that
    // fixes it is the reply already being avoided.
    for (const l of labels) {
      expect(l.toLowerCase()).not.toMatch(
        /\bwaiting\b|\boverdue\b|\bunanswered\b|\blate\b|\bstale\b|\byou\b|\bago\b/
      )
    }
  })

  it('stays a closed list of four shapes', () => {
    const allowed = new Set([
      'Today',
      'Yesterday',
      'Earlier',
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ])
    for (const l of labels) expect(allowed.has(l)).toBe(true)
  })
})

describe('groupMessagesByDay', () => {
  it('puts one run per day and keeps message order', () => {
    const msgs = [
      { id: 'a', created_at: ago(3) },
      { id: 'b', created_at: ago(3) },
      { id: 'c', created_at: ago(1) },
      { id: 'd', created_at: ago(0) },
    ]
    const runs = groupMessagesByDay(msgs, NOW)
    expect(runs.map((r) => r.label)).toEqual(['Monday', 'Yesterday', 'Today'])
    expect(runs[0].messages.map((m) => m.id)).toEqual(['a', 'b'])
    expect(runs[2].messages.map((m) => m.id)).toEqual(['d'])
  })

  it('does not merge non-adjacent runs that share a label', () => {
    // Re-sorting here would silently disagree with the thread's own order.
    const msgs = [
      { id: 'a', created_at: ago(0) },
      { id: 'b', created_at: ago(3) },
      { id: 'c', created_at: ago(0) },
    ]
    const runs = groupMessagesByDay(msgs, NOW)
    expect(runs.map((r) => r.label)).toEqual(['Today', 'Monday', 'Today'])
  })

  it('keeps every message exactly once', () => {
    const msgs = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      created_at: ago(i % 9),
    }))
    const runs = groupMessagesByDay(msgs, NOW)
    expect(runs.flatMap((r) => r.messages).map((m) => m.id)).toEqual(
      msgs.map((m) => m.id)
    )
  })

  it('survives an empty or missing list', () => {
    expect(groupMessagesByDay([], NOW)).toEqual([])
    expect(groupMessagesByDay(null, NOW)).toEqual([])
  })
})
