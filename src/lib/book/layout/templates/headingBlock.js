/**
 * The heading that opens a page: title, rule, and an optional line under it.
 *
 * WHY THIS IS ITS OWN FILE. Two templates open pages — `sectionOpen` puts a
 * full-bleed band above this, `contentOpen` puts a tracked kicker above it —
 * and beneath that chrome they were drawing the same three things at the same
 * offsets, written out twice. The two copies had already drifted by one value:
 * the section heading is set at 30 and the content heading at 32. Nothing said
 * whether that was a design decision or a typo, because there was no shared
 * definition for it to be a departure from.
 *
 * Now it is a declared parameter. `titleSize` is required rather than
 * defaulted, so a new opener has to state what it wants instead of quietly
 * inheriting whichever value happened to be written first — and the 30/32
 * difference is on the record as intended.
 *
 * This is a BLOCK, not a region: it returns boxes and the cursor it leaves
 * behind, and the template that calls it decides what surrounds them. It has
 * no id of its own because it never appears on a page alone.
 */

/** Shared design, in CSS pixels at 96dpi. `titleSize` is the caller's. */
export const HEADING_SPEC = Object.freeze({
  titleGap: 6,
  ruleTop: 8,
  ruleW: 56,
  ruleH: 3,
  subGap: 20,
  subSize: 15,
  subWidthRatio: 0.72,
  tailGap: 24,
})

/** jsPDF sets a line on its baseline; the design places each by its own size. */
export const CAP_BASELINE = 0.78
export const BODY_BASELINE = 0.82
/** The leading the sub's consumed height is reckoned in. */
export const SUB_LINE_HEIGHT = 1.5

/**
 * @param {object}   content   { title, sub }
 * @param {object}   style     { title:{color}, rule:{fill}, sub:{color} }
 * @param {object}   geometry  { margin, contentW, startY, px }
 * @param {Function} measure   (text, {face,size,width}) => string[]
 * @param {object}   spec      { titleSize } — design px, required
 * @returns {{ boxes: object[], advanceTo: number }}
 */
export function headingBlock(content, style, geometry, measure, spec) {
  const { margin, contentW, startY = 0, px } = geometry || {}
  if (typeof px !== 'function') throw new Error('headingBlock: geometry.px is required')
  if (typeof measure !== 'function') throw new Error('headingBlock: measure is required')
  if (!Number.isFinite(spec?.titleSize)) {
    throw new Error('headingBlock: spec.titleSize is required — an opener must state its own')
  }

  const boxes = []
  let y = startY

  const h1 = px(spec.titleSize)
  boxes.push({
    id: 'pageTitle',
    type: 'text',
    lines: [String(content?.title ?? '')],
    origin: { x: margin, y: y + h1 * CAP_BASELINE },
    rect: { x: margin, y, w: contentW, h: h1 },
    style: { face: 'heading', size: h1, color: style.title.color },
    z: 1,
  })
  y += h1 * CAP_BASELINE + px(HEADING_SPEC.titleGap)

  boxes.push({
    id: 'rule',
    type: 'rect',
    rect: {
      x: margin,
      y: y + px(HEADING_SPEC.ruleTop),
      w: px(HEADING_SPEC.ruleW),
      h: px(HEADING_SPEC.ruleH),
    },
    style: { fill: style.rule.fill },
    z: 1,
  })
  y += px(HEADING_SPEC.ruleTop) + px(HEADING_SPEC.ruleH)

  const sub = String(content?.sub ?? '')
  if (sub) {
    y += px(HEADING_SPEC.subGap)
    const subSize = px(HEADING_SPEC.subSize)
    const width = contentW * HEADING_SPEC.subWidthRatio
    /* The injected measurement boundary. Lines are decided here; the renderer
       draws the lines it is handed. */
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

  y += px(HEADING_SPEC.tailGap)
  return { boxes, advanceTo: y }
}
