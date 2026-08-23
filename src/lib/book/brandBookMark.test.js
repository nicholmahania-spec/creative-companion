/**
 * When the project has a mark, the brand book must set THAT mark.
 *
 * THE BUG THIS PINS (audit F15). Three surfaces in `brandBookPdf.js` — the
 * cover square, the four lockup tiles and the closing page — drew
 * `monogramFor(wordmark)` unconditionally, while `drawLogoSection` a few
 * hundred lines away drew the real artwork. So one PDF, generated in one call,
 * showed the client's actual mark in its clearspace diagram and an invented
 * two-letter monogram on its cover: a second mark the designer never made,
 * printed as specification on the page the client looks at first.
 *
 * The monogram is a legitimate FALLBACK for a project with no artwork, and it
 * stays. What was wrong was reaching for it when artwork existed.
 *
 * These are source-shape assertions rather than a rendered-pixel diff, and
 * that is a deliberate trade: rendering the real generator needs jsPDF plus a
 * DOM canvas, and the thing that actually broke was structural — three call
 * sites that never asked whether a mark existed. A pixel test would also have
 * passed for years, because for years every fixture had no mark.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(resolve(here, './brandBookPdf.js'), 'utf8')

/** Source with comments stripped — prose may say "monogram"; code may not
 *  reach for one without asking whether artwork exists first. */
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('the brand book prefers the real mark', () => {
  it('has exactly one painter that decides mark-or-monogram', () => {
    expect(code).toMatch(/const drawMarkOrMonogram\s*=/)
  })

  it('every monogram draw is guarded by an artwork check', () => {
    /* THE INVARIANT, stated as the thing that actually broke: a monogram may
       only be reached for after asking whether the project has a mark.
       Two painters legitimately draw one — `drawMarkOrMonogram` (the shared
       one) and `drawLogoSection`'s local `drawMark`, which draws at exact
       bounds because the clearspace and minimum-size diagrams are MEASUREMENTS
       of the mark and padding them would corrupt the spec. Both ask first.
       The cover, the lockups and the closing page did not, and that is what
       this catches. */
    const draws = [...code.matchAll(/pdf\.text\([^)]*monogram/g)]
    expect(draws.length, 'no monogram draw found at all').toBeGreaterThan(0)
    for (const m of draws) {
      const before = code.slice(Math.max(0, m.index - 700), m.index)
      expect(
        /hasMarkArt|fmt && src/.test(before),
        `A monogram is drawn at index ${m.index} without first asking ` +
          `whether the project has artwork. Route it through ` +
          `drawMarkOrMonogram.`
      ).toBe(true)
    }
  })

  it('the painter uses the artwork when there is artwork', () => {
    const i = code.indexOf('const drawMarkOrMonogram')
    const body = code.slice(i, i + 1200)
    expect(body).toMatch(/hasMarkArt/)
    expect(body).toMatch(/pdf\.addImage\(/)
    /* The monogram must come AFTER the artwork attempt, i.e. be the fallback. */
    expect(body.indexOf('pdf.addImage(')).toBeLessThan(
      body.indexOf('pdfSafeText(monogram)')
    )
  })

  it('keeps the monogram as the fallback for a project with no mark', () => {
    const i = code.indexOf('const drawMarkOrMonogram')
    const body = code.slice(i, i + 1200)
    expect(body).toMatch(/pdfSafeText\(monogram\)/)
  })

  it('the lockup sets the mark, not a monogram glyph, when art exists', () => {
    const i = code.indexOf('const lockup =')
    expect(i).toBeGreaterThan(-1)
    const body = code.slice(i, i + 1400)
    expect(body).toMatch(/hasMarkArt/)
    expect(body).toMatch(/drawMarkOrMonogram\(/)
    /* The old body was `${monogram} ${wordmark}` unconditionally. */
    expect(body).not.toMatch(/`\$\{monogram\}\s\$\{wordmark\}`/)
  })

  it('checks the ground before setting the mark on it', () => {
    /* GOLD is roles.accent, so an accent-ink mark on the accent square would
       be invisible. The painter must not gamble on the ground. */
    const i = code.indexOf('const drawMarkOrMonogram')
    const body = code.slice(i, i + 1200)
    expect(body).toMatch(/contrastRatio\(/)
  })

  it('the cover and the closing page both use the painter', () => {
    /* Three call sites: the cover square, the closing page and the lockup.
       The `const drawMarkOrMonogram =` definition does not match this. */
    const calls = [...code.matchAll(/drawMarkOrMonogram\(/g)]
    expect(calls.length).toBeGreaterThanOrEqual(3)
  })

  it('samples the mark ink so the ground check has something to check', () => {
    expect(code).toMatch(/sampleInkFromPngDataUrl/)
    expect(code).toMatch(/logoInk/)
  })
})
