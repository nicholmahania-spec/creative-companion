/**
 * The font half of Phase 6, on the surface where it is actually answerable.
 *
 * The phase's scope is specific about this, and about the trap in it:
 *
 *   "Say plainly when a file could not be read. Type converted to outlines
 *    carries no font name, and that is the normal delivery format for brand
 *    work — so silence must not read as 'clean'."
 *
 * That was written with PDFs in mind and read as blocked, because uploads
 * accept `image/*` and no PDF ever reaches the app. But SVG is in that set,
 * and an SVG is exactly where outlined-versus-live type is visible: live type
 * carries `font-family`, outlined type is paths and carries nothing at all.
 * So the case the phase names — a file whose type cannot be checked, which
 * must not be reported as fine — is reachable today.
 *
 * WHAT THIS DOES NOT DO: guess. A raster mark carries no type information of
 * any kind, and there is nothing honest to say about it, so nothing is said.
 * Announcing "I could not read the fonts" on every PNG would be noise on the
 * common case, which is how a designer learns to ignore the panel — and then
 * ignores the one line that mattered.
 */

import { cssFamily } from './typeMetrics.js'

/**
 * The SVG source behind an uploaded mark, or null if it is not one.
 *
 * Marks are stored as data URLs. An SVG survives upload with its source
 * intact as long as it is under the stored-image dimension cap — over it,
 * `downscaleDataUrl` rasterises to PNG/JPEG and the type information is gone
 * before this ever sees it. That is a real limit and the reason `not-vector`
 * is a legitimate answer rather than a failure.
 */
export function svgSourceFrom(dataUrl) {
  const s = String(dataUrl || '')
  if (!s.startsWith('data:image/svg+xml')) return null
  const comma = s.indexOf(',')
  if (comma < 0) return null
  const head = s.slice(0, comma)
  const body = s.slice(comma + 1)
  try {
    if (/;base64/i.test(head)) {
      /* `atob` gives one byte per char; an SVG can carry any UTF-8 (a name
         like "Futura Neue Ü", a curly apostrophe), so the bytes go through
         TextDecoder rather than being read as latin-1. NOT `Buffer` — that
         is a node global, undefined in the browser this actually runs in,
         and the lint gate caught it as a crash waiting to happen. */
      const bin = atob(body)
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
      return new TextDecoder().decode(bytes)
    }
    return decodeURIComponent(body)
  } catch {
    return null
  }
}

/**
 * Families named in an SVG, and whether it carries live text at all.
 *
 * Deliberately a scan rather than a DOM parse: this has to run in a node test
 * environment with no DOMParser, and the shapes that matter — a `font-family`
 * attribute, the same inside a `style=`, and one inside a `<style>` block —
 * are all the same token.
 */
export function fontsInSvg(svg) {
  const src = String(svg || '')
  const hasText = /<text[\s>]|<tspan[\s>]/i.test(src)
  const fonts = []
  const push = (raw) => {
    for (const part of String(raw).split(',')) {
      const name = part.trim().replace(/^['"]|['"]$/g, '')
      if (!name) continue
      // Generic CSS keywords are a fallback, not a typeface choice.
      if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|inherit|initial)$/i.test(name)) {
        continue
      }
      if (!fonts.some((f) => f.toLowerCase() === name.toLowerCase())) fonts.push(name)
    }
  }
  for (const m of src.matchAll(/font-family\s*[:=]\s*("([^"]*)"|'([^']*)'|([^;"'>}]+))/gi)) {
    push(m[2] ?? m[3] ?? m[4] ?? '')
  }
  return { fonts, hasText }
}

/**
 * @param {{ logoImage?: string, typeHeading?: string, typeBody?: string }} args
 * @returns {{ state: 'not-vector'|'outlined'|'live-type'|'live-no-family',
 *             fonts: string[], offBrand: string[] }}
 */
export function markFontReading({ logoImage, typeHeading, typeBody } = {}) {
  const svg = svgSourceFrom(logoImage)
  if (!svg) return { state: 'not-vector', fonts: [], offBrand: [] }

  const { fonts, hasText } = fontsInSvg(svg)

  /* THE SENTENCE THIS PHASE EXISTS FOR. Outlined type is not a fault — it is
     the normal, correct delivery format for a logo, precisely so it renders
     without the font installed. What matters is that the panel says the check
     did not happen, instead of staying quiet and being read as "fine". */
  if (!hasText) return { state: 'outlined', fonts: [], offBrand: [] }
  if (!fonts.length) return { state: 'live-no-family', fonts: [], offBrand: [] }

  /* Compared by FAMILY, through the same extractor the renderer and the
     missing-font warning use. Comparing raw labels would call "Plus Jakarta
     Sans" and "Plus Jakarta Sans Bold" different typefaces — and those two
     drifting apart is a defect this codebase has already had once. */
  const brand = [typeHeading, typeBody]
    .map((t) => cssFamily(t))
    .filter(Boolean)
    .map((t) => t.toLowerCase())
  const offBrand = fonts.filter(
    (f) => !brand.some((b) => cssFamily(f).toLowerCase() === b)
  )
  return { state: 'live-type', fonts, offBrand }
}

const list = (items) =>
  items.length > 1
    ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
    : items[0] || ''

/**
 * One sentence, or none. Kept beside the reading for the same reason the
 * colour copy is: nothing in this suite renders a view, so wording that lives
 * only in JSX is wording nothing checks.
 *
 * @returns {string|null} null means say nothing at all
 */
export function markFontLine(reading) {
  if (!reading || reading.state === 'not-vector') return null

  if (reading.state === 'outlined') {
    return 'Type here is outlined, so there are no font names to check.'
  }
  if (reading.state === 'live-no-family') {
    return 'This mark has live text with no typeface named, so it will render in whatever the viewer has.'
  }
  if (!reading.offBrand.length) {
    return `Live text in ${list(reading.fonts)} — your brand typeface.`
  }
  /* Named, not judged. Live text in a mark is a real risk worth stating —
     it substitutes on any machine without the font — but a logo legitimately
     uses a typeface that is not in the brand's own system, so this reports
     the fact and leaves the decision where it belongs. */
  return `Live text in ${list(reading.fonts)}, which your brand typefaces do not include — it will substitute on a machine without it.`
}
