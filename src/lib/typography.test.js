/**
 * Typography guardrails.
 *
 * These are not style preferences — each one encodes a bug that actually
 * shipped and was hard to see by eye:
 *
 *  - the font stack led with a font `index.html` never loaded, so every
 *    screen silently rendered in the fallback;
 *  - 111 rules asked for font weights the loaded family doesn't ship, which
 *    round to a neighbour inconsistently;
 *  - `--text-muted` sat at 2.58:1 against a 4.5:1 floor, across 127 usages;
 *  - a hardcoded token 12k lines down shadowed the theme-aware definition
 *    above it, so the fix at the top of the file was dead code.
 *
 * A regression in any of these is invisible in review and obvious to a user,
 * which is exactly what a test is for.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
/** Shell + lazy view CSS (index.css only @imports shell after the split). */
function loadAllCss() {
  const stylesDir = resolve(here, '../styles')
  const files = readdirSync(stylesDir).filter((f) => f.endsWith('.css'))
  return files
    .map((f) => readFileSync(join(stylesDir, f), 'utf8'))
    .join('\n')
}
const css = loadAllCss()
const html = readFileSync(resolve(here, '../../index.html'), 'utf8')

/** Relative luminance per WCAG 2.x. */
function luminance(hex) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a, b) {
  const x = luminance(a)
  const y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** The `:root` (light) definition — the first one in the file. */
function lightToken(name) {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`))
  return m ? m[1].trim() : null
}

/** Definitions inside the dark theme block, which is `.app.deep`. */
function darkToken(name) {
  const start = css.indexOf('.app.deep {')
  if (start === -1) return null
  const scope = css.slice(start, start + 4000)
  const m = scope.match(new RegExp(`${name}:\\s*([^;]+);`))
  return m ? m[1].trim() : null
}

/** Last definition wins in the cascade — used to catch late overrides. */
function lastToken(name) {
  const matches = [...css.matchAll(new RegExp(`${name}:\\s*([^;]+);`, 'g'))]
  return matches.length ? matches[matches.length - 1][1].trim() : null
}

const AA_FLOOR = 4.5

describe('typography guardrails', () => {
  it('sizes type in rem, never px', () => {
    const offenders = [...css.matchAll(/font-size:\s*[\d.]+px/g)].map((m) => m[0])
    expect(offenders).toEqual([])
  })

  it('uses at most three font weights', () => {
    // Keywords (bold/normal/inherit) and 400 are fine; the rule is about how
    // many *numeric* steps the design leans on.
    const weights = new Set(
      [...css.matchAll(/font-weight:\s*(\d{3})/g)].map((m) => m[1]),
    )
    expect([...weights].sort()).toEqual(['500', '600', '700'])
  })

  it('only asks for weights the loaded family actually ships', () => {
    // Plus Jakarta Sans is requested at 500;600;700;800 in index.html.
    const requested = new Set(
      [...css.matchAll(/font-weight:\s*(\d{3})/g)].map((m) => Number(m[1])),
    )
    const familyReq = html.match(/Plus\+Jakarta\+Sans:wght@([\d;]+)/)
    expect(familyReq, 'Plus Jakarta Sans must be loaded by index.html').toBeTruthy()
    const available = new Set(familyReq[1].split(';').map(Number))
    for (const w of requested) {
      expect(available.has(w), `font-weight ${w} is not loaded`).toBe(true)
    }
  })

  it('leads --font-sans with a family index.html actually loads', () => {
    const stack = lastToken('--font-sans')
    expect(stack).toBeTruthy()
    const first = stack.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
    // A generic/system family needs no webfont; anything else must be loaded.
    const systemish = /^(system-ui|sans-serif|serif|monospace|-apple-system)$/
    if (!systemish.test(first)) {
      expect(
        html.includes(first.replace(/ /g, '+')),
        `--font-sans leads with "${first}" but index.html never loads it`,
      ).toBe(true)
    }
  })

  it('keeps --text-muted above 4.5:1 in light theme', () => {
    const muted = lightToken('--text-muted')
    expect(muted).toMatch(/^#[0-9a-fA-F]{6}$/)
    // Worst case is the canvas grey, not white.
    expect(contrast(muted, '#F5F5F5')).toBeGreaterThanOrEqual(AA_FLOOR)
    expect(contrast(muted, '#FFFFFF')).toBeGreaterThanOrEqual(AA_FLOOR)
  })

  it('keeps --text-muted above 4.5:1 in dark theme, and solid', () => {
    const muted = darkToken('--text-muted')
    expect(
      muted,
      'dark --text-muted must be a solid hex — alpha composites below the floor',
    ).toMatch(/^#[0-9a-fA-F]{6}$/)
    // Worst dark surface is --bg-muted.
    expect(contrast(muted, '#2F2F2F')).toBeGreaterThanOrEqual(AA_FLOOR)
  })

  it('never re-hardcodes --ts-mute over the theme-aware token', () => {
    const offenders = [...css.matchAll(/--ts-mute:\s*(#[0-9a-fA-F]{3,8})/g)]
    expect(
      offenders.map((m) => m[0]),
      '--ts-mute must reference var(--text-muted), not a literal colour',
    ).toEqual([])
  })

  it('never dims text-bearing .define- selectors below full opacity', () => {
    // The token check above only ever looks at colour. `.define-chapter-tab-count`
    // shipped `opacity: 0.75` directly on the count text, which composites well
    // under the 4.5:1 floor even though `--text-secondary` itself passes — an
    // opacity dimmer is the same failure as a bad colour, just invisible to a
    // token grep. This walks every rule touching a `.define-` selector and
    // fails on any sub-1 opacity that isn't a reviewed, contrast-checked
    // exception below.
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g
    const offenders = []
    let m
    while ((m = ruleRe.exec(css))) {
      const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim()
      const body = m[2]
      if (!selector || !/\.define-/.test(selector)) continue
      const opacities = [...body.matchAll(/opacity:\s*([\d.]+)/g)]
      for (const o of opacities) {
        if (Number(o[1]) < 1) offenders.push(selector)
      }
    }
    // Reviewed and contrast-checked (see comment above each in index.css):
    //  - `.is-active .define-chapter-tab-num/-count` composites to 6.98:1
    //    (light) / 7.60:1 (dark) against its own background — a deliberate
    //    secondary-emphasis affordance, not the accidental-dimming bug.
    //  - `.define-secondary` (the "Recent tasks" block) — a low-emphasis
    //    container whose text is checked separately.
    const normalize = (s) => s.replace(/\s+/g, ' ').trim()
    const ALLOWLIST = new Set(
      [
        '.define-chapter-tab.is-active .define-chapter-tab-num,\n.define-chapter-tab.is-active .define-chapter-tab-count',
        '.define-secondary',
      ].map(normalize),
    )
    const unexpected = offenders.filter((sel) => !ALLOWLIST.has(normalize(sel)))
    expect(unexpected).toEqual([])
  })

  it('sizes .define- text off the --fs scale, never a raw literal', () => {
    // Guards the ramp the same way the bare rem-vs-px check does, but scoped
    // to Define: a raw literal here is how a one-off size sneaks back in
    // between sweeps of the rest of the file.
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g
    const offenders = []
    let m
    while ((m = ruleRe.exec(css))) {
      const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim()
      const body = m[2]
      if (!selector || !/\.define-/.test(selector)) continue
      const sizes = [...body.matchAll(/font-size:\s*([^;]+);/g)]
      for (const s of sizes) {
        const val = s[1].trim()
        const allowed =
          /^var\(--fs-\d\)/.test(val) ||
          /^clamp\(/.test(val) ||
          val === 'inherit' ||
          /^[\d.]+em$/.test(val)
        if (!allowed) offenders.push(`${selector.replace(/\s+/g, ' ')} -> ${val}`)
      }
    }
    // Nothing currently needs an exception — an empty allowlist means any
    // future raw literal fails loudly instead of blending in.
    const ALLOWLIST = new Set([])
    const unexpected = offenders.filter((o) => !ALLOWLIST.has(o))
    expect(unexpected).toEqual([])
  })

  it('never lets deleted Define selectors quietly come back', () => {
    // Batch E removed these as dead — verified unused in src/**/*.jsx at the
    // time. If one of these strings reappears in index.css, either the
    // deletion regressed or someone pasted the rule back without re-adding
    // the JSX that would justify it. Either way, that's worth a loud failure
    // rather than a silent re-accumulation.
    // Define is form-only again (owner): .define-split-mood must not return
    // without an explicit request to put Refs back on overview.
    const DEAD_SELECTORS = [
      '.define-field-icon',
      '.define-icon-people',
      '.define-fab-bar',
      '.define-mobile-tabs',
      '.define-admin-body',
      '.define-dash-header',
      '.define-name-headline',
      '.define-head-row',
      '.define-studio-title',
      '.define-chapter-total',
      '.define-section-title',
      '.define-section-hint',
      '.define-split-mood',
      '.resume-banner',
    ]
    for (const selector of DEAD_SELECTORS) {
      expect(css.includes(selector), `${selector} should stay deleted`).toBe(false)
    }
  })

  it('constrains body copy to a readable measure', () => {
    const capped = [...css.matchAll(/max-width:\s*(\d+)ch/g)].map((m) => Number(m[1]))
    expect(capped.length, 'no ch-based measure found').toBeGreaterThan(0)
    // Anything claiming to cap prose must land in the 45–75 band.
    const prose = capped.filter((n) => n >= 40)
    expect(prose.length).toBeGreaterThan(0)
    for (const n of prose) expect(n).toBeLessThanOrEqual(75)
  })
})
