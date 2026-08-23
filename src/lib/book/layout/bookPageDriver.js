/**
 * The React side's composition driver.
 *
 * WHAT THIS IS FOR. The PDF generator composes its pages inside its own
 * closure: it owns a jsPDF document, it loads the fonts, it builds the ruler,
 * and it calls the templates. Nothing was wrong with that except that it was
 * the only thing that could. This driver is the second caller — it assembles
 * exactly the same inputs from the shared render context and calls exactly the
 * same templates, so a second surface can render the book without a second
 * idea of what the book looks like.
 *
 * THE DRIVER COMPOSES. THE RENDERER DRAWS. That split is the whole point, and
 * it is why this file exists at all rather than the React component simply
 * calling `composeRegion` itself. `PositionedPageView` must not be able to
 * reach a template, so composition happens here and arrives there as a prop —
 * a boundary enforced by the import graph, not by good intentions.
 *
 * THE RULER IS THE PDF'S. `createMeasureHarness` needs a font-prepared jsPDF
 * document, so this driver makes one in the browser purely to measure with.
 * That is deliberate and it is the reason 10B-0 existed: a DOM ruler and a PDF
 * ruler disagree about where a line ends, so measuring the DOM here would mean
 * the same content composed to two different geometries and neither renderer
 * could be called authoritative. jsPDF already runs client-side — the
 * Builder's export and its preview both generate the document in the browser —
 * so this costs an instance, not a dependency.
 */

import { composePage, composeRegion } from './compose'
import { composeSectionOpen } from './templates/sectionOpen'
import {
  buildBookGeometry,
  buildBookStyle,
  createMeasureHarness,
} from './renderContext'

/**
 * A font-prepared jsPDF document and the ruler built from it.
 *
 * Asynchronous because registering fonts is. Callers must await it and must
 * not compose before it resolves — geometry measured against the fallback
 * faces is not the geometry the book prints, and rendering it would be a
 * quietly wrong page rather than an obviously missing one.
 */
export async function createBrowserMeasureContext(pack, bookSetup) {
  const geometry = buildBookGeometry(bookSetup)
  const { jsPDF } = await import('jspdf')
  const { registerBookFonts, FACE, FALLBACK_FACE } = await import('../bookFonts')
  const pdf = new jsPDF({
    unit: 'pt',
    format: [geometry.pageW, geometry.pageH],
    compress: true,
  })
  const embedded = await registerBookFonts(pdf)
  const faces = embedded ? FACE : FALLBACK_FACE
  const harness = createMeasureHarness({
    pdf,
    faces,
    typeScale: pack?.bookTypeScale || {},
    typeColor: pack?.bookTypeColor || {},
    px: geometry.px,
  })
  return { geometry, harness, faces, embedded }
}

/**
 * The opening region of one numbered section, as a page.
 *
 * Every coordinate in the result came from `composeSectionOpen` and the shared
 * `headingBlock`. Nothing here positions anything: this function resolves the
 * paint, hands over the geometry, and wraps what comes back — the same three
 * steps `brandBookPdf.js` takes, which is what makes the two surfaces agree.
 */
export function composeSectionOpenPage(pack, section, context, { index = 0 } = {}) {
  if (!section) throw new Error('composeSectionOpenPage: a section is required')
  const { geometry, harness } = context
  const style = buildBookStyle(pack)
  const running = pack?.bookRunning || {}
  const dark = !!section.dark

  const region = composeRegion(
    composeSectionOpen,
    { num: section.num, titleLines: section.divider, title: section.page },
    { sub: section.sub || '' },
    {
      band: {
        bg: dark ? style.INK : style.GOLD,
        fg: dark ? style.ON_INK : style.ON_GOLD,
        accent: dark ? style.GOLD : style.INK,
      },
      title: { color: style.ON_CREAM },
      rule: { fill: style.GOLD },
      sub: { color: style.MUTE_CREAM },
      hasRunningHeader: !!(running.show && running.text),
    },
    {
      pageW: geometry.pageW,
      margin: geometry.margin,
      bleed: geometry.bleed,
      contentW: geometry.contentW,
      startY: 0,
      px: geometry.px,
    },
    harness.measure
  )

  return composePage({
    pageId: `section-open:${section.id}`,
    index,
    size: { w: geometry.pageW, h: geometry.pageH },
    background: { fill: style.CREAM },
    regions: [region],
  })
}

/**
 * The sheet's real proportions, for a surface that has to reserve space
 * before the ruler is ready.
 *
 * Synchronous on purpose: geometry does not need fonts, only measurement
 * does. So a page can take its correct shape immediately and fill in its
 * composed content when the harness resolves, instead of being laid out at
 * one ratio and corrected at another.
 */
export function bookPageRatio(bookSetup) {
  const { pageW, pageH } = buildBookGeometry(bookSetup)
  return pageW / pageH
}
