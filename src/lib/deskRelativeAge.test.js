import { describe, expect, it } from 'vitest'
import { relativeAgeLabel } from '../views/DeskView.jsx'

describe('relativeAgeLabel (desk option B)', () => {
  const now = new Date('2026-08-03T12:00:00')

  it('returns empty for missing stamps', () => {
    expect(relativeAgeLabel('', now)).toBe('')
    expect(relativeAgeLabel(null, now)).toBe('')
  })

  it('uses hours under a day', () => {
    expect(relativeAgeLabel('2026-08-03T10:00:00', now)).toBe('2h')
  })

  it('uses Yesterday for one day', () => {
    expect(relativeAgeLabel('2026-08-02T12:00:00', now)).toBe('Yesterday')
  })

  it('uses N days inside the week', () => {
    expect(relativeAgeLabel('2026-08-01T12:00:00', now)).toBe('2 days')
  })

  it('uses 1 week at seven days', () => {
    expect(relativeAgeLabel('2026-07-27T12:00:00', now)).toBe('1 week')
  })
})
