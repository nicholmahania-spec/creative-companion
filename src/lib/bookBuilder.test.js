import { describe, expect, it } from 'vitest'
import {
  blankBookBuilder,
  bookBuilderFor,
  readPaletteTokens,
  DEFAULT_TOKEN_NAMES,
} from './bookBuilder'
import {
  FONT_FAMILIES,
  FONT_GROUPS,
  WEIGHT_LABELS,
  labelFor,
  parseLabel,
  familyByName,
  googleCssForLabels,
} from './fontCatalog'

/**
 * The Brand Book Builder reads settings and colour names that older projects
 * do not have. Everything defaults at read time instead of via a migration,
 * so these tests stand in for the migration that isn't there: if a default
 * stops being applied, a live project opens the builder with undefined where
 * it expects a number and the page silently renders wrong.
 */

describe('bookBuilderFor', () => {
  it('gives a project with no settings a complete object', () => {
    const got = bookBuilderFor({})
    expect(got).toEqual(blankBookBuilder())
    expect(got.grid.columns).toBe(12)
    expect(got.print.pageSize).toBe('letter')
  })

  it('survives a null project', () => {
    expect(bookBuilderFor(null).type.headlineFont).toBe('Fraunces')
  })

  it('keeps sibling keys when only part of a section was saved', () => {
    /* The bug this guards: a shallow merge would replace the whole `grid`
       object with `{columns: 4}`, handing the UI undefined for rows/gutter/
       margin and rendering a grid overlay of NaN cells. */
    const got = bookBuilderFor({ bookBuilder: { grid: { columns: 4 } } })
    expect(got.grid.columns).toBe(4)
    expect(got.grid.rows).toBe(1)
    expect(got.grid.gutter).toBe(3)
    expect(got.grid.margin).toBe(9)
    expect(got.grid.show).toBe(true)
    // Untouched sections still complete.
    expect(got.running.showPageNumbers).toBe(true)
  })
})

describe('readPaletteTokens', () => {
  it('names a legacy project’s colours without any stored tokens', () => {
    const rows = readPaletteTokens({ palette: ['#111111', '#222222'] })
    expect(rows).toHaveLength(2)
    expect(rows[0].name).toBe(DEFAULT_TOKEN_NAMES[0])
    expect(rows[0].hex).toBe('#111111')
    expect(rows.every((r) => r.id)).toBe(true)
  })

  it('always returns exactly one row per palette entry', () => {
    // A colour added outside the builder has no stored name yet.
    const rows = readPaletteTokens({
      palette: ['#111111', '#222222', '#333333'],
      paletteTokens: [{ id: 'a', name: 'Harbour' }],
    })
    expect(rows).toHaveLength(3)
    expect(rows[0].name).toBe('Harbour')
    expect(rows[2].name).toBe(DEFAULT_TOKEN_NAMES[2])
    expect(rows[2].hex).toBe('#333333')
  })

  it('takes hex only from palette, never from the stored token', () => {
    // One hex, one home — a stale hex on the token must be ignored.
    const rows = readPaletteTokens({
      palette: ['#AAAAAA'],
      paletteTokens: [{ id: 'a', name: 'X', hex: '#BBBBBB' }],
    })
    expect(rows[0].hex).toBe('#AAAAAA')
  })

  it('is empty for a project with no palette', () => {
    expect(readPaletteTokens({})).toEqual([])
  })
})

describe('font labels round-trip', () => {
  it('survives labelFor → parseLabel for every family and weight', () => {
    /* Storage stays the existing label string, so this round-trip is the
       whole contract: break it and the builder's font picker silently resets
       to a default every time the view is reopened. */
    FONT_FAMILIES.forEach((f) => {
      Object.keys(WEIGHT_LABELS).forEach((w) => {
        const parsed = parseLabel(labelFor(f.name, w))
        expect(parsed.family).toBe(f.name)
        expect(parsed.weight).toBe(String(w))
      })
    })
  })

  it('reads labels that predate this registry', () => {
    expect(parseLabel('Plus Jakarta Sans Bold')).toEqual({
      family: 'Plus Jakarta Sans',
      weight: '700',
    })
    // No weight suffix at all — treat the whole string as the family.
    expect(parseLabel('Fraunces').family).toBe('Fraunces')
  })

  it('resolves every family the builder offers', () => {
    /* Derived, not restated. This used to be a literal list of the seven
       names the builder's two hardcoded arrays held, so it passed happily
       while the registry and the dropdowns drifted apart. */
    FONT_GROUPS.forEach((group) => {
      group.families.forEach((f) => {
        expect(familyByName(f.name)).toBeTruthy()
      })
    })
  })

  it('offers every registry family in exactly one group', () => {
    /* A family with a missing or misspelled category would vanish from both
       dropdowns while still looking present in FONT_FAMILIES — loadable but
       unpickable, which is how the old literals failed. */
    const grouped = FONT_GROUPS.flatMap((g) => g.families.map((f) => f.id))
    expect(grouped.slice().sort()).toEqual(
      FONT_FAMILIES.map((f) => f.id).sort()
    )
    expect(new Set(grouped).size).toBe(grouped.length)
  })
})

describe('googleCssForLabels', () => {
  it('builds one stylesheet covering every family named', () => {
    const href = googleCssForLabels([
      'Fraunces SemiBold',
      'IBM Plex Mono Regular',
    ])
    expect(href).toContain('family=Fraunces')
    expect(href).toContain('family=IBM+Plex+Mono')
  })

  it('fetches a family that no TYPE_PAIRS entry covers', () => {
    /* The bug this guards: pairs-only loading meant a family outside the
       curated list was named on screen and never fetched, so it rendered in
       the UI fallback while claiming to be something else. */
    expect(googleCssForLabels(['IBM Plex Mono Regular'])).toContain(
      'IBM+Plex+Mono'
    )
  })

  it('returns null when nothing needs fetching', () => {
    // Loaded app-wide / native — asking for them would be a wasted request.
    expect(googleCssForLabels(['Plus Jakarta Sans Bold'])).toBeNull()
    expect(googleCssForLabels([])).toBeNull()
  })
})
