/**
 * The direction sheet reports the palette. It does not assign it.
 *
 * THE DEFECT THIS PINS, proved by clicking in a real browser before it was
 * fixed: `BrandArtboard` rendered an arming row — "Assign role, then click a
 * swatch" plus nine chips — and a strip of <button> swatches whose handler
 * called `onRoleAssign`. That prop was declared and passed by NO caller, so
 * every click was `undefined?.()`.
 *
 *   sheet:  arm a role, click a swatch → colorRoles stayed null
 *   tool:   arm a role, click a swatch → colorRoles = {"accent":"#1C1917"}
 *
 * It cost 261px at 1440 and 413px at 390 on all four Identity screens, and on
 * Color it put a second, inert set of nine role chips about 900px from the
 * live one, each with its own armed state. Two armed modes that look the same
 * and disagree is worse than one, and role assignment has exactly one home.
 *
 * A source grep rather than a render test, because the failure mode is a
 * control being ADDED BACK to the sheet, and the thing that made it invisible
 * for so long is that it rendered perfectly and simply did nothing.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const artboard = readFileSync(
  resolve(here, '../../components/BrandArtboard.jsx'),
  'utf8'
)
const design = readFileSync(resolve(here, '../../views/DesignView.jsx'), 'utf8')

/** Strip comments — the history above is allowed to name what it removed. */
const code = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the sheet’s palette', () => {
  const src = code(artboard)

  it('has no role-arming control', () => {
    expect(src).not.toContain('artboard-role-hint')
    expect(src).not.toContain('role-pick-chip')
    expect(src).not.toContain('setAssignRole')
  })

  it('has no click handler on its swatches', () => {
    expect(src).not.toContain('onRoleAssign')
    // The strip is never armed, so it never claims to be clickable.
    expect(src).not.toContain('is-clickable')
  })

  it('still shows the palette and which job each color holds', () => {
    // Removing the control must not remove the report.
    expect(src).toContain('direction-palette')
    expect(src).toContain('palette-swatch-cell')
    expect(src).toContain('swatch-role-badge')
    expect(src).toContain('palette-roles-row')
  })
})

describe('the Color tool', () => {
  const src = code(design)

  it('keeps the one live role picker', () => {
    expect(src).toContain('role-pick-chip')
    expect(src).toContain('palette-role-swatch-btn')
    expect(src).toContain('setColorRole')
  })

  it('keeps the armed-state announcement a screen reader depends on', () => {
    // Nine jobs multiply the number of wrong destinations; the selected state
    // must not go back to living only in a CSS class.
    expect(src).toContain('aria-pressed={brandRoleAssign === role}')
  })
})

describe('the sheet points at destinations that exist', () => {
  it('never names an Edit mode or a Logo substep', () => {
    // Identity is Mark / Color / Type / Handover. "Edit → Logo" was neither.
    expect(code(artboard)).not.toMatch(/Edit\s*(→|->)\s*Logo/)
  })
})
