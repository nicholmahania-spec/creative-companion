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
  titleSize: 30,
  titleGap: 6,
  ruleTop: 8,
  ruleW: 56,
  ruleH: 3,
  subGap: 20,
  subSize: 15,
  subWidthRatio: 0.72,
  tailGap: 24,
})

/* jsPDF places a single line of text on its BASELINE, and the design sets each
   one by a fraction of its own size. Named rather than repeated so the two
   ratios cannot drift apart from the values they replaced. */
const CAP_BASELINE = 0.78
const BODY_BASELINE = 0.82
/** The leading the consumed height is reckoned in. */
const SUB_LINE_HEIGHT = 1.5

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

  /* Content starts below the band. */
  let y = startY + bandH + bleed + px(SPEC.contentTop)
  const h1 = px(SPEC.titleSize)
  boxes.push({
    id: 'pageTitle',
    type: 'text',
    lines: [title],
    origin: { x: margin, y: y + h1 * CAP_BASELINE },
    rect: { x: margin, y, w: contentW, h: h1 },
    style: { face: 'heading', size: h1, color: style.title.color },
    z: 1,
  })
  y += h1 * CAP_BASELINE + px(SPEC.titleGap)

  boxes.push({
    id: 'rule',
    type: 'rect',
    rect: { x: margin, y: y + px(SPEC.ruleTop), w: px(SPEC.ruleW), h: px(SPEC.ruleH) },
    style: { fill: style.rule.fill },
    z: 1,
  })
  y += px(SPEC.ruleTop) + px(SPEC.ruleH)

  const sub = String(content?.sub ?? '')
  if (sub) {
    y += px(SPEC.subGap)
    const subSize = px(SPEC.subSize)
    const width = contentW * SPEC.subWidthRatio
    /* The injected measurement boundary. The lines are decided here; the
       renderer draws the lines it is given. */
    const lines = measure(sub, { face: 'body', size: subSize, width })
    boxes.push({
      id: 'sub',
      type: 'text',
      lines,
      origin: { x: margin, y: y + subSize * BODY_BASELINE },
      rect: { x: margin, y, w: width, h: lines.length * subSize * SUB_LINE_HEIGHT },
      style: { face: 'body', size: subSize, color: style.sub.color },
      z: 1,
    })
    y += lines.length * subSize * SUB_LINE_HEIGHT
  }

  y += px(SPEC.tailGap)

  return makeRegion({ id: 'section-open', boxes, advanceTo: y })
}

export default composeSectionOpen
