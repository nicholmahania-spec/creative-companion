import { describe, it, expect } from 'vitest'
import { formatSessionLabel } from './useWorkClock.js'

/**
 * The first unit test the work clock has ever had.
 *
 * Not because nobody wrote one, but because none was possible: this rule was
 * an IIFE closed over App.jsx's component state, and the suite runs in `node`
 * with no DOM, so reaching it meant rendering the whole app. Pulling the pure
 * formatting out of the ticking is what made it reachable.
 */
describe('formatSessionLabel', () => {
  it('says words, not 0m, under the first minute', () => {
    /* The chip appears the moment the clock starts, so this is the reading a
       user sees first. "0m" reads like a stopped clock. */
    expect(formatSessionLabel(0)).toBe('just started')
    expect(formatSessionLabel(59)).toBe('just started')
  })

  it('counts whole minutes up to the hour', () => {
    expect(formatSessionLabel(60)).toBe('1m')
    expect(formatSessionLabel(119)).toBe('1m')
    expect(formatSessionLabel(59 * 60)).toBe('59m')
  })

  it('switches to hours at exactly sixty minutes', () => {
    expect(formatSessionLabel(60 * 60)).toBe('1h')
    expect(formatSessionLabel(2 * 60 * 60)).toBe('2h')
  })

  it('drops the minutes part when it is zero rather than saying 1h 0m', () => {
    expect(formatSessionLabel(60 * 60 + 59)).toBe('1h')
  })

  it('carries the remainder past the hour', () => {
    expect(formatSessionLabel(90 * 60)).toBe('1h 30m')
    expect(formatSessionLabel(61 * 60)).toBe('1h 1m')
  })

  it('does not go backwards on the idle refund', () => {
    /* On resume the clock hands back the ten minute idle window it had
       already counted, clamped at zero by the caller. The formatter must
       still read sensibly at the bottom of that clamp. */
    expect(formatSessionLabel(0)).toBe('just started')
  })
})
