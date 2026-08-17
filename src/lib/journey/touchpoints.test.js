/**
 * The Applications page is the heart of the book, and it was showing every
 * client the same four mocks. These tests pin the two ways that fix can go
 * wrong: showing a client something they never asked for, and — worse —
 * showing them nothing.
 */
import { describe, it, expect } from 'vitest'
import {
  touchpointsFor,
  touchpointsBlurb,
  touchpointCheckHint,
  TOUCHPOINT_ORDER,
  LEGACY_TOUCHPOINTS,
  TOUCHPOINT_LABEL,
} from './touchpoints'

describe('touchpointsFor', () => {
  it('renders only what the client named', () => {
    expect(touchpointsFor(['app'])).toEqual(['app'])
    expect(touchpointsFor(['social', 'website'])).toEqual(['social', 'website'])
  })

  it('does not give an app-only brand a carrier bag', () => {
    const t = touchpointsFor(['app', 'website'])
    expect(t).not.toContain('packaging')
    expect(t).not.toContain('signage')
  })

  it('treats print as covering the business card', () => {
    // A card IS print. Dropping the best mock in the book because someone
    // ticked "Print" rather than a card-shaped box would be a technicality.
    expect(touchpointsFor(['print'])).toEqual(['businessCard', 'print'])
  })

  it('honours a deliverable even when no surface implies it', () => {
    // You can order business cards without thinking to tick "Print" as a
    // place the brand lives.
    expect(touchpointsFor([], ['businessCard'])).toEqual(['businessCard'])
    expect(touchpointsFor(['app'], ['packaging'])).toEqual(['app', 'packaging'])
  })

  it('invents nothing when nobody named a surface', () => {
    expect(touchpointsFor([], [])).toEqual([])
    expect(touchpointsFor(undefined, undefined)).toEqual([])
    expect(touchpointsFor(null, null)).toEqual([])
    expect(touchpointsFor([], [])).not.toEqual(LEGACY_TOUCHPOINTS)
  })

  it('never duplicates when a surface and a deliverable agree', () => {
    const t = touchpointsFor(['packaging'], ['packaging'])
    expect(t).toEqual(['packaging'])
  })

  it('always returns them in book order, whatever order they were ticked', () => {
    const t = touchpointsFor(['signage', 'social', 'app'])
    expect(t).toEqual(['social', 'app', 'signage'])
    for (const key of t) expect(TOUCHPOINT_ORDER).toContain(key)
  })

  it('ignores surface ids the book has no mock for', () => {
    expect(touchpointsFor(['teleportation', 'social'])).toEqual(['social'])
  })

  it('every legacy touchpoint is still a real mock key', () => {
    for (const key of LEGACY_TOUCHPOINTS) {
      expect(TOUCHPOINT_ORDER).toContain(key)
    }
  })
})

describe('touchpointsBlurb', () => {
  it('says the page answers their brief when it does', () => {
    expect(touchpointsBlurb(['app'])).toMatch(/you said/)
  })

  it('stays generic when nothing was named', () => {
    expect(touchpointsBlurb([], [])).not.toMatch(/you said/)
  })
})

describe('touchpointCheckHint', () => {
  it('gives a concrete check line for every book mock', () => {
    for (const id of TOUCHPOINT_ORDER) {
      expect(touchpointCheckHint(id).length).toBeGreaterThan(4)
      expect(TOUCHPOINT_LABEL[id]).toBeTruthy()
    }
  })
})
