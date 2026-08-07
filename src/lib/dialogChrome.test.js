import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The shared dialog chrome must live in the always-on stylesheet.
 *
 * Every overlay in the app is built from .export-overlay/.export-panel —
 * Discovery brief, Client inbox, Before/After, Overview share, Shortcuts,
 * Onboarding, the export panel, the running-to-do prompt, confirmations. Those
 * base rules were in lazy-deliver.css, which is imported by DeliverView, a
 * React.lazy chunk. Until the user happened to visit Deliver, every one of
 * those dialogs rendered with no position, no backdrop and no z-index: an
 * ordinary block in normal document flow with the page behind it visible and
 * clickable. On a cold cache that covered the entire first-run sequence, and it
 * broke the project's "modals always centre" rule at every breakpoint, because
 * align-items came from the same missing rule.
 *
 * It was invisible in review for two reasons worth remembering: it only
 * reproduces before the Deliver chunk loads, and CLAUDE.md asserted the chrome
 * already lived in shell.css. A prose claim is not a guard, so this is one.
 */
const SHELL = new URL('../styles/shell.css', import.meta.url).pathname
const LAZY_DELIVER = new URL('../styles/lazy-deliver.css', import.meta.url)
  .pathname

const shell = readFileSync(SHELL, 'utf8')
const lazyDeliver = readFileSync(LAZY_DELIVER, 'utf8')

/** Base rule = declared at column 0, i.e. not nested inside a media block. */
function hasBaseRule(css, selector) {
  return new RegExp(`^\\${selector}\\s*\\{`, 'm').test(css)
}

/** The base .export-overlay rule — the one that actually positions it. */
function baseOverlayBlock() {
  const blocks = [...shell.matchAll(/^\.export-overlay\s*\{([^}]*)\}/gm)]
  return blocks.find((m) => /position:\s*fixed/.test(m[1]))?.[1] || ''
}

describe('shared dialog chrome', () => {
  it('defines .export-overlay in the always-on shell', () => {
    expect(hasBaseRule(shell, '.export-overlay')).toBe(true)
  })

  it('defines .export-panel in the always-on shell', () => {
    expect(hasBaseRule(shell, '.export-panel')).toBe(true)
  })

  /* The specific declarations that make it a modal rather than a page block.
     A rule that exists but has lost its positioning is the same bug. */
  it('gives the overlay its positioning, stacking and backdrop', () => {
    const block = baseOverlayBlock()
    expect(block).toMatch(/position:\s*fixed/)
    expect(block).toMatch(/inset:\s*0/)
    expect(block).toMatch(/z-index:/)
    expect(block).toMatch(/background:/)
  })

  /* The project's standing UI rule: dialogs centre, never bottom/top sheets. */
  it('centres the dialog', () => {
    const block = baseOverlayBlock()
    expect(block).toMatch(/align-items:\s*center/)
    expect(block).toMatch(/justify-content:\s*center/)
  })

  /**
   * A message about a failure must not be painted underneath the thing that
   * failed.
   *
   * .action-toast sat at z-index 160, under .export-overlay's 200 and its
   * full-viewport rgba(18,18,18,0.48) backdrop. Every toast raised from inside
   * an open dialog — export failures, send failures, scan failures, "Cloud
   * sync isn't configured" on Create client dashboard — fired correctly and
   * was invisible. A beta tester pressed that button twice and reported
   * nothing happening, with nothing in the console. The toast was there the
   * whole time, behind the panel.
   */
  it('stacks the toast above every dialog layer', () => {
    const toast = /\.action-toast\s*\{([^}]*)\}/.exec(shell)?.[1] || ''
    const toastZ = Number(/z-index:\s*(\d+)/.exec(toast)?.[1])
    expect(Number.isFinite(toastZ)).toBe(true)

    const overlay = baseOverlayBlock()
    const overlayZ = Number(/z-index:\s*(\d+)/.exec(overlay)?.[1])
    expect(Number.isFinite(overlayZ)).toBe(true)

    expect(toastZ).toBeGreaterThan(overlayZ)

    /* Not just the overlay: any panel that can sit on top of it counts too,
       or the toast disappears behind whichever one is highest. */
    const allZ = [...shell.matchAll(/z-index:\s*(\d+)/g)]
      .map((m) => Number(m[1]))
      .filter((n) => n >= overlayZ && n < 9000)
    expect(Math.max(...allZ)).toBe(toastZ)
  })

  /* A z-index referencing a token nobody defines is dropped by the parser, so
     the element silently has no stacking at all. Five such declarations
     existed, on a heading, a paragraph, a badge, a button and a label row —
     the residue of a bulk edit rather than a design. */
  it('never stacks against an undefined token', () => {
    expect(shell).not.toMatch(/z-index:\s*var\(--z-/)
  })

  it('does not leave the base rules in a lazily-imported stylesheet', () => {
    expect(hasBaseRule(lazyDeliver, '.export-overlay')).toBe(false)
    expect(hasBaseRule(lazyDeliver, '.export-panel')).toBe(false)
  })

  /* Source order matters: a max-width:640px block re-declares the overlay's
     padding at equal specificity, so the base must come first or the
     small-screen fix is dead code.

     Note this file writes media-nested selectors at column 0 as well, so the
     two .export-overlay rules cannot be told apart by indentation — they are
     discriminated by what they declare. */
  it('declares the base before the small-screen override', () => {
    const blocks = [...shell.matchAll(/^\.export-overlay\s*\{([^}]*)\}/gm)]
    const base = blocks.find((m) => /position:\s*fixed/.test(m[1]))
    const override = blocks.find((m) => !/position:\s*fixed/.test(m[1]))
    expect(base).toBeTruthy()
    expect(override).toBeTruthy()
    expect(base.index).toBeLessThan(override.index)
  })
})

/**
 * Re-skinning a centred dialog into an edge-anchored bar is a whole-geometry
 * change, not a partial one.
 *
 * .desk-confirm-banner is a centred dialog. .force-break-consent-studio reuses
 * it as a full-width bottom strip — its own comment says "bottom strip, never
 * mid-canvas over work". It set left/right/bottom and stopped there, so three
 * of the base rule's geometry declarations survived and each did damage:
 * `width: min(92vw, 26rem)` stopped left:0/right:0 from stretching the box,
 * `transform: translate(-50%, -50%)` then shoved that box half off the left
 * edge, and `top: 50%` floated it at the vertical centre — the exact placement
 * the comment forbids. Measured in Chromium at 1000x800: left: -208px.
 *
 * It reached production, on a consent dialog, where the question was
 * unreadable and the On button sat under the sidebar.
 *
 * Overriding one property at a time is what failed, so this test does not
 * hardcode the three fixes. It reads the geometry the base rule declares and
 * requires the strip to answer all of it — so adding a new centring property
 * to the base fails here too, instead of silently half-applying.
 */
describe('force-break consent strip', () => {
  const GEOMETRY = ['top', 'bottom', 'left', 'right', 'width', 'transform']

  /* Comments are stripped before anything is matched. These rules carry long
     explanations that quote the very declarations under test — the note on
     .force-break-consent-studio spells out `top: 50%` as the bug it fixes — so
     a regex over the raw block reads prose as CSS and reports the opposite of
     the truth. That is not hypothetical: it made the bottom-anchoring
     assertion fail against the corrected stylesheet. */
  const decls = (block) => block.replace(/\/\*[\s\S]*?\*\//g, '')

  /** Declarations of interest inside a base rule, by property name. */
  function geometryIn(block) {
    return GEOMETRY.filter((prop) =>
      new RegExp(`(^|;)\\s*${prop}\\s*:`, 'm').test(decls(block))
    )
  }

  function blockFor(selector) {
    const m = new RegExp(`^\\${selector}\\s*\\{([^}]*)\\}`, 'm').exec(shell)
    return decls(m?.[1] || '')
  }

  const banner = decls(
    [...shell.matchAll(/^\.desk-confirm-banner\s*\{([^}]*)\}/gm)].find((m) =>
      /position:\s*fixed/.test(m[1])
    )?.[1] || ''
  )
  const strip = blockFor('.force-break-consent-studio')

  it('finds both rules in the always-on shell', () => {
    expect(banner).toBeTruthy()
    expect(strip).toBeTruthy()
  })

  it('answers every geometry property the centred base declares', () => {
    const required = geometryIn(banner)
    // Guards the guard: if the base ever stops positioning itself, the
    // assertion below would pass vacuously and prove nothing.
    expect(required).toContain('transform')
    expect(required.length).toBeGreaterThanOrEqual(4)
    expect(geometryIn(strip)).toEqual(expect.arrayContaining(required))
  })

  it('cancels the centring transform rather than re-aiming it', () => {
    expect(/transform:\s*none/.test(strip)).toBe(true)
  })

  it('is anchored to the bottom, not floated at the vertical centre', () => {
    expect(/bottom:\s*0/.test(strip)).toBe(true)
    expect(/top:\s*auto/.test(strip)).toBe(true)
    expect(/top:\s*50%/.test(strip)).toBe(false)
  })

  it('lets left/right set the width instead of an explicit box', () => {
    expect(/width:\s*auto/.test(strip)).toBe(true)
  })
})
