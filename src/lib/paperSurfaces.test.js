/**
 * Paper does not follow the theme.
 *
 * The app has two kinds of surface and the difference is meaning, not style:
 *
 *   WORKSPACE  the app itself — canvas, cards, panels, chrome. Themed. Goes
 *              dark when the designer does.
 *   PAPER      a picture of something the client receives — the letterhead,
 *              the envelope, the email signature, the book sheet. NOT themed.
 *              A client's letterhead is white at 2am, and a preview that
 *              inverted in deep mode would be lying about what gets printed.
 *
 * This was already true in practice before it was written down: each artefact
 * surface hardcoded `#ffffff` / `#1A1A1A`, and `.app.deep` deliberately
 * restyles only the book sheet's BORDER, never its fill. But a rule that lives
 * only in four unthemed literals reads like an oversight, and the obvious
 * "tidy" — swapping them for `var(--bg-card)` / `var(--text-primary)` like
 * every neighbouring rule — would quietly turn every client preview black in
 * deep mode. Nothing would fail. It would just be wrong, on the one screen
 * whose whole job is showing the client what they are getting.
 *
 * So the tokens exist (`--paper`, `--paper-ink`, `--paper-edge`, shell.css)
 * and this test is what makes them a rule rather than a suggestion.
 *
 * IF THIS FAILS: you have either themed an artefact surface, or given `--paper`
 * a deep-mode value. Neither is the fix. If a preview genuinely needs to sit on
 * a dark ground, that is a change to the surface AROUND the sheet — see
 * `.assets-preview-frame`, which is themed on purpose — not to the sheet.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel) => readFileSync(join(repoRoot, rel), 'utf8')

/** Surfaces that represent a client-facing artefact, and the file each is in. */
const PAPER_SURFACES = [
  ['src/styles/lazy-design.css', '.stationery-letterhead'],
  ['src/styles/lazy-design.css', '.stationery-envelope'],
  ['src/styles/lazy-design.css', '.stationery-signature'],
  ['src/styles/lazy-deliver.css', '.book-preview-sheet'],
]

/** The block for `selector` as written — first declaration group only. */
function ruleBody(css, selector) {
  const at = css.indexOf(`\n${selector} {`)
  if (at === -1) return null
  const open = css.indexOf('{', at)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

describe('paper surfaces', () => {
  it('every artefact surface is declared, and paints itself with the paper tokens', () => {
    const wrong = []
    for (const [file, selector] of PAPER_SURFACES) {
      const body = ruleBody(read(file), selector)
      if (body === null) {
        // A renamed or deleted surface must be re-listed here deliberately,
        // rather than silently dropping out of the guard.
        wrong.push(`${file} ${selector}: rule not found — was it renamed?`)
        continue
      }
      if (!/background:\s*var\(--paper\)/.test(body)) {
        wrong.push(`${file} ${selector}: background is not var(--paper)`)
      }
    }
    expect(wrong, wrong.join('\n')).toEqual([])
  })

  it('no artefact surface themes its own fill or ink', () => {
    /* The specific failure this prevents: someone "fixes" the unthemed
       literals by pointing them at the workspace tokens, and every client
       preview goes black in deep mode.

       Scoped to `background` and `color` on purpose. What the sheet CASTS is
       a different question from what the sheet IS: `.book-preview-sheet`'s
       box-shadow is a themed `color-mix` over --text-primary, and that is
       right — the shadow lands on the workspace, so it belongs to the
       workspace and should darken with it. Only the fill and the ink are
       paper. The first version of this test checked the whole rule body and
       flagged that shadow, which would have argued for making a correct
       thing wrong. */
    const themed = /var\(--(bg-card|bg-canvas|bg-elevated|bg-muted|text-primary|text-secondary|ts-ink|ts-panel)\)/
    const wrong = []
    for (const [file, selector] of PAPER_SURFACES) {
      const body = ruleBody(read(file), selector)
      if (!body) continue
      for (const decl of body.split(';')) {
        if (!/^\s*(background|color)\s*:/.test(decl)) continue
        if (themed.test(decl)) {
          wrong.push(
            `${file} ${selector}: ${decl.trim()} — paper does not follow the theme`
          )
        }
      }
    }
    expect(wrong, wrong.join('\n')).toEqual([])
  })

  it('deep mode does not redefine the paper tokens', () => {
    /* --paper is declared once, on :root, and is intentionally absent from
       .app.deep. Redefining it there would theme every artefact at once from
       a single line — the cheapest possible way to break all four. */
    const shell = read('src/styles/shell.css').replace(/\/\*[\s\S]*?\*\//g, '')
    const deepBlocks = [...shell.matchAll(/\.app\.deep\s*\{([^}]*)\}/g)].map((m) => m[1])
    const offenders = deepBlocks.filter((b) => /--paper(-ink|-edge)?\s*:/.test(b))
    expect(
      offenders,
      'A .app.deep block redefines --paper*. Theme the surface around the ' +
        'sheet instead — the sheet itself is paper in both themes.'
    ).toEqual([])
  })

  it('the paper tokens are actually declared on :root', () => {
    // Guards the guard: if the tokens vanish, the assertions above would pass
    // vacuously against `var(--paper)` resolving to nothing.
    const shell = read('src/styles/shell.css')
    for (const token of ['--paper:', '--paper-ink:', '--paper-edge:']) {
      expect(shell, `${token} missing from shell.css`).toContain(token)
    }
  })
})
