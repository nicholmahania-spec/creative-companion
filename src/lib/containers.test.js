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
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../index.css'), 'utf8')

const radii = [...css.matchAll(/border-radius:\s*([^;]+?)(?:\s*!important)?;/g)].map(
  (m) => m[1].trim(),
)

/** Values that are legitimately not the corner-radius scale. */
const EXEMPT = new Set(['0', '50%'])

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

  it('never hardcodes a corner radius', () => {
    const literal = radii.filter((v) => {
      if (EXEMPT.has(v)) return false
      // Multi-corner shapes are fine as long as every part is a token or 0.
      return v
        .split(/\s+/)
        .some((part) => /^[\d.]+(px|rem|em)$/.test(part) && part !== '0')
    })
    expect(
      literal,
      'use var(--radius) / --radius-pill / --radius-none, not a literal',
    ).toEqual([])
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
