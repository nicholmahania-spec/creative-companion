import { describe, it, expect } from 'vitest'
import {
  COVERAGE_FLOOR,
  chromaOf,
  dominantColours,
  filterBrandColours,
  isSubstrate,
  rgbToHex,
} from './dominantColour.js'
import { hexToRgb } from './deltaE.js'

/** Build RGBA pixel data from a list of [hex, count] pairs. */
function pixels(spec, { alpha = 255 } = {}) {
  const out = []
  for (const [hex, count] of spec) {
    const { r, g, b } = hexToRgb(hex)
    for (let i = 0; i < count; i++) out.push(r, g, b, alpha)
  }
  return new Uint8ClampedArray(out)
}

describe('the business card problem', () => {
  /* The case that decides whether this feature is worth having. A card is
     ~90% white stock with a small logo. Naive dominant-colour extraction
     returns the PAPER, which is not in the approved palette — so the checker
     fires a banner about the card's own substrate. That is a manufactured
     false positive on the most common asset in brand work, and false
     positives are what kill a checker's credibility (Dixon, Wickens &
     McCarley, Human Factors 2007: false-alarm-prone automation hurts
     performance MORE than miss-prone, because it destroys trust in the quiet
     state too). */
  const card = pixels([
    ['#FFFFFF', 900], // stock
    ['#1B4C7E', 60], // logo, the actual brand colour
    ['#111111', 40], // body text
  ])

  it('does not report the paper', () => {
    const { colours } = dominantColours(card)
    const hexes = colours.map((c) => c.hex.toUpperCase())
    expect(hexes).not.toContain('#FFFFFF')
  })

  it('does not report the body text as a brand colour', () => {
    const { colours } = dominantColours(card)
    expect(colours.map((c) => c.hex.toUpperCase())).not.toContain('#111111')
  })

  it('reports the logo colour, which is 6% of the image', () => {
    /* And this is why coverage is measured against ink rather than the whole
       image: 60 of 1000 pixels is 6% overall, but it is the entire story once
       paper and text are set aside. Against the wrong denominator the floor
       would discard the only colour that mattered. */
    const { colours } = dominantColours(card)
    expect(colours).toHaveLength(1)
    expect(colours[0].hex.toUpperCase()).toBe('#1B4C7E')
    expect(colours[0].coverage).toBeCloseTo(1, 2)
  })

  it('reports how much of the asset it set aside', () => {
    // So a caller can say "we looked at the ink, not the card" rather than
    // implying it examined everything.
    const { substrateShare } = dominantColours(card)
    expect(substrateShare).toBeCloseTo(0.94, 2)
  })
})

describe('it says when it could not read anything, instead of inventing', () => {
  /* Silence must not read as "clean". An extractor that always finds
     something always gives the checker something to complain about. */
  it('is not readable for a blank white asset', () => {
    const r = dominantColours(pixels([['#FFFFFF', 500]]))
    expect(r.readable).toBe(false)
    expect(r.colours).toEqual([])
  })

  it('is not readable for a pure greyscale scan', () => {
    const r = dominantColours(
      pixels([
        ['#FFFFFF', 400],
        ['#808080', 300],
        ['#222222', 300],
      ])
    )
    expect(r.readable).toBe(false)
  })

  it('is not readable for empty or malformed data', () => {
    expect(dominantColours(null).readable).toBe(false)
    expect(dominantColours(new Uint8ClampedArray([])).readable).toBe(false)
  })

  it('ignores transparent pixels rather than counting them as a colour', () => {
    // A logo delivered on transparency would otherwise report its own empty
    // background — the PNG equivalent of the paper problem.
    const clear = pixels([['#000000', 900]], { alpha: 0 })
    const ink = pixels([['#C8102E', 100]])
    const both = new Uint8ClampedArray([...clear, ...ink])
    const { colours } = dominantColours(both)
    expect(colours).toHaveLength(1)
    expect(colours[0].hex.toUpperCase()).toBe('#C8102E')
  })
})

describe('substrate detection', () => {
  it('treats paper, ink and shadow as substrate', () => {
    expect(isSubstrate(hexToRgb('#FFFFFF'))).toBe(true)
    expect(isSubstrate(hexToRgb('#F7F5F0'))).toBe(true) // warm stock
    expect(isSubstrate(hexToRgb('#000000'))).toBe(true)
    expect(isSubstrate(hexToRgb('#808080'))).toBe(true)
  })

  it('does not treat real brand colours as substrate', () => {
    for (const hex of ['#1B4C7E', '#C8102E', '#2E5C8A', '#F2C300']) {
      expect(isSubstrate(hexToRgb(hex)), hex).toBe(false)
    }
  })

  it('uses CIELAB chroma, not HSL saturation', () => {
    /* HSL saturation inflates at lightness extremes, so a near-black pixel
       with a hint of blue reports as vividly saturated and would sail through
       as a "brand colour". That exact mistake was made and fixed elsewhere in
       this codebase; here it would let shadow read as a brand decision. */
    const nearBlackBlue = hexToRgb('#050510')
    expect(isSubstrate(nearBlackBlue)).toBe(true)
    expect(chromaOf(nearBlackBlue)).toBeLessThan(10)
  })

  it('keeps a pale but genuinely coloured brand tint', () => {
    // A soft brand blush is a decision; #F7F5F0 stock is not. The line is
    // lightness AND chroma together, which is what separates them.
    expect(isSubstrate(hexToRgb('#E8B4B8'))).toBe(false)
  })
})

describe('quantisation survives compression', () => {
  it('groups a JPEG-smeared flat colour into one entry', () => {
    /* A photographic mockup smears a flat brand colour across hundreds of
       adjacent RGB values. Without bucketing, a solid logo fills the histogram
       with near-duplicates and nothing clears the coverage floor — the checker
       would go quiet on exactly the assets it is meant to read. */
    const smear = []
    const base = hexToRgb('#1B4C7E')
    for (let i = 0; i < 200; i++) {
      const j = i % 5
      smear.push(base.r + j, base.g + j, base.b + j, 255)
    }
    const { colours } = dominantColours(new Uint8ClampedArray(smear))
    expect(colours).toHaveLength(1)
    expect(colours[0].coverage).toBeCloseTo(1, 5)
  })
})

describe('helpers', () => {
  it('rgbToHex round-trips and clamps', () => {
    expect(rgbToHex({ r: 27, g: 76, b: 126 })).toBe('#1b4c7e')
    expect(rgbToHex({ r: -5, g: 300, b: 0 })).toBe('#00ff00')
  })

  it('filterBrandColours drops substrate from a swatch list', () => {
    expect(
      filterBrandColours(['#FFFFFF', '#1B4C7E', '#000000', 'nope', '#C8102E'])
    ).toEqual(['#1B4C7E', '#C8102E'])
  })

  it('the coverage floor is a share, not a pixel count', () => {
    expect(COVERAGE_FLOOR).toBeGreaterThan(0)
    expect(COVERAGE_FLOOR).toBeLessThan(0.05)
  })
})
