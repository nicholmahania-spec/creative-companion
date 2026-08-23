/**
 * Nothing the brand system draws may be invisible.
 *
 * THREE BUGS THIS PINS, all found by looking at the running app and none by
 * the 2,981 unit tests that were green while they shipped (audit F10/F11/F16).
 * They are one bug wearing three hats: a ROLE value was taken as a foreground
 * and paired with another value nobody had checked it against.
 *
 *   F11  BrandArtboard PRIMARY lockup   roles.text on roles.quiet   → 1.04:1
 *   F16  produced business card         roles.accent on roles.cover → 1.66:1
 *   F10  ".mark-concept-star.is-on"     --ts-ink on --text-primary  → 1.00:1
 *
 * None needed an exotic palette. A palette is free to hold two light colours
 * or two mid-tones, and a role's NAME promises nothing about how it pairs with
 * another role — so the pairing has to be checked where it is used.
 *
 * The fixtures below are deliberately hostile and deliberately NOT the audit's
 * palette: pinning the specific hexes that failed would let the next
 * light-on-light palette through.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { contrastRatio, inkOn, bestTextOn, mapPaletteRoles } from '../color'

/** AA body text. What all three of these surfaces are read as. */
const AA = 4.5

describe('inkOn — prefer the brand ink, never at the cost of reading it', () => {
  it('keeps the preferred ink when it is readable', () => {
    expect(inkOn('#FFFFFF', '#22201D')).toBe('#22201D')
  })

  it('drops a preferred ink that cannot be read, and returns one that can', () => {
    const out = inkOn('#FBFAF7', '#FFFFFF')
    expect(out).not.toBe('#FFFFFF')
    expect(contrastRatio(out, '#FBFAF7')).toBeGreaterThanOrEqual(AA)
  })

  it('honors a caller that asks for the large-text floor instead', () => {
    /* 3:1 is the large-text / non-text threshold. A caller setting display
       type may ask for it; the default stays the body floor. */
    const pref = '#8C8C8C' // 3.36:1 on white — clears 3, misses 4.5
    expect(contrastRatio(pref, '#FFFFFF')).toBeLessThan(AA)
    expect(contrastRatio(pref, '#FFFFFF')).toBeGreaterThanOrEqual(3)
    expect(inkOn('#FFFFFF', pref, 3)).toBe(pref)
    expect(inkOn('#FFFFFF', pref, AA)).not.toBe(pref)
  })

  it('never returns something unreadable, over a sweep of hostile pairs', () => {
    const grounds = ['#FFFFFF', '#FBFAF7', '#EDEAE3', '#8A857C', '#3F5540', '#22201D', '#000000']
    const inks = ['#FFFFFF', '#FEFEFE', '#8A857C', '#B4552D', '#3F5540', '#22201D', '#000000']
    for (const bg of grounds) {
      for (const ink of inks) {
        const out = inkOn(bg, ink)
        expect(
          contrastRatio(out, bg),
          `inkOn(${bg}, ${ink}) returned ${out}`
        ).toBeGreaterThanOrEqual(AA)
      }
    }
  })
})

/**
 * F11 — the four artboard lockup tiles.
 *
 * Mirrors BrandArtboard's own tile table. The point is that EVERY tile
 * computes its foreground: three of them already did, and the one that did not
 * was the one that failed. Asserting all four stops the next tile being added
 * with a hardcoded role.
 */
describe('F11 — every logo lockup tile is readable', () => {
  const tilesFor = (roles) => [
    { id: 'primary', bg: roles.quiet, fg: inkOn(roles.quiet, roles.text) },
    { id: 'reverse', bg: roles.cover, fg: bestTextOn(roles.cover) },
    { id: 'mono', bg: '#FAFAF9', fg: '#1C1917' },
    { id: 'accent', bg: roles.accent, fg: bestTextOn(roles.accent) },
  ]

  const PALETTES = {
    'light text role on light quiet role (the shipped failure)': {
      cover: '#B4552D', text: '#FFFFFF', quiet: '#FBFAF7', accent: '#3F5540',
    },
    'all-pale palette': {
      cover: '#EFE9DD', text: '#F4F1EA', quiet: '#FFFDF8', accent: '#E8DCC8',
    },
    'all-dark palette': {
      cover: '#14110E', text: '#1B1815', quiet: '#0A0908', accent: '#221E19',
    },
    'text role identical to quiet role': {
      cover: '#2E5C8A', text: '#F7F7F7', quiet: '#F7F7F7', accent: '#8A857C',
    },
  }

  for (const [name, roles] of Object.entries(PALETTES)) {
    it(`stays readable: ${name}`, () => {
      for (const tile of tilesFor(roles)) {
        expect(
          contrastRatio(tile.fg, tile.bg),
          `${tile.id} tile: ${tile.fg} on ${tile.bg}`
        ).toBeGreaterThanOrEqual(AA)
      }
    })
  }

  it('keeps the brand text ink when the palette allows it', () => {
    /* The fix must not flatten every brand to black-or-white. */
    const roles = { cover: '#B4552D', text: '#22201D', quiet: '#FBFAF7', accent: '#3F5540' }
    const primary = tilesFor(roles).find((t) => t.id === 'primary')
    expect(primary.fg).toBe('#22201D')
  })
})

/**
 * F16 — the produced business card.
 *
 * The card's face is `cover`; the name and title already used
 * `bestTextOn(cover)`; the brand-name line took `accent` raw. The package it
 * ships inside prints a contrast report that called that exact pair a FAIL, so
 * the deliverable contradicted its own accessibility sheet.
 */
describe('F16 — the produced business card never ships a failing pair', () => {
  const cardInks = (project) => {
    const roles = mapPaletteRoles(project.palette)
    const cover = project.colorRoles?.cover || roles.cover
    const accent = project.colorRoles?.accent || roles.accent
    return {
      cover,
      name: bestTextOn(cover),
      title: bestTextOn(cover),
      org: inkOn(cover, accent),
    }
  }

  it('swaps an accent that fails on the cover', () => {
    const project = {
      palette: ['#B4552D', '#22201D', '#FBFAF7', '#8A857C', '#3F5540'],
      colorRoles: { cover: '#B4552D', accent: '#3F5540' },
    }
    expect(contrastRatio('#3F5540', '#B4552D')).toBeLessThan(3)
    const ink = cardInks(project)
    expect(ink.org).not.toBe('#3F5540')
    expect(contrastRatio(ink.org, ink.cover)).toBeGreaterThanOrEqual(AA)
  })

  it('keeps an accent that passes on the cover', () => {
    const project = {
      palette: ['#1B1F3B', '#FFFFFF', '#F5F5F5', '#888888'],
      colorRoles: { cover: '#1B1F3B', accent: '#FFFFFF' },
    }
    const ink = cardInks(project)
    expect(ink.org).toBe('#FFFFFF')
  })

  it('every line on the card clears AA, over hostile palettes', () => {
    const cases = [
      { cover: '#B4552D', accent: '#3F5540' },
      { cover: '#FBFAF7', accent: '#FFFFFF' },
      { cover: '#222222', accent: '#111111' },
      { cover: '#8A857C', accent: '#8A857C' },
    ]
    for (const colorRoles of cases) {
      const ink = cardInks({ palette: ['#000000', '#FFFFFF'], colorRoles })
      for (const line of ['name', 'title', 'org']) {
        expect(
          contrastRatio(ink[line], ink.cover),
          `${line} on cover ${colorRoles.cover}`
        ).toBeGreaterThanOrEqual(AA)
      }
    }
  })
})

/**
 * F10 — the "★ Chosen" control, read out of the stylesheet itself.
 *
 * A component test could not have caught this: the rule was valid CSS with a
 * sensible-looking fallback (`var(--ts-ink, var(--bg-card))`). It failed
 * because `--ts-ink` is defined GLOBALLY, so the light fallback could never
 * fire and the label resolved to dark-on-dark. So this reads the real token
 * values from the real stylesheets and resolves the pair the browser would.
 */
describe('F10 — the chosen-mark control is legible', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const stylesDir = resolve(here, '../../styles')
  const css = readdirSync(stylesDir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(stylesDir, f), 'utf8'))
    .join('\n')

  /** First (`:root`, light) definition of a token, resolved through one alias. */
  const token = (name, depth = 0) => {
    const m = css.match(new RegExp(`${name}:\\s*([^;]+);`))
    if (!m) return null
    const v = m[1].trim()
    const alias = v.match(/^var\(\s*(--[\w-]+)/)
    if (alias && depth < 6) return token(alias[1], depth + 1)
    return /^#[0-9a-f]{3,8}$/i.test(v) ? v : null
  }

  const rule = (selector) => {
    const i = css.indexOf(selector)
    if (i === -1) return null
    return css.slice(i, css.indexOf('}', i))
  }

  it('resolves --ts-ink to an INK, which is what its name means', () => {
    /* If this ever becomes a light colour, the many
       `var(--ts-ink, #171717)` consumers across the codebase break instead,
       and this test says which assumption moved. */
    const ink = token('--ts-ink')
    const paper = token('--bg-canvas')
    expect(ink).toBeTruthy()
    expect(paper).toBeTruthy()
    expect(contrastRatio(ink, paper)).toBeGreaterThanOrEqual(AA)
  })

  it('paints a foreground that contrasts with its own background', () => {
    const block = rule('.mark-concept-star.is-on')
    expect(block, '.mark-concept-star.is-on missing').toBeTruthy()

    /* `[;{\s]` guards the boundary: without it `border-color:` matches the
       `color:` probe and the test reads the border token as the text token. */
    const bgVar = block.match(/[;{\s]background:\s*var\(\s*(--[\w-]+)\s*\)/)
    const fgVar = block.match(/[;{\s]color:\s*var\(\s*(--[\w-]+)/)
    expect(bgVar, 'expected a tokenized background').toBeTruthy()
    expect(fgVar, 'expected a tokenized color').toBeTruthy()

    const bg = token(bgVar[1])
    const fg = token(fgVar[1])
    expect(bg, `could not resolve ${bgVar[1]}`).toBeTruthy()
    expect(fg, `could not resolve ${fgVar[1]}`).toBeTruthy()
    expect(
      contrastRatio(fg, bg),
      `"★ Chosen" renders ${fg} on ${bg} — the state that tells the designer ` +
        `which concept is chosen must be readable.`
    ).toBeGreaterThanOrEqual(AA)
  })
})

/**
 * The consumers must actually go through the safe path.
 *
 * The behavioural blocks above prove `inkOn` is correct. They cannot prove
 * BrandArtboard and BusinessCardProduce still call it — and a revert to
 * `fg: roles.text` would leave every one of them green while the app shipped
 * the original bug again. This is the same grep-the-source guard
 * `journeySingleSource.test.js` uses for the same class of regression: a rule
 * that is right in one module and restated wrongly in another.
 */
describe('the surfaces that failed still compute their foreground', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const read = (rel) => readFileSync(resolve(here, rel), 'utf8')

  it('BrandArtboard: no lockup tile takes a raw role as its foreground', () => {
    const src = read('../../components/BrandArtboard.jsx')
    const start = src.indexOf('logo-lockup-suite')
    expect(start, 'lockup suite moved').toBeGreaterThan(-1)
    const block = src.slice(start, start + 1600)
    const rawFg = [...block.matchAll(/fg:\s*roles\.(\w+)/g)].map((m) => m[0])
    expect(
      rawFg,
      'A lockup tile is trusting a role value as a foreground again. ' +
        'Roles are independent; wrap it in inkOn(bg, preferred).'
    ).toEqual([])
    expect(block).toMatch(/fg:\s*inkOn\(/)
  })

  it('BusinessCardProduce: the org line does not take the accent raw', () => {
    const src = read('../../features/brand/BusinessCardProduce.jsx')
    expect(src).not.toMatch(/stationery-card-org"\s*style=\{\{\s*color:\s*accent\s*\}\}/)
    expect(src).toMatch(/inkOn\(cover,\s*accent\)/)
  })
})
