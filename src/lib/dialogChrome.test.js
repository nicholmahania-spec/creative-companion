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
