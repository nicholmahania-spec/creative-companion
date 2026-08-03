/**
 * Live brand palette → CSS custom properties on :root / .app.
 *
 * Design system tokens live in shell.css (:root + .app.deep). Project palette
 * roles map onto --brand-* so Identity / book previews can consume the same
 * names without Tailwind. Mutations always go through Zustand first; this
 * only reflects the active project's resolved roles into the DOM.
 */

import { mapPaletteRoles, normalizeHex } from './color'

/** Semantic brand tokens mirrored for light + deep surfaces. */
export const BRAND_CSS_VARS = [
  '--brand-primary',
  '--brand-accent',
  '--brand-ink',
  '--brand-paper',
  '--color-primary',
  '--color-accent',
  '--color-ink',
  '--color-paper',
]

/**
 * @param {object|null|undefined} project
 * @returns {{ primary: string, accent: string, ink: string, paper: string }}
 */
export function resolveBrandColors(project) {
  const palette = Array.isArray(project?.palette) ? project.palette : []
  const colors = palette.map((h) => normalizeHex(h) || h).filter(Boolean)
  const roles = {
    ...mapPaletteRoles(colors),
    ...(project?.colorRoles || {}),
  }
  return {
    primary: normalizeHex(roles.cover) || colors[0] || '#1C1917',
    accent: normalizeHex(roles.accent) || colors[1] || '#0F766E',
    ink: normalizeHex(roles.text) || colors[2] || '#1A1A1A',
    paper: normalizeHex(roles.quiet) || colors[3] || '#FAFAF9',
  }
}

/**
 * Write brand tokens onto documentElement (and optional host element).
 * @param {object|null|undefined} project
 * @param {HTMLElement|null} [host]
 */
export function applyBrandCssVars(project, host = null) {
  if (typeof document === 'undefined') return
  const { primary, accent, ink, paper } = resolveBrandColors(project)
  const targets = [document.documentElement]
  if (host && host !== document.documentElement) targets.push(host)
  const app = document.querySelector('.app')
  if (app) targets.push(app)

  for (const el of targets) {
    el.style.setProperty('--brand-primary', primary)
    el.style.setProperty('--brand-accent', accent)
    el.style.setProperty('--color-primary', primary)
    el.style.setProperty('--color-accent', accent)
    el.style.setProperty('--brand-ink', ink)
    el.style.setProperty('--brand-paper', paper)
    el.style.setProperty('--color-ink', ink)
    el.style.setProperty('--color-paper', paper)
  }
}

/** Clear project brand overrides so shell tokens resume. */
export function clearBrandCssVars() {
  if (typeof document === 'undefined') return
  const targets = [
    document.documentElement,
    document.querySelector('.app'),
  ].filter(Boolean)
  for (const el of targets) {
    for (const name of BRAND_CSS_VARS) {
      el.style.removeProperty(name)
    }
  }
}
