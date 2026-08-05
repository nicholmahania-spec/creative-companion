import { describe, it, expect } from 'vitest'
import {
  axesForColour,
  axesForPalette,
  familiesFor,
  vetoBreaches,
  vetoedFamilies,
} from './colourAxes.js'

describe('axes are read from the colour, not typed by hand', () => {
  it('an orange reads warm and a blue reads cool', () => {
    const orange = axesForColour('#F26B21')
    const blue = axesForColour('#2156F2')
    expect(orange.warmth).toBeGreaterThan(0.75)
    expect(blue.warmth).toBeLessThan(0.25)
  })

  it('a fluorescent lime has more energy than a muted sage', () => {
    expect(axesForColour('#B6FF00').energy).toBeGreaterThan(
      axesForColour('#8A9A7B').energy
    )
  })

  it('near-black is heavy, near-white is light', () => {
    expect(axesForColour('#0A0F08').weight).toBeGreaterThan(0.8)
    expect(axesForColour('#F1EDE3').weight).toBeLessThan(0.3)
  })

  it('a very dark colour is not called energetic however saturated', () => {
    // #0A0F08 is nearly black. Saturation alone would have called it loud.
    expect(axesForColour('#0A0F08').energy).toBeLessThan(0.3)
  })

  it('a near-grey reports no warmth rather than guessing one', () => {
    // The hue channel of #333 is arithmetic noise, not a temperature.
    expect(axesForColour('#333333').warmth).toBeNull()
    expect(axesForColour('#23261F').warmth).toBeNull()
  })

  it('refuses nonsense instead of returning zeros', () => {
    expect(axesForColour('not-a-colour')).toBeNull()
    expect(axesForColour('')).toBeNull()
  })
})

describe('the axes that are NOT derivable stay unsaid', () => {
  it('never claims formality or era from a hex', () => {
    /* Navy reads formal because of suits; avocado reads 1970s by
       association. Neither is in the hex. Inventing a cultural reading and
       presenting it as a measurement is the exact failure this module was
       written to correct — the whole reason the old panel could call an
       all-orange palette a match. */
    const p = axesForPalette(['#23261F', '#4C5A3C', '#8A7B63', '#F1EDE3'])
    expect(p.formality).toBeNull()
    expect(p.era).toBeNull()
    expect(p.warmth).not.toBeNull()
  })
})

describe('a palette is read by what carries it', () => {
  it('an oat neutral does not drag a loden palette to the middle', () => {
    const withNeutral = axesForPalette(['#4C5A3C', '#F1EDE3'])
    const lodenOnly = axesForPalette(['#4C5A3C'])
    // The neutral pulls, but weakly — nowhere near the halfway point.
    expect(Math.abs(withNeutral.warmth - lodenOnly.warmth)).toBeLessThan(0.25)
  })

  it('an empty palette says nothing at all', () => {
    const p = axesForPalette([])
    expect(p.warmth).toBeNull()
    expect(p.energy).toBeNull()
    expect(p.read).toEqual([])
  })

  it('THE REGRESSION: swapping a palette to orange moves the reading', () => {
    /* The cold-start failure, pinned. Old behaviour: swap the whole palette
       to the client's forbidden orange and every line still said "matches
       your strategy", because the panel read sliders rather than colours.

       Note WHICH axis catches it, because the first version of this test
       guessed wrong and the code was right: both palettes are genuinely
       WARM — harness tan and oat cream sit as far round the wheel as the
       orange does — so warmth barely separates them. What separates a
       Vermont leather palette from a highway-cone one is ENERGY: muted
       against loud, and it is a five-fold gap. The forbidden-ness of the
       orange is not a colour fact at all; that is the veto check below. */
    const loden = axesForPalette(['#23261F', '#4C5A3C', '#8A7B63', '#F1EDE3'])
    const orange = axesForPalette(['#F26B21', '#FF9E4A', '#FFF4E6'])
    expect(orange.energy).toBeGreaterThan(loden.energy * 3)
    expect(loden.energy).toBeLessThan(0.25)
    expect(orange.energy).toBeGreaterThan(0.5)
  })
})

describe('the brief reads its own vetoes back', () => {
  it('catches the ways a client actually says it', () => {
    expect(vetoedFamilies('No orange.')).toContain('orange')
    expect(vetoedFamilies('no orange — my last employer had orange trucks')).toContain('orange')
    expect(vetoedFamilies('please avoid orange')).toContain('orange')
    expect(vetoedFamilies('she hates orange')).toContain('orange')
    expect(vetoedFamilies('not hunter green, everyone does that')).toContain('green')
  })

  it('does not invent a veto from a plain mention', () => {
    // A false veto blocking a colour nobody objected to is worse than a
    // missed one — it would be the app arguing with the designer.
    expect(vetoedFamilies('the logo could be orange')).toEqual([])
    expect(vetoedFamilies('orange and cream feel right')).toEqual([])
    expect(vetoedFamilies('')).toEqual([])
  })

  it('flags a palette colour that breaks a stated veto', () => {
    /* Exactly the miss from the test run: "No orange" typed into the brief,
       shown back on the desk under OFF THE TABLE, and an all-orange palette
       reported as matching the strategy. */
    const breaches = vetoBreaches(
      ['#F26B21', '#FF9E4A', '#FFF4E6'],
      'No orange. My last employer had orange trucks and I cannot look at it.'
    )
    expect(breaches.length).toBeGreaterThan(0)
    expect(breaches[0].family).toBe('orange')
    expect(breaches.map((b) => b.hex)).toContain('#F26B21')
  })

  it('says nothing when the palette respects the brief', () => {
    expect(
      vetoBreaches(['#23261F', '#4C5A3C', '#8A7B63'], 'No orange.')
    ).toEqual([])
  })

  it('familiesFor reads a dark orange as brown too', () => {
    expect(familiesFor('#F26B21')).toContain('orange')
    expect(familiesFor('#5A3A1E')).toContain('brown')
  })
})
