/**
 * The compositor's inputs, in one place both renderers can reach.
 *
 * WHY THIS EXISTS. 10A moved the book's layout DECISIONS behind a compositor,
 * and proved it against the PDF. But the compositor's inputs — the resolved
 * colours, the page geometry, and the ruler that breaks text into lines — were
 * still computed inside `downloadBrandPackVectorPdf`'s closure and exported
 * nowhere. So the compositor was not a peer of the renderers; it was a
 * subroutine of one of them, and no second renderer could call it.
 *
 * Anything else would have meant React duplicating ~90 lines of contrast-aware
 * colour resolution and inventing its own measurement — which produces
 * DIFFERENT LINE BREAKS and therefore different geometry from the same
 * content. That is not one geometry authority; it is one algorithm with two
 * rulers, which is the defect this architecture exists to remove.
 *
 * Nothing here is new. The colour logic is lifted verbatim from the PDF
 * generator, which now consumes it rather than computing it. The extraction is
 * output-neutral by construction and is checked as such.
 */

import {
  mapPaletteRoles,
  normalizeHex,
  bestTextOn,
  contrastRatio,
  nudgeHexForContrast,
} from '../../color'
import { buildColorSystem } from '../../brandSystem'
import { resolveBookSetup } from '../brandBookSetup'

export function hexToRgb(hex) {
  const s = String(hex || '').trim().replace(/^#/, '')
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16)
    const g = parseInt(s[1] + s[1], 16)
    const b = parseInt(s[2] + s[2], 16)
    if ([r, g, b].some((n) => Number.isNaN(n))) return null
    return [r, g, b]
  }
  if (s.length === 6) {
    const r = parseInt(s.slice(0, 2), 16)
    const g = parseInt(s.slice(2, 4), 16)
    const b = parseInt(s.slice(4, 6), 16)
    if ([r, g, b].some((n) => Number.isNaN(n))) return null
    return [r, g, b]
  }
  return null
}

export const rgbToHexStr = ([r, g, b]) =>
  `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`

/** `t` of `a` over `b`. Used where the design asks for a translucent ink. */
export const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)))

export function packCoverHex(pack) {
  const roles = pack?.colorRoles || {}
  const auto = mapPaletteRoles(pack?.palette || [])
  return (
    normalizeHex(roles.cover) ||
    normalizeHex(auto.cover) ||
    normalizeHex((pack?.palette || [])[0]) ||
    '#1C1917'
  )
}

/**
 * Every colour the book paints with, derived from the project's palette.
 *
 * Lifted verbatim from `brandBookPdf.js`. The comments travel with it because
 * each one records why a value is derived rather than chosen — see `textOn`'s
 * 4.5:1 fallback and `quietOn`'s nudge, both of which exist because the design
 * asks for a tone that would otherwise fail contrast in a document that goes
 * to a client.
 */
export function buildBookStyle(pack) {
  const colors = (pack?.palette || [])
    .map((c) => normalizeHex(c) || c)
    .filter(Boolean)
  const roles = { ...mapPaletteRoles(colors), ...(pack?.colorRoles || {}) }
  const colorSys = buildColorSystem(colors, pack?.colorRoles)

  const inkHex = normalizeHex(roles.text) || packCoverHex(pack)
  const goldHex = normalizeHex(roles.accent) || colors[1] || inkHex
  /* The book's paper. The builder has always had a page-background control
     and it never reached here — the book on screen repainted and the file
     the client received did not, so the control looked like it styled the
     deliverable and did not. The chosen colour wins; the palette-derived
     quiet tone stays as the fallback for a project that never picked one.

     Everything cream-derived follows from this one value — the content
     sheet, its hairlines and tints, and the text colours computed by
     `textOn`, which falls back to a readable colour whenever the preferred
     ink would not clear 4.5:1. So a dark paper repaints the page and its
     type together rather than leaving unreadable text behind. */
  const creamHex =
    normalizeHex(pack?.bookPageBg?.pageType) ||
    normalizeHex(roles.quiet) ||
    colors[colors.length - 1] ||
    '#FAFAF9'
  /* The fourth colour the design calls "tan": the palette member that is
     none of the three roles. Where a project has only three colours it is
     mixed from the two it does have rather than invented. */
  const tanHex =
    colors.find((c) => c !== inkHex && c !== goldHex && c !== creamHex) ||
    rgbToHexStr(mixRgb(hexToRgb(goldHex) || [0, 0, 0], hexToRgb(creamHex) || [255, 255, 255], 0.45))

  const INK = hexToRgb(inkHex) || [27, 58, 47]
  const GOLD = hexToRgb(goldHex) || [196, 165, 116]
  const TAN = hexToRgb(tanHex) || [232, 220, 200]
  const CREAM = hexToRgb(creamHex) || [247, 243, 236]
  const WHITE = [255, 255, 255]
  const BLACK = [0, 0, 0]

  /** The text colour for a field of `bgHex`, preferring the book's own ink. */
  const textOn = (bgHex, preferHex) => {
    const pref = normalizeHex(preferHex)
    if (pref && contrastRatio(pref, bgHex) >= 4.5) return hexToRgb(pref)
    return hexToRgb(bestTextOn(bgHex)) || [0, 0, 0]
  }
  const ON_INK = textOn(inkHex, creamHex)
  const ON_GOLD = textOn(goldHex, inkHex)
  const ON_CREAM = textOn(creamHex, inkHex)
  const ON_TAN = textOn(tanHex, inkHex)

  /**
   * A kicker's colour on a given field.
   *
   * The design's kicker is a darkened accent (#8a7256 against #C4A574's
   * gold). Deriving it by nudging the project's own accent until it clears
   * 4.5:1 reproduces exactly that relationship for any palette, instead of
   * hard-coding one project's brown into every book.
   */
  const kickerOn = (bgHex) => {
    const n = nudgeHexForContrast(goldHex, bgHex, 4.5)
    return hexToRgb(n?.hex || goldHex) || GOLD
  }
  const KICKER_CREAM = kickerOn(creamHex)
  const KICKER_INK = kickerOn(inkHex)
  const KICKER_TAN = kickerOn(tanHex)

  /**
   * The quiet greys — footers, secondary prose, captions.
   *
   * The design asks for the page's ink at 40-55% opacity. That is a real
   * design intent (recede, don't disappear) and a real accessibility
   * problem: ink at 40% on cream measures about 2.3:1, and this document
   * carries page numbers and the studio's name to a client. So the blend is
   * taken as the design specifies it and then nudged only as far as it has
   * to go to clear 4.5:1 — the design's tone wherever the design's tone
   * already passes.
   */
  const quietOn = (fg, bg, t) => {
    const blended = rgbToHexStr(mixRgb(fg, bg, t))
    const n = nudgeHexForContrast(blended, rgbToHexStr(bg), 4.5)
    return hexToRgb(n?.hex || blended) || fg
  }
  const MUTE_CREAM = quietOn(INK, CREAM, 0.7)
  const MUTE_INK = quietOn(ON_INK, INK, 0.7)
  const FOOT_CREAM = quietOn(INK, CREAM, 0.4)
  const FOOT_INK = quietOn(ON_INK, INK, 0.45)
  const HAIRLINE = mixRgb(INK, CREAM, 0.15)

  return {
    colors, roles, colorSys,
    inkHex, goldHex, creamHex, tanHex,
    INK, GOLD, TAN, CREAM, WHITE, BLACK,
    textOn, kickerOn, quietOn,
    ON_INK, ON_GOLD, ON_CREAM, ON_TAN,
    KICKER_CREAM, KICKER_INK, KICKER_TAN,
    MUTE_CREAM, MUTE_INK, FOOT_CREAM, FOOT_INK, HAIRLINE,
  }
}

/**
 * The page, in points, plus the design-unit converter.
 *
 * `px` is the one conversion every template writes its sizes through: the
 * design is specified in CSS pixels at 96dpi and PDF units are points, so
 * every design measurement is scaled by 0.75. Both renderers take the page
 * from here so a Letter book cannot be composed at Letter and drawn at A4.
 */
export function buildBookGeometry(bookSetup) {
  const setup = resolveBookSetup(bookSetup)
  const { pageW, pageH, margin, bleed } = setup
  return {
    pageW,
    pageH,
    margin,
    bleed,
    contentW: pageW - margin * 2,
    px: (n) => n * 0.75,
    aspectRatio: pageW / pageH,
  }
}

/**
 * Text as a PDF text layer can carry it.
 *
 * Applied inside `wrap`, so line breaks are computed on the SAME string the
 * page will draw. A renderer that measured the raw text and drew the
 * sanitised one would break lines in the wrong places.
 */
export function pdfSafeText(input) {
  return String(input ?? '')
    .replace(/ | /g, ' ')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″‶]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[≥≧]/g, '>=')
    .replace(/[≤≦]/g, '<=')
    .replace(/[≈≃≅]/g, '~')
    .replace(/[★☆✦✩✪]/g, '*')
    .replace(/[•‣∙]/g, '-')
    .replace(/[→⇒➔]/g, '->')
    .replace(/[←⇐]/g, '<-')
    .replace(/[×✕✖]/g, 'x')
    .replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, '')
}

/** Face name → the type-scale role the reader's own scale multiplies. */
export const FACE_ROLE = Object.freeze({
  display: 'headline',
  heading: 'subhead',
  body: 'body',
  bodyStrong: 'body',
  bodyItalic: 'body',
})

/**
 * The ruler itself, built once and handed to whoever needs to measure.
 *
 * `faces` is passed in rather than loaded here: registering and embedding
 * fonts is asynchronous and belongs to whoever owns the jsPDF document. What
 * is shared is the ALGORITHM — which face, at which size, scaled by the
 * reader's own type scale, and where the line breaks fall.
 */
export function createMeasureHarness({ pdf, faces, typeScale = {}, typeColor = {}, px }) {
  const setFace = (face, size, rgb) => {
    const [family, style] = faces[face]
    pdf.setFont(family, style)
    const role = FACE_ROLE[face]
    const ratio = role ? Number(typeScale[role]) : null
    pdf.setFontSize(
      Number.isFinite(ratio) && ratio > 0 ? size * ratio : size
    )
    const chosen = role ? hexToRgb(typeColor[role]) : null
    const use = chosen || rgb
    if (use) pdf.setTextColor(use[0], use[1], use[2])
  }
  const wrap = (text, w) => pdf.splitTextToSize(pdfSafeText(text), w)
  return { setFace, wrap, px, measure: makePdfMeasure({ setFace, wrap, px }) }
}

/**
 * The PDF's ruler.
 *
 * Sets the face FIRST and then splits, in that order, because
 * `splitTextToSize` measures against whatever font is currently set and
 * `setFace` is where the reader's own type scale is applied.
 */
export function makePdfMeasure({ setFace, wrap, px }) {
  return (text, { face = 'body', size = px(15), width }) => {
    setFace(face, size)
    return wrap(text, width)
  }
}

/**
 * The browser's ruler — DELIBERATELY THE SAME RULER.
 *
 * It takes the identical `setFace`/`wrap` pair from a jsPDF instance running
 * in the browser rather than measuring the DOM. Measuring the DOM would be
 * cheaper and would feel more natural for a live editor, and it would break
 * the thing this phase exists to prove: a DOM ruler and a PDF ruler disagree
 * about where a line ends, so the same content would compose to two different
 * geometries and neither renderer could be called authoritative.
 *
 * jsPDF already runs client-side here — the Builder's own export and the
 * preview both generate the document in the browser — so this costs an
 * instance, not a new dependency.
 */
export function makeBrowserMeasure({ setFace, wrap, px }) {
  return makePdfMeasure({ setFace, wrap, px })
}
