/**
 * The font half of Phase 6.
 *
 * The phase's scope names one case as the trap: *"type converted to outlines
 * carries no font name, and that is the normal delivery format for brand work
 * — so silence must not read as 'clean'."* That is the first test here, and
 * it is the one that matters.
 */

import { describe, it, expect } from 'vitest'
import {
  fontsInSvg,
  markFontLine,
  markFontReading,
  svgSourceFrom,
} from './markFontCheck.js'

const dataUrl = (svg) =>
  `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`

const OUTLINED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40">
  <path d="M2 2 L20 38 L38 2 Z" fill="#1B4C7E"/>
  <path d="M44 2 h20 v36 h-20 Z" fill="#CA8A04"/>
</svg>`

const LIVE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40">
  <text x="4" y="28" font-family="Brandon Grotesque" font-size="24">Sparrow</text>
</svg>`

describe('reading the mark as a file, not as pixels', () => {
  it('decodes a base64 SVG data URL', () => {
    expect(svgSourceFrom(dataUrl(OUTLINED))).toContain('<path')
  })

  it('decodes a plain (unencoded) SVG data URL', () => {
    const url = `data:image/svg+xml,${encodeURIComponent(LIVE)}`
    expect(svgSourceFrom(url)).toContain('Brandon Grotesque')
  })

  it('has nothing to say about a raster mark', () => {
    // A PNG carries no type information of any kind. There is no honest
    // sentence about it, so there must not be one.
    expect(svgSourceFrom('data:image/png;base64,iVBORw0KGgo=')).toBeNull()
    expect(svgSourceFrom('')).toBeNull()
  })
})

describe('finding the typefaces an SVG names', () => {
  it('reads a font-family attribute', () => {
    expect(fontsInSvg(LIVE).fonts).toEqual(['Brandon Grotesque'])
    expect(fontsInSvg(LIVE).hasText).toBe(true)
  })

  it('reads one inside a style attribute or a style block', () => {
    const styled = `<svg><style>.t{font-family:'Freight Text Pro',serif}</style>
      <text style="font-family: Univers 55" x="0" y="0">x</text></svg>`
    expect(fontsInSvg(styled).fonts).toEqual(['Freight Text Pro', 'Univers 55'])
  })

  it('ignores generic fallbacks, which are not a typeface choice', () => {
    const g = `<svg><text font-family="serif, sans-serif, system-ui">x</text></svg>`
    expect(fontsInSvg(g).fonts).toEqual([])
  })

  it('does not report the same family twice', () => {
    const twice = `<svg><text font-family="Lato">a</text><text font-family="lato">b</text></svg>`
    expect(fontsInSvg(twice).fonts).toHaveLength(1)
  })

  it('sees no live text in outlined artwork', () => {
    expect(fontsInSvg(OUTLINED).hasText).toBe(false)
    expect(fontsInSvg(OUTLINED).fonts).toEqual([])
  })
})

describe('what the panel says about type', () => {
  const BRAND = { typeHeading: 'Brandon Grotesque Bold', typeBody: 'Lato Regular' }

  it('SAYS SO when the type is outlined, rather than staying quiet', () => {
    /* The requirement this half of the phase exists for. Outlining type is
       correct practice — it is how a logo renders without the font installed
       — so this is not a fault. But the check genuinely did not happen, and
       a panel that says nothing would be read as "checked, and fine". */
    const r = markFontReading({ logoImage: dataUrl(OUTLINED), ...BRAND })
    expect(r.state).toBe('outlined')
    const line = markFontLine(r)
    expect(line).toBe('Type here is outlined, so there are no font names to check.')
    expect(line).not.toMatch(/wrong|error|failed|problem/i)
  })

  it('says nothing at all about a raster mark', () => {
    // Not silence-as-clean: there is no claim being made either way, and
    // repeating "cannot check" on every PNG is the noise that teaches a
    // designer to stop reading the panel.
    const r = markFontReading({ logoImage: 'data:image/png;base64,x', ...BRAND })
    expect(r.state).toBe('not-vector')
    expect(markFontLine(r)).toBeNull()
  })

  it('recognises the brand typeface through its weight', () => {
    /* The mark names "Brandon Grotesque"; the brand field says "Brandon
       Grotesque Bold". Comparing raw labels would call those two different
       typefaces. Both go through `cssFamily` — the same extractor the
       renderer and the missing-font warning use, which exists because those
       two once disagreed and a designer was told their correct font was
       fine while it silently substituted. */
    const r = markFontReading({ logoImage: dataUrl(LIVE), ...BRAND })
    expect(r.state).toBe('live-type')
    expect(r.offBrand).toEqual([])
    expect(markFontLine(r)).toBe('Live text in Brandon Grotesque — your brand typeface.')
  })

  it('names a typeface the brand does not include, without calling it wrong', () => {
    const other = `<svg><text font-family="Comic Sans MS">x</text></svg>`
    const r = markFontReading({ logoImage: dataUrl(other), ...BRAND })
    expect(r.offBrand).toEqual(['Comic Sans MS'])
    const line = markFontLine(r)
    expect(line).toContain('Comic Sans MS')
    expect(line).toContain('substitute')
    // A logo may legitimately use a face outside the brand system.
    expect(line).not.toMatch(/wrong|should|must|fix|violation/i)
  })

  it('flags live text with no typeface named', () => {
    const bare = `<svg><text x="0" y="0">Sparrow</text></svg>`
    const r = markFontReading({ logoImage: dataUrl(bare), ...BRAND })
    expect(r.state).toBe('live-no-family')
    expect(markFontLine(r)).toMatch(/whatever the viewer has/)
  })

  it('every sentence it can produce is one plain sentence', () => {
    const cases = [
      markFontReading({ logoImage: dataUrl(OUTLINED), ...BRAND }),
      markFontReading({ logoImage: dataUrl(LIVE), ...BRAND }),
      markFontReading({ logoImage: dataUrl('<svg><text>x</text></svg>'), ...BRAND }),
    ]
    for (const r of cases) {
      const line = markFontLine(r)
      expect(line, r.state).toBeTruthy()
      expect(line.trim(), r.state).toMatch(/\.$/)
      expect(line, r.state).not.toMatch(/[!⚠✗×]/)
    }
  })
})
