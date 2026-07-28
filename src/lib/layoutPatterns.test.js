/**
 * The reference is only worth having if every entry actually says something.
 * A pattern list where half the entries read "use it when appropriate" is the
 * kind of filler that makes a reference not worth opening twice.
 */
import { describe, it, expect } from 'vitest'
import {
  LAYOUT_PATTERNS,
  SCAN_PATTERNS,
  scanFor,
  patternsForScan,
} from './layoutPatterns'

describe('layout patterns', () => {
  it('has the eight the article names', () => {
    expect(LAYOUT_PATTERNS).toHaveLength(8)
  })

  it('gives every pattern a structure, a when, and a caveat', () => {
    for (const p of LAYOUT_PATTERNS) {
      expect(p.id, 'id').toBeTruthy()
      expect(p.name.length).toBeGreaterThan(2)
      expect(p.structure.length, `${p.id} structure`).toBeGreaterThan(15)
      expect(p.when.length, `${p.id} when`).toBeGreaterThan(15)
      // The caveat is the part that makes it advice rather than a list.
      expect(p.watch.length, `${p.id} watch`).toBeGreaterThan(20)
    }
  })

  it('points every pattern at a scan pattern that exists', () => {
    for (const p of LAYOUT_PATTERNS) {
      expect(scanFor(p.scan), `${p.id} -> ${p.scan}`).toBeTruthy()
    }
  })

  it('uses no duplicate ids or names', () => {
    const ids = LAYOUT_PATTERNS.map((p) => p.id)
    const names = LAYOUT_PATTERNS.map((p) => p.name)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)
  })

  it('explains both F and Z, with what to do about each', () => {
    expect(SCAN_PATTERNS.map((s) => s.id).sort()).toEqual(['f', 'z'])
    for (const s of SCAN_PATTERNS) {
      expect(s.why.length).toBeGreaterThan(30)
      expect(s.do.length).toBeGreaterThan(20)
    }
  })

  it('has patterns on both sides of the scan split', () => {
    // If every pattern read the same way, the scan distinction would be
    // decoration rather than a reason to pick one.
    expect(patternsForScan('f').length).toBeGreaterThan(0)
    expect(patternsForScan('z').length).toBeGreaterThan(0)
  })

  it('returns null for an unknown scan rather than throwing', () => {
    expect(scanFor('nope')).toBe(null)
    expect(patternsForScan('nope')).toEqual([])
  })
})
