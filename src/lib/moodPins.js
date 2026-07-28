/**
 * Mood board pin helpers — shared board, brand, and export rendering.
 */

/** Max size for data-URL image embeds (localStorage-friendly). */
export const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024

/**
 * Detect how a pin's `visual` should paint.
 * @returns {'image'|'gradient'|'color'|'empty'}
 */
export function pinVisualKind(pin = {}) {
  const visual = String(pin?.visual || '').trim()
  const type = String(pin?.type || '').toLowerCase()
  if (!visual) return 'empty'
  if (
    type === 'image' ||
    visual.startsWith('data:image') ||
    visual.startsWith('blob:') ||
    /^https?:\/\//i.test(visual)
  ) {
    return 'image'
  }
  if (type === 'file' || visual.startsWith('data:application') || visual.startsWith('data:')) {
    // Non-image data URLs still render as a solid chip with a label
    if (visual.startsWith('data:image')) return 'image'
    return 'color'
  }
  if (/gradient/i.test(visual)) return 'gradient'
  if (
    type === 'quote' ||
    type === 'spark' ||
    type === 'color' ||
    type === 'note' ||
    visual.startsWith('#') ||
    visual.startsWith('rgb') ||
    visual.startsWith('hsl')
  ) {
    return 'color'
  }
  // Fallback: treat unknown strings with url-ish paths as images
  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(visual)) return 'image'
  return 'color'
}

/**
 * Raw image URL for a pin (data URL / https), or null if not an image face.
 */
export function pinImageUrl(pin = {}) {
  if (pinVisualKind(pin) !== 'image') return null
  const visual = String(pin?.visual || '').trim()
  return visual || null
}

/**
 * Inline style object for a pin face (board cards, brand thumbs, pack preview).
 */
/** Fallback while image loads — matches --bg-muted (not stone leftover #e7e5e4). */
const PIN_FACE_FALLBACK = '#EBEBEB'

export function pinFaceStyle(pin = {}) {
  const kind = pinVisualKind(pin)
  const visual = pin?.visual || ''
  if (kind === 'image') {
    const hasFocal = Number.isFinite(pin?.focalX) && Number.isFinite(pin?.focalY)
    return {
      backgroundImage: `url(${visual})`,
      backgroundSize: 'cover',
      backgroundPosition: hasFocal ? `${pin.focalX}% ${pin.focalY}%` : 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: PIN_FACE_FALLBACK,
    }
  }
  if (kind === 'gradient') {
    return {
      backgroundImage: visual,
      backgroundColor: PIN_FACE_FALLBACK,
    }
  }
  if (kind === 'color') {
    // Hex / rgb solid — also accept full CSS background strings
    if (/gradient/i.test(visual)) {
      return { backgroundImage: visual, backgroundColor: PIN_FACE_FALLBACK }
    }
    return {
      backgroundColor: visual || PIN_FACE_FALLBACK,
    }
  }
  return { backgroundColor: PIN_FACE_FALLBACK }
}

/**
 * CSS text for off-DOM / HTML export clones (same rules as pinFaceStyle).
 */
export function pinFaceCssText(pin = {}) {
  const s = pinFaceStyle(pin)
  const parts = []
  if (s.backgroundImage) parts.push(`background-image:${s.backgroundImage}`)
  if (s.backgroundSize) parts.push(`background-size:${s.backgroundSize}`)
  if (s.backgroundPosition) parts.push(`background-position:${s.backgroundPosition}`)
  if (s.backgroundRepeat) parts.push(`background-repeat:${s.backgroundRepeat}`)
  if (s.backgroundColor) parts.push(`background-color:${s.backgroundColor}`)
  return parts.join(';')
}

/* ── Canvas geometry ──────────────────────────────────────────────────────
   The board is a free canvas: pins carry x/y/w/z in stage coordinates. None
   of that is required — a pin that has never been moved has no x/y, and
   `autoPlacePin` derives one from its board order.

   That fallback is the whole reason the canvas does not cost a decision.
   Dropping an image never asks "where?", it lands in the next grid slot and
   can be moved later or never. It also means existing boards open arranged
   rather than piled at the origin. */

/** Default pin width on the canvas, in stage px. */
export const PIN_DEFAULT_W = 240
/** Smallest a pin may be dragged — below this the star and menu stop being
 *  usable targets, so it is a floor on the controls, not on taste. */
export const PIN_MIN_W = 120
export const PIN_MAX_W = 1200
/** Columns used when auto-placing. Wide enough to read as a wall, narrow
 *  enough that a fresh board fits one screen at Fit-all. */
const AUTO_COLS = 4
const AUTO_GAP = 28

/** Where a never-moved pin sits, derived from its position in board order. */
export function autoPlacePin(index, width = PIN_DEFAULT_W) {
  const col = index % AUTO_COLS
  const row = Math.floor(index / AUTO_COLS)
  return {
    x: col * (width + AUTO_GAP),
    y: row * (width * 0.78 + AUTO_GAP),
  }
}

/** Resolve a pin's canvas geometry, falling back to auto-placement. */
export function pinGeometry(pin = {}, index = 0) {
  const w = Number.isFinite(pin.w) ? pin.w : PIN_DEFAULT_W
  const placed = Number.isFinite(pin.x) && Number.isFinite(pin.y)
  const auto = placed ? null : autoPlacePin(index, w)
  return {
    x: placed ? pin.x : auto.x,
    y: placed ? pin.y : auto.y,
    w,
    z: Number.isFinite(pin.z) ? pin.z : 0,
    placed,
  }
}

/** Bounding box of every pin, for Fit all. Heights are unknown until the
 *  images load, so this estimates with the same ratio auto-placement uses —
 *  Fit all only has to guarantee nothing is off-screen, not be pixel-exact. */
export function boardBounds(pins = []) {
  if (!pins.length) return { x: 0, y: 0, w: 1, h: 1 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  pins.forEach((pin, i) => {
    const g = pinGeometry(pin, i)
    const h = g.w * 0.95
    minX = Math.min(minX, g.x)
    minY = Math.min(minY, g.y)
    maxX = Math.max(maxX, g.x + g.w)
    maxY = Math.max(maxY, g.y + h)
  })
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) }
}

/** Long-edge cap for stored pin images, in CSS pixels.
 *
 *  Pins are persisted as data URLs inside the localStorage-backed store, and
 *  localStorage is ~5MB for the WHOLE origin — shared with the brief, tasks
 *  and every project. A single 3MB phone photo becomes ~4MB of base64, so two
 *  of them exceeded the budget and the write threw QuotaExceededError. Because
 *  the store persists one blob, that failure took the brief and the projects
 *  down with it, silently, until the next reload revealed the loss.
 *
 *  1600px is well beyond what a reference thumbnail or the lightbox needs, and
 *  it brings a typical photo to ~200KB — a ~20x reduction that makes the cap
 *  unreachable in normal use. */
export const MAX_STORED_IMAGE_DIM = 1600

/** Re-encode an image data URL down to MAX_STORED_IMAGE_DIM on its long edge.
 *  Resolves to the original string if anything fails — a slightly-too-large
 *  pin is better than a lost one. */
function downscaleDataUrl(dataUrl, mime) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || !String(dataUrl).startsWith('data:image')) {
      resolve(dataUrl)
      return
    }
    const img = new Image()
    img.onload = () => {
      try {
        const { naturalWidth: w, naturalHeight: h } = img
        if (!w || !h) return resolve(dataUrl)
        const longEdge = Math.max(w, h)
        if (longEdge <= MAX_STORED_IMAGE_DIM) return resolve(dataUrl)
        const scale = MAX_STORED_IMAGE_DIM / longEdge
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(w * scale)
        canvas.height = Math.round(h * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(dataUrl)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        // PNG round-trips badly for photographs; JPEG at 0.82 is
        // indistinguishable at reference size and a fraction of the bytes.
        // Transparency is preserved by keeping PNG when that is the source.
        const out =
          mime === 'image/png'
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.82)
        resolve(out && out.length < dataUrl.length ? out : dataUrl)
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/**
 * Read image files into pin-ready objects (data URLs).
 * @returns {Promise<{ pins: object[], skipped: string[] }>}
 */
export function readImageFilesAsPins(fileList, { maxBytes = MAX_IMAGE_BYTES } = {}) {
  const files = Array.from(fileList || [])
  const skipped = []
  const images = files.filter((f) => {
    if (!f.type || !f.type.startsWith('image/')) {
      skipped.push(`${f.name || 'file'} (not an image)`)
      return false
    }
    if (f.size > maxBytes) {
      skipped.push(`${f.name || 'image'} (over ${Math.round(maxBytes / (1024 * 1024))}MB)`)
      return false
    }
    return true
  })

  return Promise.all(
    images.map(
      (file, i) =>
        new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (ev) => {
            const raw = ev.target?.result || ''
            void downscaleDataUrl(raw, file.type).then((visual) => {
              resolve({
                id: Date.now() + i + Math.floor(Math.random() * 1000),
                type: 'image',
                note: String(file.name || 'Upload').replace(/\.[^.]+$/, '') || 'Upload',
                visual,
                sourceName: file.name || '',
                mime: file.type || 'image/*',
              })
            })
          }
          reader.onerror = () => {
            skipped.push(`${file.name || 'image'} (read failed)`)
            resolve(null)
          }
          reader.readAsDataURL(file)
        })
    )
  ).then((rows) => ({
    pins: rows.filter(Boolean).filter((p) => p.visual),
    skipped,
  }))
}
