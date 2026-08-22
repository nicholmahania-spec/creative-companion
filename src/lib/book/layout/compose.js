/**
 * The composition boundary.
 *
 * One rule, and everything else in this directory follows from it:
 *
 *   THE COMPOSITOR DECIDES WHAT APPEARS AND WHERE IT GOES.
 *   THE RENDERER DECIDES HOW TO PUT IT ON A PAGE.
 *
 * A renderer may convert units, resolve a font, embed an image and draw a
 * rectangle. It may not choose which fields print, break a line, compute a
 * position, or drop a box it does not recognise. Those are the decisions that
 * were being made twice, in two languages, with nothing holding them together.
 *
 * MEASUREMENT IS INJECTED, NOT IMPORTED. Breaking text into lines is the one
 * decision that genuinely needs the platform: only jsPDF knows how wide a
 * string is in the font it has embedded, and only the browser knows how wide
 * it is on screen. So the platform supplies `measure` and the compositor keeps
 * the decision — where the break falls is settled once, here, and the two
 * renderers draw the same lines instead of each arriving at their own.
 *
 * That is why `measure` is a parameter rather than something a template
 * imports. A template that reached for `pdf.splitTextToSize` would be a PDF
 * template, and the second renderer would need its own copy of it — which is
 * the defect, restated one layer down.
 */

import { assertRegion, makePage } from './positioned'

/**
 * Run a template and hold it to the contract.
 *
 * Templates are plain functions. This wrapper exists so a template that
 * returns something malformed fails at the composition boundary, naming
 * itself, rather than surfacing later as a box the renderer cannot draw or —
 * far worse — as an element that quietly never appeared.
 */
export function composeRegion(template, ...args) {
  if (typeof template !== 'function') throw new Error('composeRegion: template must be a function')
  const name = template.name || 'anonymous'
  const region = template(...args)
  if (!region) throw new Error(`composeRegion(${name}): returned nothing`)
  return assertRegion(region, `composeRegion(${name})`)
}

/**
 * Assemble composed regions into a sheet.
 *
 * Thin on purpose in 10A — the PDF still owns its page cursor and its
 * continuation rules, and this does not try to take them. It establishes the
 * shape the later templates compose into.
 */
export function composePage({ pageId, index, size, background, regions = [], continues = false }) {
  return makePage({ pageId, index, size, background, regions, continues })
}
