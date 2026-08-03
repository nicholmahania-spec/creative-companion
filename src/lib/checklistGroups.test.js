/**
 * A checklist group with no rows must not draw its heading.
 *
 * `ChecklistField` split every checklist into "Included" and "Quoted
 * separately". Only DELIVERABLE_OPTIONS marks anything `extra`;
 * BRAND_SURFACE_OPTIONS ("Where will this be used?") marks nothing. So that
 * question rendered a "Quoted separately" legend above zero checkboxes — a
 * heading that could never reflect a tick, because it had no rows to tick.
 *
 * It rendered on the client-facing /f/ and /c/ routes too, where a bare
 * "Quoted separately" on a question about where a brand appears reads as a
 * price warning about work nobody quoted. projectTerms.js already writes
 * down the principle: an empty heading in something headed for a contract
 * reads as a term that was agreed to be nothing.
 *
 * This guards the data shape the renderers depend on, and the rule itself.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  BRAND_SURFACE_OPTIONS,
  DELIVERABLE_OPTIONS,
} from './detectiveBrief.js'

/** The grouping both renderers perform, kept in one place for the test. */
function groupsFor(options) {
  return [
    { key: 'included', items: options.filter((o) => !o.extra) },
    { key: 'extra', items: options.filter((o) => o.extra) },
  ].filter((g) => g.items.length > 0)
}

describe('checklist groups', () => {
  it('brand surfaces produce no "Quoted separately" group at all', () => {
    // Nothing here is an upsell — it asks where the brand shows up.
    expect(BRAND_SURFACE_OPTIONS.some((o) => o.extra)).toBe(false)
    const groups = groupsFor(BRAND_SURFACE_OPTIONS)
    expect(groups.map((g) => g.key)).toEqual(['included'])
  })

  it('deliverables still produce both groups', () => {
    const groups = groupsFor(DELIVERABLE_OPTIONS)
    expect(groups.map((g) => g.key)).toEqual(['included', 'extra'])
    expect(groups[1].items.length).toBeGreaterThan(0)
  })

  it('no group is ever emitted with zero items', () => {
    for (const opts of [BRAND_SURFACE_OPTIONS, DELIVERABLE_OPTIONS, []]) {
      for (const g of groupsFor(opts)) {
        expect(g.items.length).toBeGreaterThan(0)
      }
    }
  })

  it('both renderers filter empty groups before mapping', () => {
    // The bug was one renderer being fixed and its twin missed — the client
    // surface and the designer surface draw this from separate files.
    for (const rel of [
      '../features/brief/DetectiveSheet.jsx',
      '../features/brief/ClientBriefFields.jsx',
    ]) {
      const src = readFileSync(
        fileURLToPath(new URL(rel, import.meta.url)),
        'utf8'
      )
      expect(src, `${rel} must drop empty checklist groups`).toMatch(
        /\.filter\(\s*\(g\)\s*=>\s*g\.items\.length\s*>\s*0\s*\)/
      )
    }
  })
})
