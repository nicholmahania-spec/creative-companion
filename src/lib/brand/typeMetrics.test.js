import { describe, it, expect } from 'vitest'
import {
  axesForTypeface,
  cssFamily,
  fontAvailable,
  missingFonts,
  specifiedFonts,
} from './typeMetrics.js'

/**
 * The unit env is node — no canvas. These use a stub document so the LOGIC
 * is tested here and the pixel work is exercised by the browser tests.
 * A stub is honest for this: what matters below is the decision made from a
 * measurement, not the measurement itself.
 */
function stubDoc(widths) {
  return {
    createElement: () => ({
      getContext: () => ({
        set font(v) {
          this._font = v
        },
        get font() {
          return this._font
        },
        measureText: () => ({ width: widths(this?._font ?? '') }),
      }),
    }),
  }
}

/** A document where every family measures the same — i.e. nothing resolves. */
function stubAllSame() {
  return {
    createElement: () => ({
      getContext: () => ({
        font: '',
        measureText: () => ({ width: 100 }),
      }),
    }),
  }
}

/** A document where the requested family measures differently. */
function stubResolves() {
  return {
    createElement: () => ({
      getContext: () => {
        const ctx = {
          font: '',
          measureText() {
            return { width: /Trade Gothic/.test(ctx.font) ? 140 : 100 }
          },
        }
        return ctx
      },
    }),
  }
}

describe('fontAvailable', () => {
  it('reports missing when the family measures exactly like its fallback', () => {
    /* This is the whole mechanism: a font that is not installed FALLS BACK,
       so it measures identically to the thing it fell back to. */
    expect(fontAvailable('Trade Gothic Next Condensed Bold', stubAllSame())).toBe(
      false
    )
  })

  it('reports present when the family measures differently', () => {
    expect(fontAvailable('Trade Gothic Next', stubResolves())).toBe(true)
  })

  it('returns null rather than guessing when it cannot measure', () => {
    // Null is "cannot tell", which must not be confused with "missing" —
    // warning a designer their font is absent when it is not would be worse
    // than staying quiet.
    expect(fontAvailable('Whatever', undefined)).toBeNull()
    expect(fontAvailable('', stubResolves())).toBeNull()
    expect(fontAvailable('X', { createElement: () => ({}) })).toBeNull()
  })
})

describe('axesForTypeface says almost nothing, on purpose', () => {
  it('never claims warmth, formality, energy or era from a font', () => {
    /* The failure this replaces: the panel confidently reported warmth,
       formality and era for a typeface it had never looked at, which is how
       it came to tell a designer that Comic Sans matched a rugged Vermont
       leather brand. A slab serif reads "rugged" because of where you have
       seen slab serifs — that is not in the outline, so it is not claimed. */
    const a = axesForTypeface('Trade Gothic Next', stubResolves())
    expect(a.warmth).toBeNull()
    expect(a.formality).toBeNull()
    expect(a.energy).toBeNull()
    expect(a.era).toBeNull()
  })

  it('does not report a weight for a font it cannot see', () => {
    const a = axesForTypeface('Nonexistent Face', stubAllSame())
    expect(a.available).toBe(false)
    expect(a.weight).toBeNull()
  })
})

describe('missingFonts', () => {
  const project = {
    typeHeading: 'Trade Gothic Next Condensed Bold',
    typeBody: 'Freight Text Pro Book',
  }

  it('names the fonts an export would silently substitute', () => {
    /* Found in a cold-start run: the client-facing artboard printed
       "Trade Gothic Next Condensed Bold / Freight Text Pro Book" set in the
       app's default UI sans, and the PDFs did the same. A specimen in the
       wrong typeface misleads the client rather than informing them. */
    expect(missingFonts(project, stubAllSame())).toEqual([
      'Trade Gothic Next Condensed Bold',
      'Freight Text Pro Book',
    ])
  })

  it('is quiet when the fonts resolve', () => {
    expect(missingFonts({ typeHeading: 'Trade Gothic Next' }, stubResolves())).toEqual(
      []
    )
  })

  it('says nothing when it cannot tell', () => {
    expect(missingFonts(project, undefined)).toEqual([])
  })

  it('dedupes a project that uses one family for both roles', () => {
    expect(
      specifiedFonts({ typeHeading: 'Inter', typeBody: 'Inter' })
    ).toEqual(['Inter'])
  })
})

describe('cssFamily digs the real family out of a human label', () => {
  /* The app stores what a designer types, which is never a CSS family. So
     every lookup failed and the missing-font warning fired on the app's own
     presets — "System UI Bold and System UI Regular are not available" —
     which teaches the designer the warning is noise. It is not noise about
     real fonts, so that mattered. */
  it('strips weight and width from the end', () => {
    expect(cssFamily('Trade Gothic Bold Condensed No. 20')).toBe('Trade Gothic')
    expect(cssFamily('Plus Jakarta Sans Bold')).toBe('Plus Jakarta Sans')
    expect(cssFamily('Playfair Display SemiBold')).toBe('Playfair Display')
  })

  it('strips from the END only, never the middle', () => {
    // "Freight Text Pro Book" became "Freight Pro" when style words were
    // stripped anywhere: Text and Pro are the family, only Book is weight.
    expect(cssFamily('Freight Text Pro Book')).toBe('Freight Text Pro')
  })

  it('keeps a number that is part of the family name', () => {
    // Source Sans 3 and Univers 55 are families; the digits are not weights.
    expect(cssFamily('Source Sans 3 Regular')).toBe('Source Sans 3')
    expect(cssFamily('Univers 55')).toBe('Univers 55')
  })

  it('leaves a name with no style suffix alone', () => {
    expect(cssFamily('Comic Sans MS')).toBe('Comic Sans MS')
  })

  it('treats a generic family as always present', () => {
    // "System UI — native" is a preset label, not a missing font.
    expect(fontAvailable('System UI — native', undefined)).toBe(true)
  })
})
