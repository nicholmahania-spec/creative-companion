import { describe, it, expect } from 'vitest'
import {
  calibratedPalette,
  calibrationDrift,
  COVERAGE_FLOOR,
  chromaOf,
  dominantColours,
  filterBrandColours,
  intruderColours,
  isBackgroundTint,
  isSubstrate,
  mergeNearDuplicates,
  paletteCoverage,
  rgbToHex,
} from './dominantColour.js'
import { deltaE00Hex, hexToRgb } from './deltaE.js'

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

  it('survives a smear too wide for near-duplicate merging to rescue', () => {
    /* The test above passes even with bucketing switched OFF, and an audit
       proved it: setting STEP to 1 left all 175 tests green. Its smear has
       only five distinct values, so `mergeNearDuplicates` folds them back
       together afterwards and the bucketing never mattered.

       A real photographic smear has hundreds of values, and the ORDER of
       operations is what makes bucketing load-bearing: the coverage floor is
       applied BEFORE merging, so without buckets every one of those hundreds
       is individually too small to survive and there is nothing left to
       merge. The checker would then go silent on exactly the assets it
       exists to read — and silence here reads as "clean".

       Deterministic jitter, no Math.random: the same input every run. */
    const base = hexToRgb('#1B4C7E')
    const wide = []
    let seed = 7
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed
    }
    const jitter = () => (next() % 25) - 12
    for (let i = 0; i < 6000; i++) {
      wide.push(
        base.r + jitter(),
        base.g + jitter(),
        base.b + jitter(),
        255
      )
    }
    const { colours, readable } = dominantColours(new Uint8ClampedArray(wide))
    expect(readable, 'a smeared flat colour must still be readable').toBe(true)
    expect(colours.length).toBeGreaterThan(0)
    // And what comes back is still that colour, not a drifted average.
    expect(deltaE00Hex(colours[0].hex, '#1B4C7E')).toBeLessThan(3)
    /* 0.49 measured: a ±12 smear straddles two 24-wide buckets, so the
       leading one holds just under half. The point is that it CLEARS THE
       FLOOR at all — with bucketing off, every value is individually far
       below it and nothing survives to be merged. */
    expect(colours[0].coverage).toBeGreaterThan(0.4)
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

describe('paletteCoverage — the inverted check, measured on real assets', () => {
  /* These colours are the real output of running the extractor over
     Table_Cards_for_linktree.pdf, a genuine client deliverable. The asset uses
     the 100 Families gradient mark, so six of its eight extracted colours are
     gradient MIDPOINTS sitting 13–36 ΔE00 from every brand colour.

     Under the obvious rule — "flag every asset colour not in the palette" —
     those six midpoints are six false alarms on a completely correct file.
     Under this rule they generate nothing, because nothing is judged for
     merely existing. That difference is the entire reason the check is
     inverted, and it was found by measurement, not by reasoning. */
  const realAsset = [
    { hex: '#292961', coverage: 0.353 },
    { hex: '#b92233', coverage: 0.234 },
    { hex: '#473376', coverage: 0.067 },
    { hex: '#673d8c', coverage: 0.058 },
    { hex: '#a82846', coverage: 0.054 },
    { hex: '#923060', coverage: 0.046 },
    { hex: '#7b387a', coverage: 0.038 },
    { hex: '#b3243b', coverage: 0.034 },
  ]

  it('finds an approved colour that is present, and says how close', () => {
    const { found } = paletteCoverage(realAsset, ['#2B2C5F'])
    expect(found).toHaveLength(1)
    expect(found[0].as).toBe('#292961')
    expect(found[0].delta).toBeLessThan(2)
    expect(found[0].drifted).toBeUndefined()
  })

  it('marks a colour that is present but drifted', () => {
    const { found } = paletteCoverage(realAsset, ['#5B3A8E'])
    expect(found[0].drifted).toBe(true)
    expect(found[0].delta).toBeGreaterThan(2)
    expect(found[0].delta).toBeLessThanOrEqual(5)
  })

  it('generates NO finding for the six gradient midpoints', () => {
    /* The measured result that justifies the whole design. Six colours in a
       correct asset, none of them in the palette, and not one produces a
       banner. */
    const { found, missing } = paletteCoverage(realAsset, ['#2B2C5F'])
    expect(found).toHaveLength(1)
    expect(missing).toHaveLength(0)
  })

  it('reports an approved colour that is genuinely absent', () => {
    // The useful failure: a deliverable that missed a brand colour entirely.
    const { missing } = paletteCoverage(
      [{ hex: '#292961', coverage: 1 }],
      ['#2B2C5F', '#00A651']
    )
    expect(missing).toEqual(['#00A651'])
  })

  it('says nothing at all for an empty palette or an unreadable asset', () => {
    expect(paletteCoverage(realAsset, [])).toEqual({ found: [], missing: [] })
    expect(paletteCoverage([], ['#2B2C5F']).missing).toEqual(['#2B2C5F'])
  })
})

describe('measured fixes from the real PDFs', () => {
  it('merges near-duplicates, and is honest about how tight that is', () => {
    /* Real output from 5_year_Celebration.pdf: four entries at #024aaa,
       #045abe, #024ab9 and #0656af. Measured, they are 2.19–5.66 ΔE00 apart —
       so at a merge threshold of 2 NONE of them merge. That is recorded here
       rather than fixed by loosening the threshold, because loosening it to
       swallow them would also merge genuinely distinct brand colours that sit
       3–4 apart.

       It stopped mattering once the check was inverted. Under `paletteCoverage`
       nothing is reported for merely existing, so an over-split colour list
       costs nothing — it is a display detail, not a source of false alarms.
       The merge is kept for the case it does handle: true duplicates from
       renderer rounding. */
    const merged = mergeNearDuplicates([
      { hex: '#024aaa', coverage: 0.145 },
      { hex: '#034bab', coverage: 0.045 },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].coverage).toBeCloseTo(0.19, 3)

    // And the real four, which do NOT merge at this threshold:
    const real = mergeNearDuplicates([
      { hex: '#024aaa', coverage: 0.145 },
      { hex: '#045abe', coverage: 0.098 },
      { hex: '#024ab9', coverage: 0.045 },
      { hex: '#0656af', coverage: 0.034 },
    ])
    expect(real.length).toBeGreaterThan(1)
  })

  it('treats a dominant pale tint as background, not a brand colour', () => {
    /* Real output from Birth_Coach_Method_Birth_Plan.pdf: #dae7f6 at L 91.1 —
       just under the substrate ceiling — came back as 92% of the page's
       "ink", i.e. as that document's dominant brand colour. It is the paper,
       printed. Lightness alone could not separate it from a pale brand tint
       without discarding both, so dominance is the second signal. */
    expect(isBackgroundTint({ hex: '#dae7f6', coverage: 0.921 })).toBe(true)
  })

  it('does not treat a pale brand accent as background', () => {
    // Same lightness, ordinary coverage — an accent, not a page tint.
    expect(isBackgroundTint({ hex: '#dae7f6', coverage: 0.08 })).toBe(false)
  })

  /* The two cases above both use ONE colour, so between them they pin the
     coverage half of the rule and leave the lightness half free: mutating
     `lab.L > 85` all the way down to `lab.L > 0` kept both of them green.
     A rule with one of its two conditions unguarded is the shape this repo
     calls a guardrail that cannot fail. */
  it('does not treat a saturated brand colour as background, however dominant', () => {
    // A logo filling most of its own artboard is not the paper.
    expect(isBackgroundTint({ hex: '#b91c1c', coverage: 0.93 })).toBe(false)
    expect(isBackgroundTint({ hex: '#1b4c7e', coverage: 0.99 })).toBe(false)
  })

  it('holds the lightness line where the substrate argument put it', () => {
    /* #dae7f6 sits at L 91.1 and is the real page tint this rule was written
       against; #9fb8d4 is materially darker at roughly L 73 and is ink, not
       paper, even when it covers the page. */
    expect(isBackgroundTint({ hex: '#9fb8d4', coverage: 0.95 })).toBe(false)
    expect(isBackgroundTint({ hex: '#dae7f6', coverage: 0.95 })).toBe(true)
  })

  /* And the coverage line, for the same reason. The accent case above sits at
     0.08, so lowering the threshold from 0.5 to 0.1 left every test green.
     A third of a page is a large block of a pale brand colour; it is not the
     substrate, and the rule has to keep saying so. */
  it('needs real dominance, not merely a lot, before calling a tint the page', () => {
    expect(isBackgroundTint({ hex: '#dae7f6', coverage: 0.3 })).toBe(false)
    expect(isBackgroundTint({ hex: '#dae7f6', coverage: 0.49 })).toBe(false)
    /* And from above, or the threshold is only pinned on one side: every
       positive case in this file sits past 0.9, so raising the line from 0.5
       to 0.9 also went unnoticed. */
    expect(isBackgroundTint({ hex: '#dae7f6', coverage: 0.6 })).toBe(true)
  })
})

describe('intruderColours — graded, not binary, and measured on real files', () => {
  /* Real extractor output from Table_Cards_for_linktree.pdf, which uses the
     100 Families gradient mark. Six of these eight are gradient midpoints. */
  const tableCards = [
    { hex: '#292961', coverage: 0.353 },
    { hex: '#b92233', coverage: 0.234 },
    { hex: '#473376', coverage: 0.067 },
    { hex: '#673d8c', coverage: 0.058 },
    { hex: '#a82846', coverage: 0.054 },
    { hex: '#923060', coverage: 0.046 },
    { hex: '#7b387a', coverage: 0.038 },
    { hex: '#b3243b', coverage: 0.034 },
  ]
  const anchors = ['#292961', '#b92233']

  it('the BINARY rule fired five times on this correct file', () => {
    /* Kept as the record of why the rule is graded. Distance alone, with no
       coverage floor, is unusable on real brand work. */
    const binary = intruderColours(tableCards, anchors, {
      minDelta: 5,
      minCoverage: 0,
    })
    expect(binary.length).toBe(5)
  })

  it('the graded rule is silent on the same file', () => {
    expect(intruderColours(tableCards, anchors)).toEqual([])
  })

  it('coverage alone does most of the work', () => {
    // The midpoints are suppressed for being SMALL, not for being close —
    // which is why detection survives instead of being abandoned.
    expect(
      intruderColours(tableCards, anchors, { minDelta: 5, minCoverage: 0.1 })
    ).toEqual([])
  })

  it('still catches a dominant colour that is nowhere near the palette', () => {
    /* The defect PRODUCT.md §23 actually names. This is what the inverted
       check could not express: `paletteCoverage` reports "found" here, because
       the correct navy IS present — the wrong green simply sits beside it. */
    const wrong = [
      { hex: '#292961', coverage: 0.3 },
      { hex: '#00A651', coverage: 0.5 },
    ]
    const found = intruderColours(wrong, anchors)
    expect(found).toHaveLength(1)
    expect(found[0].hex).toBe('#00A651')

    /* The precise gap, stated accurately. `paletteCoverage` is not blind here
       — it notices the red is absent — but it never NAMES the green, because
       it only ever reports on palette entries. "Your red is missing" and
       "there is a large green in this that belongs to no one" are different
       findings, and only the second one tells the designer what to look at.
       Asserting that paletteCoverage returned nothing at all would have been
       an overstatement; it returns the wrong thing, which is the real point. */
    const cov = paletteCoverage(wrong, anchors)
    const named = [...cov.found.map((f) => f.as), ...cov.missing]
    expect(named, 'paletteCoverage never names the intruder').not.toContain(
      '#00A651'
    )
  })

  it('says nothing when there is no palette to judge against', () => {
    expect(intruderColours(tableCards, [])).toEqual([])
  })
})

describe('calibratedPalette — comparing like with like', () => {
  /* Real, measured numbers from the owner's own files. The Sparrow's Promise
     logo renders its red as #ff2e17; the brand guidelines specify #ED1C24.
     Same ink, two converters, ΔE00 6.14 apart — enough for the checker to call
     a correct logo off-brand, on every CMYK asset. */
  const SPARROW = [
    { spec: '#ED1C24', rendered: '#ff2e17' },
    { spec: '#32C1D6', rendered: '#45cbdb' },
  ]
  const loggedRed = { hex: '#ff2e17', coverage: 0.57 }
  const loggedCyan = { hex: '#45cbdb', coverage: 0.27 }

  it('the uncalibrated comparison calls a correct logo off-brand', () => {
    const spec = SPARROW.map((e) => e.spec)
    const { found, missing } = paletteCoverage([loggedRed, loggedCyan], spec)
    expect(missing, 'the red is reported as absent from its own logo').toContain(
      '#ED1C24'
    )
    expect(found.find((f) => f.brandHex === '#32C1D6')?.drifted).toBe(true)
  })

  it('calibrated, the same logo matches exactly', () => {
    const { compare } = calibratedPalette(SPARROW)
    const { found, missing } = paletteCoverage([loggedRed, loggedCyan], compare)
    expect(missing).toEqual([])
    expect(found).toHaveLength(2)
    for (const f of found) {
      expect(f.delta).toBeCloseTo(0, 5)
      expect(f.drifted).toBeUndefined()
    }
  })

  it('still shows the designer the hex they know', () => {
    /* The renderer's private value is not the brand's colour, and putting
       #ff2e17 in front of a designer whose guidelines say #ED1C24 would be its
       own kind of lie. */
    const { label } = calibratedPalette(SPARROW)
    expect(label('#ff2e17')).toBe('#ED1C24')
    expect(label('#45CBDB')).toBe('#32C1D6')
  })

  it('degrades to the spec when there is no calibration', () => {
    const { compare, label } = calibratedPalette([{ spec: '#1B4C7E' }])
    expect(compare).toEqual(['#1B4C7E'])
    expect(label('#1B4C7E')).toBe('#1B4C7E')
  })

  it('reports the drift it removed, as a number', () => {
    // 6.14 is past the close band — proof the uncalibrated check was wrong,
    // not merely imprecise.
    expect(calibrationDrift(SPARROW)).toBeCloseTo(6.14, 1)
    expect(calibrationDrift([{ spec: '#1B4C7E', rendered: '#1B4C7E' }])).toBe(0)
  })
})
