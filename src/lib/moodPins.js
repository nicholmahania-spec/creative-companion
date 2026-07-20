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
export function pinFaceStyle(pin = {}) {
  const kind = pinVisualKind(pin)
  const visual = pin?.visual || ''
  if (kind === 'image') {
    return {
      backgroundImage: `url(${visual})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#e7e5e4',
    }
  }
  if (kind === 'gradient') {
    return {
      backgroundImage: visual,
      backgroundColor: '#e7e5e4',
    }
  }
  if (kind === 'color') {
    // Hex / rgb solid — also accept full CSS background strings
    if (/gradient/i.test(visual)) {
      return { backgroundImage: visual, backgroundColor: '#e7e5e4' }
    }
    return {
      backgroundColor: visual || '#e7e5e4',
    }
  }
  return { backgroundColor: '#e7e5e4' }
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
            resolve({
              id: Date.now() + i + Math.floor(Math.random() * 1000),
              type: 'image',
              note: String(file.name || 'Upload').replace(/\.[^.]+$/, '') || 'Upload',
              visual: ev.target?.result || '',
              sourceName: file.name || '',
              mime: file.type || 'image/*',
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
