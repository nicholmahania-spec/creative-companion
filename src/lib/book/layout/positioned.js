/**
 * The resolved output of composition — what a renderer draws, and nothing else.
 *
 * PHASE 10A. The book is drawn twice today: once as React in the Builder and
 * once as jsPDF in `brandBookPdf.js`. They share the page spine (`bookPlan`)
 * and nothing else, so the two have already drifted — the Voice page prints a
 * different set of fields in each, and the section-opening band the PDF draws
 * has no equivalent on screen at all. Every element added to the book until
 * now had to be built twice and could diverge silently.
 *
 * The fix is not a third renderer. It is to move the DECISIONS — what appears
 * and where it goes — out of both renderers and into one compositor, leaving
 * each renderer with the part that genuinely differs: how to put ink on a
 * page. This module is the boundary between those two jobs.
 *
 * TWO SHAPES, AND WHY BOTH EXIST.
 *
 * `PositionedPage` is the eventual unit: a whole sheet. `PositionedRegion` is
 * a band of one — a run of boxes that consumes vertical space and hands the
 * cursor on. Regions exist because the book already has them: the section
 * opening is not a page, it is the top of one, and the content drawn under it
 * continues from where it stopped. Modelling that as "a page" would have been
 * a lie the first template told, and every later template would have inherited
 * it. A page is a list of regions; a region is a list of boxes.
 *
 * RESOLVED GEOMETRY LIVES HERE AND ONLY HERE. `rect` and `origin` carry
 * points, because a renderer cannot draw a column index. Persisted layout —
 * `document.composition[]` — stays grid-relative (`col`/`colSpan`/`row`/
 * `rowSpan`) so that changing the page size reflows rather than breaking.
 * Nothing in this file is ever stored on a project or frozen into a Version.
 */

/** Every box type a renderer must know how to draw. Closed on purpose. */
export const BOX_TYPES = Object.freeze(['rect', 'text'])

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

function assertRect(rect, where) {
  if (!rect || typeof rect !== 'object') throw new Error(`${where}: missing rect`)
  for (const k of ['x', 'y', 'w', 'h']) {
    if (!isNum(rect[k])) throw new Error(`${where}: rect.${k} must be a finite number`)
  }
}

/**
 * One drawable box.
 *
 * AN UNKNOWN TYPE THROWS. It would be easy to skip it and keep drawing, and
 * that is exactly the failure this codebase keeps re-learning: a book that
 * silently loses a page looks finished. A renderer that meets a box it does
 * not understand has been handed something it cannot honour, and saying so is
 * the only safe answer — see `bookDocument.js` on pages judged absent while
 * holding real text.
 */
export function assertBox(box, where = 'box') {
  if (!box || typeof box !== 'object') throw new Error(`${where}: not an object`)
  const at = `${where}[${box.id || '?'}]`
  if (!box.id) throw new Error(`${at}: every box needs an id`)
  if (!BOX_TYPES.includes(box.type)) {
    throw new Error(
      `${at}: unknown box type "${box.type}" — known types are ${BOX_TYPES.join(', ')}`
    )
  }
  assertRect(box.rect, at)
  if (!isNum(box.z)) throw new Error(`${at}: z must be a finite number`)
  if (box.type === 'text') {
    if (!Array.isArray(box.lines)) throw new Error(`${at}: text box needs lines[]`)
    if (!box.origin || !isNum(box.origin.x) || !isNum(box.origin.y)) {
      throw new Error(`${at}: text box needs a resolved origin {x,y}`)
    }
  }
  return box
}

/**
 * A run of boxes plus where the cursor ends up.
 *
 * `advanceTo` is an absolute y, not a height, because the caller's cursor is
 * absolute and converting between the two at every call site is how off-by-one
 * layout bugs get in.
 */
export function makeRegion({ id, boxes = [], advanceTo }) {
  if (!id) throw new Error('region: needs an id')
  if (!isNum(advanceTo)) throw new Error(`region[${id}]: advanceTo must be a finite number`)
  boxes.forEach((b, i) => assertBox(b, `region[${id}].boxes[${i}]`))
  return Object.freeze({ id, boxes: Object.freeze([...boxes]), advanceTo })
}

export function assertRegion(region, where = 'region') {
  if (!region || typeof region !== 'object') throw new Error(`${where}: not an object`)
  if (!region.id) throw new Error(`${where}: needs an id`)
  if (!isNum(region.advanceTo)) throw new Error(`${where}[${region.id}]: advanceTo must be a number`)
  if (!Array.isArray(region.boxes)) throw new Error(`${where}[${region.id}]: boxes must be an array`)
  region.boxes.forEach((b, i) => assertBox(b, `${where}[${region.id}].boxes[${i}]`))
  return region
}

/**
 * A whole sheet.
 *
 * Present in 10A so the region contract is not the only thing later templates
 * have to aim at, but deliberately thin: there is no pagination engine here
 * and `continues` is carried rather than computed. The PDF's existing cursor
 * and continuation logic still own that, and 10C is where it moves.
 *
 * `boxes` is the flattened draw list in region order — renderers that do not
 * care about region structure read it and ignore `regions`.
 */
export function makePage({ pageId, index, size, background = null, regions = [], continues = false }) {
  if (!pageId) throw new Error('page: needs a pageId')
  if (!isNum(index)) throw new Error(`page[${pageId}]: index must be a finite number`)
  if (!size || !isNum(size.w) || !isNum(size.h)) {
    throw new Error(`page[${pageId}]: size {w,h} must be finite numbers`)
  }
  regions.forEach((r, i) => assertRegion(r, `page[${pageId}].regions[${i}]`))
  const boxes = regions.flatMap((r) => r.boxes)
  return Object.freeze({
    pageId,
    index,
    size: Object.freeze({ ...size }),
    background: background ? Object.freeze({ ...background }) : null,
    regions: Object.freeze([...regions]),
    boxes: Object.freeze(boxes),
    continues: !!continues,
  })
}
