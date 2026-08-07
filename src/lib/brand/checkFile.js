/**
 * Turn a file a designer just exported from Illustrator into a colour sample.
 *
 * This is the piece that makes the consistency check reach real work. Until
 * now the only image the app could read was the mark, because the mark was
 * the only thing with an upload — and a checker that can only ever look at
 * the logo cannot answer the question the phase exists to answer, which is
 * "does this business card use the brand's colours?".
 *
 * PDF IS THE POINT, AND IT IS ALREADY PAID FOR. Brand deliverables leave
 * Illustrator and InDesign as PDF; that is the format the work exists in.
 * `pdfjs-dist` is a runtime dependency and is already dynamically imported
 * twice in src/ (`BrandBookPreview.jsx`, `overviewOcr.js`), so the cost of
 * reading one here is a lazy chunk that only loads when someone actually
 * drops a PDF. Nothing eager grows.
 *
 * THE COLOUR-MANAGEMENT WORRY IS MEASURED, NOT ASSUMED. A CMYK ink specified
 * as #ED1C24 renders through pdf.js as #ff2e17 — ΔE00 6.14 (recorded in
 * `dominantColour.js`'s `calibratedPalette` header, from the owner's own
 * files). The intruder threshold is 15. So the renderer's drift is roughly
 * 40% of the distance needed to fire, and the acceptance run confirmed it:
 * zero findings across nine renderings of correct artwork. That headroom is
 * why this path is safe to ship, and it is also why this check will never
 * catch a *slightly* wrong colour — the drift and the real error live in the
 * same band.
 *
 * NOTHING HERE IS STORED. The caller keeps the RESULT — five hexes and their
 * coverages, a couple of hundred bytes — and throws the pixels away. The
 * artwork stays in the designer's own tools, which is the whole product
 * thesis, and localStorage never sees a deliverable.
 */

import { mergeNearDuplicates } from './dominantColour.js'
import { sampleImageColours } from './sampleImage.js'

/** Pages read from a multi-page PDF. A card is 2, a stationery set 4-6. */
export const MAX_PDF_PAGES = 6

/**
 * How large each PDF page is rasterised before sampling.
 *
 * NOT 160. Rendering straight to the sample size would make pdf.js's own
 * anti-aliasing a large fraction of the pixels — the invented-colour failure
 * `sampleImage.js` exists to avoid, arriving one stage earlier where its
 * nearest-neighbour rule cannot help. Rendering large and letting the tested
 * sampler take every Nth real pixel keeps edge blends a minority.
 */
export const PDF_RENDER_MAX_EDGE = 900

const unreadable = (reason) => ({
  colours: [],
  readable: false,
  substrateShare: 0,
  reason,
})

/** Types this can actually read, named so the copy can name them too. */
export const CHECKABLE_TYPES =
  'image/png,image/jpeg,image/webp,image/svg+xml,application/pdf'

export function isCheckableFile(file) {
  const type = String(file?.type || '').toLowerCase()
  if (type === 'application/pdf') return true
  if (type.startsWith('image/')) return true
  // Some systems hand over a PDF with an empty type; fall back to the name.
  return /\.pdf$/i.test(String(file?.name || ''))
}

/**
 * @param {File|Blob} file
 * @returns {Promise<{colours: Array<{hex:string,coverage:number}>,
 *                    readable: boolean, substrateShare: number,
 *                    reason?: string, pages?: number}>}
 */
export async function sampleFileColours(file) {
  if (!file) return unreadable('no-file')
  if (!isCheckableFile(file)) return unreadable('unsupported-type')

  const isPdf =
    String(file.type || '').toLowerCase() === 'application/pdf' ||
    /\.pdf$/i.test(String(file.name || ''))

  if (isPdf) return samplePdfColours(file)

  let dataUrl
  try {
    dataUrl = await readAsDataUrl(file)
  } catch {
    return unreadable('read-failed')
  }
  return sampleImageColours(dataUrl)
}

async function samplePdfColours(file) {
  if (typeof document === 'undefined') return unreadable('no-canvas')

  let doc
  try {
    /* The legacy build, for the same reason `BrandBookPreview.jsx` uses it:
       pdf.js's modern bundle calls Map.prototype.getOrInsertComputed, which
       only exists in browsers from around mid-2025. A designer on a slightly
       older machine would get a hard failure here while the rest of the app
       worked, and this panel's whole job is to be trustworthy. */
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()
    const data = new Uint8Array(await file.arrayBuffer())
    doc = await pdfjs.getDocument({ data }).promise
  } catch {
    return unreadable('decode-failed')
  }

  const count = Math.min(doc.numPages || 0, MAX_PDF_PAGES)
  if (!count) return unreadable('no-pages')

  const samples = []
  for (let p = 1; p <= count; p += 1) {
    try {
      const page = await doc.getPage(p)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(
        1,
        PDF_RENDER_MAX_EDGE / Math.max(base.width, base.height)
      )
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.floor(viewport.width))
      canvas.height = Math.max(1, Math.floor(viewport.height))
      const canvasContext = canvas.getContext('2d', { willReadFrequently: true })
      if (!canvasContext) return unreadable('no-canvas')
      /* PAPER IS WHITE. A PDF renders onto transparency and `dominantColours`
         skips anything under 128 alpha, so an unfilled page has no stock in
         it at all — the sheet is whatever the artwork painted.

         HONEST SCOPE, because this line is easy to over-credit: coverage is
         already measured against INK pixels rather than the whole image, so
         on every fixture in the suite filling white changes nothing, and
         deleting this line leaves the e2e green. It is kept because it makes
         `substrateShare` mean what its name says and because it is what a
         printed sheet is; it is NOT load-bearing for any current finding, and
         should not be described as if it were. */
      canvasContext.fillStyle = '#ffffff'
      canvasContext.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext, viewport, canvas }).promise
      samples.push(await sampleImageColours(canvas.toDataURL('image/png')))
    } catch {
      samples.push(unreadable('page-failed'))
    }
  }

  return { ...mergePageSamples(samples), pages: count }
}

/**
 * Fold several page samples into one reading of the piece.
 *
 * WHY PER-PAGE AND NOT ONE BIG CANVAS. Stacking six pages into a single
 * bitmap and sampling once is simpler, but the sampler normalises to 160px on
 * the LONGEST edge — so a six-page stack arrives at roughly 27px wide and the
 * artwork is gone. Sampling each page at full sample resolution and averaging
 * afterwards keeps every page measured properly.
 *
 * Coverage is averaged over READABLE pages, not over all pages. A stationery
 * set whose second page is a blank bleed sheet should not have every colour's
 * share halved by it — a blank page is not evidence that the brand navy
 * covers less of the work.
 *
 * @param {Array<{colours: Array<{hex:string,coverage:number}>, readable: boolean,
 *                substrateShare?: number, reason?: string}>} samples
 */
export function mergePageSamples(samples = []) {
  const readable = samples.filter((s) => s?.readable && s.colours?.length)
  if (!readable.length) {
    /* Every page unreadable is not a clean piece. Report the first real
       reason so "black and white" and "this file is broken" stay different
       sentences — the distinction Phase 6 puts in scope by name. */
    return unreadable(samples.find((s) => s?.reason)?.reason || 'no-brand-colours')
  }

  const pooled = []
  for (const s of readable) {
    for (const c of s.colours) {
      pooled.push({ hex: c.hex, coverage: (c.coverage || 0) / readable.length })
    }
  }

  /* The same ΔE00 merge the single-page path uses. Two pages printed in the
     same navy come back as two slightly different hexes because each was
     re-quantised by the renderer independently; reporting them as two
     colours would halve the share of the one colour that matters and could
     drop it under the 10% floor the intruder rule needs. */
  const colours = mergeNearDuplicates(
    pooled.sort((a, b) => b.coverage - a.coverage)
  ).slice(0, 5)

  const substrateShare =
    readable.reduce((sum, s) => sum + (s.substrateShare || 0), 0) /
    readable.length

  return { colours, readable: colours.length > 0, substrateShare }
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
}
