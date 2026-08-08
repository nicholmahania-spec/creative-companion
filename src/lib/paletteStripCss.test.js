/**
 * A flex child and its flex parent must ship in the same stylesheet.
 *
 * THE DEFECT THIS PINS, measured in the built app. `.direction-palette` — the
 * row of brand swatches on the artboard, and the row you click to give a color
 * its job on Identity → Color — declared `display: flex` in `lazy-ideate.css`,
 * a sheet only `SparkView` imports. Its children, `.palette-swatch-cell` and
 * `.palette-role-swatch-btn`, declared `flex: 1` in `lazy-design.css`.
 *
 * On a cold load of Identity the container was therefore a plain block and the
 * buttons' `flex: 1` was inert: four swatches, each 0px wide and 52px tall,
 * with no way to click one. Assigning a color role — the primary interaction
 * on that screen — was impossible.
 *
 * The failure was invisible in review and intermittent in use, because CSS is
 * global once loaded: a designer who visited Research first pulled the Spark
 * chunk in and the swatches worked for the rest of the session. Whether the
 * core tool on Color functioned depended on which route they had come from.
 *
 * `docs/ONBOARDING.md` says the lazy sheets are "all loaded eagerly", which is
 * what made this look impossible. It is not true of a sheet imported only by a
 * lazily-imported view: Vite injects that stylesheet when the chunk loads, not
 * at boot. Believing the doc costs an afternoon, so the guard is a test.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const stylesDir = resolve(here, '../styles')
const sheets = Object.fromEntries(
  readdirSync(stylesDir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => [f, readFileSync(join(stylesDir, f), 'utf8')])
)

/** Sheets declaring a rule whose selector starts with `sel`. */
const declaredIn = (sel) =>
  Object.entries(sheets)
    .filter(([, text]) =>
      new RegExp(`^\\s*\\${sel}[^{;]*\\{`, 'm').test(text)
    )
    .map(([name]) => name)

describe('the palette strip', () => {
  it('declares the container and its swatches in one sheet', () => {
    const container = declaredIn('.direction-palette')
    const swatches = declaredIn('.palette-swatch-cell')
    expect(container.length).toBeGreaterThan(0)
    expect(swatches.length).toBeGreaterThan(0)
    /* Not "both are somewhere" — the same sheet, so a view that has one
       cannot be missing the other. */
    for (const sheet of container) expect(swatches).toContain(sheet)
  })

  it('still makes the row a flex row', () => {
    const [sheet] = declaredIn('.direction-palette')
    const rule = sheets[sheet].match(/\.direction-palette\s*\{([^}]*)\}/)
    expect(rule?.[1]).toMatch(/display:\s*flex/)
  })

  it('is imported by the component that renders it, not by a route', () => {
    /* `BrandArtboard` is rendered by Identity, by Review and by the export
       modal. Leaving the sheet to whichever view happened to import it is
       what produced the 0px swatches. */
    const artboard = readFileSync(
      resolve(here, '../components/BrandArtboard.jsx'),
      'utf8'
    )
    const [sheet] = declaredIn('.direction-palette')
    expect(artboard).toContain(`../styles/${sheet}`)
  })

  it('leaves no copy behind in the sheet it came from', () => {
    expect(sheets['lazy-ideate.css']).not.toContain('.direction-palette')
  })

  it('ships the Color tool’s swatch button from the same sheet', () => {
    // The one that is actually a control. If it drifts to another sheet it
    // loses its flex parent the same way the cells did.
    const [sheet] = declaredIn('.direction-palette')
    expect(declaredIn('.palette-role-swatch-btn')).toContain(sheet)
  })
})
