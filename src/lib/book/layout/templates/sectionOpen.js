/**
 * `section-open` — the opening region of a numbered section.
 *
 * WHAT IT IS, AND WHAT IT IS NOT. This is not a divider page. The book had
 * one once and dropped it: a full-bleed divider spread per section meant a
 * short book carried five near-blank pages before any content, and book
 * length is the first thing a client feels. What replaced it is a band across
 * the top of the section's FIRST CONTENT PAGE, carrying the two things the
 * divider was actually for — the ink/gold alternation so two sections never
 * share a field back to back, and the "NN / Section" landmark that tells a
 * reader who put the document down last week where they are.
 *
 * So the region covers the band AND the content heading beneath it, because
 * on the page they are one unit: the band supplies the section identity, and
 * the title under it needs no separate eyebrow as a result. Splitting them
 * would have meant two templates that only ever appear together and a cursor
 * handed between them for no reason.
 *
 * SIZES ARE DESIGN UNITS, NOT POINTS. Every number in `SPEC` is CSS pixels at
 * 96dpi, exactly as the design specifies them, and `geometry.px()` converts.
 * This is the convention `brandBookPdf.js` already uses and states — "every
 * size below is written as the design specifies it so the two can be read
 * side by side" — and it is why they are proportions rather than resolved
 * output: the reader's own type scale multiplies them at draw time, so a
 * point value baked in here would silently ignore that control.
 *
 * NO COLOURS, NO COPY, NO PROJECT STATE. The template receives resolved
 * colours in `style` and resolved words in `sectionSpec`/`content`. It cannot
 * reach the store, the brief, or `PAGE_FIELDS`, and it holds no brand copy of
 * its own — a template that named a field would be a second content model,
 * and a template that named a hex would be a second palette.
 */

import { makeRegion } from '../positioned'
import { CAP_BASELINE, headingBlock } from './headingBlock'

/** The design, in CSS pixels at 96dpi. See the header for why not points. */
const SPEC = Object.freeze({
  bandH: 104,
  /* Clear of the running header, which lands at `bleed + 26` flush left. At
     10px type that left 8px between it and this number, so the two
     overprinted on every section page. The band has room to move; the header
     does not without entering the bleed. */
  numTopWithHeader: 46,
  numTop: 34,
  numSize: 14,
  bandTitleSize: 30,
  bandTitleGap: 16,
  contentTop: 30,
  /* Declared, not inherited. The content opener sets its heading at 32; this
     one is deliberately a step smaller because the band above it already
     carries the section's name at 30. `headingBlock` requires the value rather
     than defaulting it, so the difference is on the record. */
  titleSize: 30,
})
/**
 * Compose the region.
 *
 * @param {object}   sectionSpec  Resolved identity: { num, titleLines, title }
 * @param {object}   content      Resolved words: { sub }
 * @param {object}   style        Resolved paint: { band:{bg,fg,accent}, title:{color},
 *                                rule:{fill}, sub:{color}, hasRunningHeader:boolean }
 * @param {object}   geometry     { pageW, margin, bleed, contentW, startY, px }
 * @param {Function} measure      (text, {face,size,width}) => string[]
 * @returns {import('../positioned').Region}
 */
export function composeSectionOpen(sectionSpec, content, style, geometry, measure) {
  const { num, titleLines, title } = sectionSpec || {}
  const { pageW, margin, bleed, contentW, startY = 0, px } = geometry || {}
  if (typeof px !== 'function') throw new Error('composeSectionOpen: geometry.px is required')
  if (typeof measure !== 'function') throw new Error('composeSectionOpen: measure is required')

  const boxes = []
  const bandH = px(SPEC.bandH)

  /* Full-bleed to the top edge, the bleed area included. */
  boxes.push({
    id: 'band',
    type: 'rect',
    rect: { x: 0, y: startY, w: pageW, h: bandH + bleed },
    style: { fill: style.band.bg },
    z: 0,
  })

  let by =
    startY + bleed + px(style.hasRunningHeader ? SPEC.numTopWithHeader : SPEC.numTop)
  const numSize = px(SPEC.numSize)
  boxes.push({
    id: 'sectionNumber',
    type: 'text',
    lines: [`${num} /`],
    origin: { x: margin, y: by },
    rect: { x: margin, y: by - numSize * CAP_BASELINE, w: contentW, h: numSize },
    style: { face: 'display', size: numSize, color: style.band.accent },
    z: 1,
  })

  const bandTitle = px(SPEC.bandTitleSize)
  by += px(SPEC.bandTitleGap) + bandTitle * CAP_BASELINE
  boxes.push({
    id: 'sectionTitle',
    type: 'text',
    lines: [titleLines.join(' ')],
    origin: { x: margin, y: by },
    rect: { x: margin, y: by - bandTitle * CAP_BASELINE, w: contentW, h: bandTitle },
    style: { face: 'display', size: bandTitle, color: style.band.fg },
    z: 1,
  })

  /* Content starts below the band, and from here the page is the same
     heading every opener draws — so it is composed once, not twice. */
  const head = headingBlock(
    { title, sub: content?.sub },
    style,
    { ...geometry, startY: startY + bandH + bleed + px(SPEC.contentTop) },
    measure,
    { titleSize: SPEC.titleSize }
  )
  boxes.push(...head.boxes)

  return makeRegion({ id: 'section-open', boxes, advanceTo: head.advanceTo })
}

export default composeSectionOpen
