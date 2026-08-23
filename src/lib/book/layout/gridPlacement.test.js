import { describe, expect, it } from 'vitest'
import { fullMeasureCell, resolveGridCell } from './renderContext'
import {
  BOOK_LAYOUT_V,
  compositionFromLegacy,
  elementCellFor,
} from '../bookBuilder'

/**
 * PHASE 10C — THE DESIGNER PLACES ONE THING.
 *
 * The Book Builder had twenty-eight controls and not one of them could say
 * where anything goes. These tests cover the first one that can: an authored
 * grid cell, persisted as intent rather than as coordinates, resolved once by
 * the compositor and drawn identically by both renderers.
 *
 * The load-bearing assertion in this file is the boring one — that a page
 * nobody has placed composes at exactly the geometry it always had. Everything
 * else is a feature; that one is the promise that existing books are safe.
 */

const LETTER = { margin: 48, contentW: 516 }
const A4 = { margin: 48, contentW: 499.28 }
const GRID = { columns: 12, gutter: 3 }

describe('a grid cell resolves to real geometry', () => {
  it('is the identity at full span — the whole point', () => {
    /* If this drifts by a fraction of a point, every existing book moves. */
    expect(resolveGridCell(fullMeasureCell(GRID), GRID, LETTER)).toEqual({
      x: 48,
      w: 516,
    })
  })

  it('is the identity at full span on A4 too', () => {
    expect(resolveGridCell(fullMeasureCell(GRID), GRID, A4)).toEqual({
      x: 48,
      w: 499.28,
    })
  })

  it('starts a later column further across, by exactly one column plus a gutter', () => {
    const gutter = 0.03 * 516
    const colW = (516 - gutter * 11) / 12
    expect(resolveGridCell({ col: 2, colSpan: 1 }, GRID, LETTER).x).toBeCloseTo(
      48 + colW + gutter,
      9
    )
  })

  it('spans columns with the gutters between them, not around them', () => {
    const gutter = 0.03 * 516
    const colW = (516 - gutter * 11) / 12
    /* Six columns hold five gutters. Counting six would overflow the measure
       and a placed heading would run past the page edge. */
    expect(resolveGridCell({ col: 1, colSpan: 6 }, GRID, LETTER).w).toBeCloseTo(
      6 * colW + 5 * gutter,
      9
    )
  })

  it('honours a different column count', () => {
    const g = { columns: 6, gutter: 0 }
    expect(resolveGridCell({ col: 1, colSpan: 3 }, g, LETTER).w).toBeCloseTo(258, 9)
    expect(resolveGridCell(fullMeasureCell(g), g, LETTER)).toEqual({ x: 48, w: 516 })
  })

  it('honours a zero gutter and a wide one', () => {
    expect(resolveGridCell({ col: 1, colSpan: 6 }, { columns: 12, gutter: 0 }, LETTER).w)
      .toBeCloseTo(258, 9)
    const wide = resolveGridCell({ col: 1, colSpan: 6 }, { columns: 12, gutter: 20 }, LETTER)
    expect(wide.w).toBeGreaterThan(0)
    expect(wide.w).toBeLessThan(516)
  })

  it('never lets a cell escape the measure', () => {
    /* A span past the last column is clamped rather than drawn off the page. */
    const out = resolveGridCell({ col: 10, colSpan: 99 }, GRID, LETTER)
    expect(out.x + out.w).toBeLessThanOrEqual(48 + 516 + 1e-9)
    const zero = resolveGridCell({ col: 0, colSpan: 0 }, GRID, LETTER)
    expect(zero.x).toBeGreaterThanOrEqual(48)
    expect(zero.w).toBeGreaterThan(0)
  })

  it('is deterministic and pure', () => {
    const a = resolveGridCell({ col: 3, colSpan: 4 }, GRID, LETTER)
    const b = resolveGridCell({ col: 3, colSpan: 4 }, GRID, LETTER)
    expect(a).toEqual(b)
  })

  it('refuses geometry it cannot resolve against', () => {
    expect(() => resolveGridCell({ col: 1, colSpan: 1 }, GRID, {})).toThrow(/margin/)
  })

  it('falls back to a sane grid when the project has none', () => {
    expect(resolveGridCell({ col: 1, colSpan: 12 }, undefined, LETTER)).toEqual({
      x: 48,
      w: 516,
    })
  })
})

describe('the composition stores intent, never coordinates', () => {
  const base = compositionFromLegacy({ pageOrder: ['logo', 'color'] }, [])

  it('leaves a row without a placement exactly as it was', () => {
    for (const row of base) {
      expect(Object.keys(row).sort()).toEqual(['itemId', 'locked', 'pageId'])
      expect(row.layoutV).toBeUndefined()
    }
  })

  it('round-trips an authored cell, and marks the row generation', () => {
    const placed = compositionFromLegacy(
      { pageElements: { color: [{ id: 'headingBlock', cell: { col: 1, colSpan: 6 } }] } },
      base
    )
    const row = placed.find((r) => r.pageId === 'color')
    expect(row.layoutV).toBe(BOOK_LAYOUT_V)
    expect(elementCellFor(placed, 'color', 'headingBlock')).toEqual({ col: 1, colSpan: 6 })
    /* Untouched pages stay on the old generation. */
    expect(placed.find((r) => r.pageId === 'logo').layoutV).toBeUndefined()
  })

  it('drops anything that is not a grid cell', () => {
    const junk = compositionFromLegacy(
      {
        pageElements: {
          color: [
            { id: 'headingBlock', cell: { x: 10, y: 20, w: 100 } },
            { id: '', cell: { col: 1, colSpan: 2 } },
            { id: 'ok', cell: { col: 0, colSpan: -3 } },
          ],
        },
      },
      base
    )
    const row = junk.find((r) => r.pageId === 'color')
    /* Points, pixels and percentages would pin the book to one paper size. */
    expect(row.elements).toBeUndefined()
    expect(JSON.stringify(junk)).not.toMatch(/"[xy]":|"w":|px|%/)
  })

  it('keeps a placement through a reorder and through a lock', () => {
    const placed = compositionFromLegacy(
      { pageElements: { color: [{ id: 'headingBlock', cell: { col: 4, colSpan: 5 } }] } },
      base
    )
    const reordered = compositionFromLegacy({ pageOrder: ['color', 'logo'] }, placed)
    expect(elementCellFor(reordered, 'color', 'headingBlock')).toEqual({ col: 4, colSpan: 5 })
    const locked = compositionFromLegacy({ pageLocking: { lockedPages: ['color'] } }, placed)
    expect(elementCellFor(locked, 'color', 'headingBlock')).toEqual({ col: 4, colSpan: 5 })
  })

  it('reads nothing from a row that predates placement', () => {
    expect(elementCellFor(base, 'color', 'headingBlock')).toBeNull()
    expect(elementCellFor([], 'color', 'headingBlock')).toBeNull()
    expect(elementCellFor(null, 'color', 'headingBlock')).toBeNull()
    /* A row carrying elements but not the marker is not trusted either. */
    const forged = [{ itemId: 'x', pageId: 'color', elements: [{ id: 'headingBlock', cell: { col: 2, colSpan: 2 } }] }]
    expect(elementCellFor(forged, 'color', 'headingBlock')).toBeNull()
  })
})
