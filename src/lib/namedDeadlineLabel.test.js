import { describe, expect, it } from 'vitest'
import { namedDeadlineLabel } from './dates.js'

describe('namedDeadlineLabel', () => {
  it('returns empty without a date', () => {
    expect(namedDeadlineLabel('', 'Signage')).toBe('')
    expect(namedDeadlineLabel(null, 'Signage')).toBe('')
  })

  it('returns worded due only when no deliverable name', () => {
    // far future → Due later on
    expect(namedDeadlineLabel('2099-12-01', '')).toBe('Due later on')
  })

  it('prefixes deliverable name', () => {
    expect(namedDeadlineLabel('2099-12-01', 'Signage')).toBe(
      'Signage · Due later on'
    )
  })

  it('trims deliverable label', () => {
    expect(namedDeadlineLabel('2099-12-01', '  Primary logo  ')).toBe(
      'Primary logo · Due later on'
    )
  })
})
