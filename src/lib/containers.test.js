/**
 * Container guardrails.
 *
 * The stylesheet had 426 container rules drawing seven actual shapes, and 39
 * distinct border-radius values — 4px, 6px, 8px and 10px all in play for the
 * same kind of card, because the tokens said 6/8 while a later override layer
 * hardcoded 4. Neither won, so adjacent cards had visibly different corners
 * with no rule behind it. That reads as sloppiness and can't be nudged away
 * by eye, because the cause is two systems disagreeing rather than one system
 * being slightly off.
 *
 * These tests hold the consolidation in place.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const stylesDir = resolve(here, '../styles')
const files = readdirSync(stylesDir).filter((f) => f.endsWith('.css'))
const css = files.map((f) => readFileSync(join(stylesDir, f), 'utf8')).join('\n')

/**
 * Every `border-radius`, WITH THE SELECTOR THAT OWNS IT.
 *
 * This used to collect values alone. That was enough while the only question
 * was "is it a token", and stopped being enough the moment the answer had to
 * depend on WHAT is being drawn — see the artwork rule below.
 *
 * Comments are blanked rather than deleted so reported line numbers stay
 * true to the file, and so a `{` inside prose cannot be read as a rule.
 * The selector is the text between the rule's own `{` and the boundary
 * before it, which is correct inside `@media` too: the nearest earlier brace
 * is the at-rule's, so the slice is still the rule's own prelude.
 */
function radiusDeclarations(source, file) {
  const blanked = source.replace(/\/\*[\s\S]*?\*\//g, (c) =>
    c.replace(/[^\n]/g, ' ')
  )
  const out = []
  for (const m of blanked.matchAll(
    /border-radius:\s*([^;}]+?)(?:\s*!important)?\s*[;}]/g
  )) {
    const open = blanked.lastIndexOf('{', m.index)
    const prev = Math.max(
      blanked.lastIndexOf('}', open),
      blanked.lastIndexOf('{', open - 1)
    )
    out.push({
      file,
      line: source.slice(0, m.index).split('\n').length,
      selector: blanked.slice(prev + 1, open).replace(/\s+/g, ' ').trim(),
      value: m[1].trim(),
    })
  }
  return out
}

const declarations = files.flatMap((f) =>
  radiusDeclarations(readFileSync(join(stylesDir, f), 'utf8'), f)
)
const radii = declarations.map((d) => d.value)

/** Values that are legitimately not the corner-radius scale. */
const EXEMPT = new Set(['0', '50%'])

/**
 * SCALE-MODEL ARTWORK IS NOT A CONTAINER, and this is the one thing the
 * radius rule cannot say without knowing the selector.
 *
 * The Touchpoints proofing table draws schematic specimens — a business
 * card's paper edge, a browser window with its URL bar and button, a phone
 * bezel with its screen inset, printed rules on packaging. Their corners are
 * a property of the OBJECT BEING DEPICTED, not of this app's chrome, and the
 * stage they sit on is built to keep that honest: `height capped so
 * proportion stays physical`, `container-type: inline-size`, type in `cqi`.
 * `ApplicationSpecimen.jsx` states the specimen exists so a designer can
 * judge "mark scale, type hierarchy, spacing, colour, crop, and proportion".
 *
 * Forcing `var(--radius)` (4px, the only corner size the system declares)
 * onto them is not a tidy-up, it is a redraw. Three of these rules are 3px
 * tall, so a 4px radius is scaled down by the renderer and comes out as a
 * pill; the phone's 1.35rem bezel and 1.05rem screen are a concentric pair
 * that would flatten into a rounded rectangle; and 6px window / 3px URL bar
 * / 2px button is the hierarchy that makes the browser read as a browser.
 * `.app-specimen-face` has said `Paper/material — intentional` since it was
 * written.
 *
 * `scaleRatchet.test.js` already reasons exactly this way about the type
 * ramp, exempting the sub-floor sizes inside "scale-model previews … where
 * small type is representing small type at reduced scale. Those are a
 * preview SIZE problem, not a ramp problem, and bumping them would break the
 * model." Same argument, same kind of model, different property.
 *
 * NARROW ON PURPOSE, and these are the limits that keep it honest:
 *   · it keys on the SUBJECT of the selector — the element actually being
 *     styled — so a UI container that merely sits inside a specimen is still
 *     governed;
 *   · every selector in a comma list must qualify, so one artwork class
 *     cannot smuggle a container through beside it;
 *   · it names a class prefix, never a file. `lazy-sketch.css` holds plenty
 *     of real Touchpoints chrome, and all of it stays under the rule.
 * Measured at the time of writing: it covers 14 declarations, which is the
 * twelve artwork literals plus one `50%` and one already-tokenised pill.
 */
const ARTWORK_SUBJECT = /(^|[\s>+~])\.app-specimen-[a-z-]+[^\s>+~]*$/

function isScaleModelArtwork(selector) {
  if (!selector) return false
  return selector.split(',').every((s) => ARTWORK_SUBJECT.test(s.trim()))
}

describe('container guardrails', () => {
  it('declares exactly one corner radius, plus none and pill', () => {
    const decl = (name) => {
      const m = css.match(new RegExp(`${name}:\\s*([^;]+);`))
      return m ? m[1].trim() : null
    }
    expect(decl('--radius')).toBe('4px')
    expect(decl('--radius-none')).toBe('0')
    expect(decl('--radius-pill')).toBe('999px')
    // The legacy names survive as aliases so ~130 rules didn't need touching,
    // but they must not reintroduce separate sizes.
    for (const alias of ['--radius-sm', '--radius-organic', '--radius-squircle', '--radius-node']) {
      expect(decl(alias), `${alias} must alias var(--radius)`).toBe('var(--radius)')
    }
  })

  it('never hardcodes a corner radius on one of the app\'s own containers', () => {
    const literal = declarations
      .filter((d) => {
        if (EXEMPT.has(d.value)) return false
        // Multi-corner shapes are fine as long as every part is a token or 0.
        return d.value
          .split(/\s+/)
          .some((part) => /^[\d.]+(px|rem|em)$/.test(part) && part !== '0')
      })
      .filter((d) => !isScaleModelArtwork(d.selector))
      .map((d) => `${d.file}:${d.line} ${d.selector} { border-radius: ${d.value} }`)
    expect(
      literal,
      'use var(--radius) / --radius-pill / --radius-none, not a literal',
    ).toEqual([])
  })

  /**
   * The exemption must stay an exemption.
   *
   * A rule that can be widened by accident is worse than no rule, and the
   * cheap way to widen this one is to start matching a file, a stage class,
   * or any selector that merely mentions a specimen. Each of these would
   * have let a real container through, so each is asserted against.
   */
  it('the scale-model exemption cannot swallow a UI container', () => {
    expect(isScaleModelArtwork('.app-specimen-face')).toBe(true)
    expect(isScaleModelArtwork('.app-specimen-phone-shell')).toBe(true)
    // Descendant of a specimen, but the subject is chrome — still governed.
    expect(isScaleModelArtwork('.app-specimen-face .desk-card')).toBe(false)
    // One artwork class cannot carry a container through beside it.
    expect(isScaleModelArtwork('.app-specimen-face, .desk-card')).toBe(false)
    // Neighbours in the same stylesheet are not artwork.
    expect(isScaleModelArtwork('.app-stage-field')).toBe(false)
    expect(isScaleModelArtwork('.touchpoints-empty')).toBe(false)
    expect(isScaleModelArtwork('')).toBe(false)
    /* And it stays small. If this number climbs, the prefix is being used
       for things it was not scoped to. */
    const covered = declarations.filter((d) => isScaleModelArtwork(d.selector))
    expect(covered.length).toBeLessThanOrEqual(20)
    for (const d of covered) {
      expect(d.file, 'artwork exemption reached outside the stage').toBe(
        'lazy-sketch.css'
      )
    }
  })

  it('keeps the pill spelled one way', () => {
    expect(radii.filter((v) => /^9{3,4}px$/.test(v))).toEqual([])
  })

  it('never re-hardcodes --ts-radius over the real token', () => {
    const m = css.match(/--ts-radius:\s*([^;]+);/)
    if (m) expect(m[1].trim()).toBe('var(--radius)')
  })

  it('defines the spacing and type ramps', () => {
    for (let i = 1; i <= 7; i++) {
      expect(css, `--space-${i} missing`).toMatch(new RegExp(`--space-${i}:`))
    }
    for (let i = 1; i <= 6; i++) {
      expect(css, `--fs-${i} missing`).toMatch(new RegExp(`--fs-${i}:`))
    }
    expect(css).toMatch(/--measure:\s*65ch/)
  })

  it('does not grow a sixth override layer', () => {
    // Five "lock" sections already exist and are documented in CLAUDE.md as
    // debt. Adding more is how this got unmanageable in the first place.
    const locks = [...css.matchAll(/^\s*[A-Za-z][^\n]*\block\b[^\n]*$/gim)].filter((m) =>
      /lock/i.test(m[0]),
    )
    expect(locks.length, 'new override layer added — fix the base rule instead').toBeLessThanOrEqual(
      12,
    )
  })
})
