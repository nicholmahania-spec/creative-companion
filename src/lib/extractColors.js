/**
 * Dominant-color extraction for mood-board image pins (Research view).
 * Client-side only — samples pixels via canvas and buckets them into a
 * small palette of suggested swatches. Never writes to the project
 * palette itself; callers decide what to do with the returned hexes.
 */

const MAX_SAMPLE_DIM = 80

function toHex(n) {
  return n.toString(16).padStart(2, '0')
}

/**
 * @param {HTMLImageElement} img Already-loaded image element.
 * @param {number} count Max swatches to return.
 * @returns {string[]} Hex colors, most common first. Empty on failure
 *   (e.g. a cross-origin image without CORS headers taints the canvas).
 */
export function extractDominantColors(img, count = 4) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return []

  try {
    const scale = Math.min(
      1,
      MAX_SAMPLE_DIM / Math.max(img.naturalWidth, img.naturalHeight)
    )
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return []
    ctx.drawImage(img, 0, 0, w, h)

    const { data } = ctx.getImageData(0, 0, w, h)
    const buckets = new Map()
    // Quantize each channel to 32 levels so near-identical pixels group
    // together into one representative swatch instead of hundreds of
    // near-duplicate ones.
    const STEP = 32
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a < 128) continue // skip transparent pixels
      const r = Math.round(data[i] / STEP) * STEP
      const g = Math.round(data[i + 1] / STEP) * STEP
      const b = Math.round(data[i + 2] / STEP) * STEP
      // Skip near-white/near-black — usually background padding, not signal
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      if (lum > 245 || lum < 10) continue
      const key = `${r},${g},${b}`
      buckets.set(key, (buckets.get(key) || 0) + 1)
    }

    const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1])
    return sorted.slice(0, count).map(([key]) => {
      const [r, g, b] = key.split(',').map((n) => Math.min(255, Number(n)))
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    })
  } catch {
    // Tainted canvas (cross-origin image without CORS) or unsupported —
    // fail quietly, swatches are a suggestion, not a required feature.
    return []
  }
}

/**
 * Eyedropper: sample the exact pixel color at a normalized point on an
 * already-loaded image (not just its overall dominant colors).
 * @param {HTMLImageElement} img Already-loaded image element.
 * @param {number} xRatio 0..1 position across the image's displayed width.
 * @param {number} yRatio 0..1 position down the image's displayed height.
 * @returns {string|null} Hex color, or null on failure (tainted canvas, etc).
 */
export function sampleColorAt(img, xRatio, yRatio) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    const x = Math.min(
      img.naturalWidth - 1,
      Math.max(0, Math.round(xRatio * img.naturalWidth))
    )
    const y = Math.min(
      img.naturalHeight - 1,
      Math.max(0, Math.round(yRatio * img.naturalHeight))
    )
    const { data } = ctx.getImageData(x, y, 1, 1)
    return `#${toHex(data[0])}${toHex(data[1])}${toHex(data[2])}`
  } catch {
    return null
  }
}
