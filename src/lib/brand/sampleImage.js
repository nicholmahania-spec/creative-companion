/**
 * Turn an uploaded image into the pixels `dominantColours` needs.
 *
 * This is the missing half of the colour checker. `dominantColour.js` has been
 * written, tested and reasoned about at length, and until now had NO consumer
 * anywhere in src/ — because nothing in the app ever produced an RGBA buffer.
 * A correct measurement nobody can reach is not a feature.
 *
 * Two decisions here matter more than they look:
 *
 * SMOOTHING IS OFF. The obvious way to make sampling fast is to draw the image
 * small and let the browser interpolate. That INVENTS COLOURS: scaling a red
 * logo on a white ground with smoothing on produces a rim of pinks that exist
 * nowhere in the artwork, and a checker that reports colours the designer never
 * used is the exact false-alarm failure `dominantColour.js` is built to avoid.
 * Nearest-neighbour keeps every sampled pixel a pixel that was really there.
 *
 * FAILURE IS REPORTED, NOT GUESSED. A file that cannot be decoded, a canvas
 * that cannot be read, an SVG that pulls a resource the browser refuses — each
 * returns `readable: false` with a reason, never an empty-but-clean result.
 * "I could not read this" and "this is fine" must never look the same.
 */

import { dominantColours } from './dominantColour.js'

/** Longest edge we sample down to. Enough pixels to be representative, few
 *  enough that a 2.5MB upload is measured in milliseconds, not seconds. */
export const SAMPLE_MAX_EDGE = 160

const blank = (reason) => ({
  colours: [],
  readable: false,
  substrateShare: 0,
  reason,
})

/**
 * @param {string} src data URL or object URL of the image
 * @param {{ maxEdge?: number, maxColours?: number }} [opts]
 * @returns {Promise<{colours: Array<{hex:string,coverage:number}>,
 *                    readable: boolean, substrateShare: number,
 *                    reason?: string }>}
 */
export async function sampleImageColours(src, opts = {}) {
  const { maxEdge = SAMPLE_MAX_EDGE, maxColours = 5 } = opts
  if (!src || typeof document === 'undefined') return blank('no-image')

  let img
  try {
    img = await loadImage(src)
  } catch {
    return blank('decode-failed')
  }

  /* An SVG with no intrinsic size decodes fine and reports 0×0, which would
     silently sample nothing. That is a readable file we cannot measure — a
     different thing from a broken one, and the caller says so differently. */
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) return blank('no-dimensions')

  const scale = Math.min(1, maxEdge / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))

  let data
  try {
    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return blank('no-canvas')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0, cw, ch)
    data = ctx.getImageData(0, 0, cw, ch).data
  } catch {
    // Tainted canvas, or a browser that refuses getImageData.
    return blank('cannot-read-pixels')
  }

  const result = dominantColours(data, { maxColours })
  return result.readable ? result : { ...result, reason: 'no-brand-colours' }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    /* Data URLs do not taint, but a project restored from cloud sync can carry
       an http(s) logo URL. Asking for CORS up front is the difference between
       a readable canvas and a security error at getImageData. */
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode'))
    img.src = src
  })
}
