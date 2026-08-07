/**
 * The studio's own identity — the name and mark that go on client work.
 *
 * This is the designer's identity, not the client's. It is global to the
 * account rather than per-project: one studio, one name, however many brands
 * pass through it.
 *
 * WHY THE SIZE CAP IS THE POINT OF THIS FILE.
 *
 * `prefs` is in `PERSISTED_KEYS` (useAppStore.js:529), and the store does not
 * write prefs to a key of their own — `_writePersistNow` serialises the WHOLE
 * workspace, projects and mood images included, through a single
 * `localStorage.setItem`. localStorage is a hard ~5MB per origin and throws
 * `QuotaExceededError` when it fills (MDN, "Storage quotas and eviction
 * criteria"). Base64 inflates binary by about a third on the way in.
 *
 * So an uncapped logo does not fail by itself. It fails the write that carries
 * everything else: a 1.5MB PNG dropped in here and the next save of any
 * project, decision or approval throws, and the store's own quota message
 * tells the designer to "Remove some mood board images" — pointing at a
 * per-project mood board when the real cause is a global preference they set
 * once at signup and have not thought about since.
 *
 * The same data also rides inside `exportAllData` and every cloud sync, on
 * every write, forever. A footer mark is a few hundred pixels wide. There is
 * no version of this where megabytes are the right answer, so the cap is
 * enforced HERE, before the store ever sees the string, rather than left to
 * the caller to remember.
 */

/**
 * Longest edge kept, in pixels.
 *
 * A footer mark prints a couple of centimetres wide. 400px covers that at
 * print resolution with room to spare, and is small enough that the encoded
 * result normally lands well under the cap on the first attempt.
 */
export const LOGO_MAX_EDGE = 400

/**
 * Hard ceiling on the stored data-URL string, in characters.
 *
 * ~100KB of string is ~75KB of image — generous for a wordmark, and about 2%
 * of the whole localStorage budget, so a logo can never be the reason a
 * workspace stops saving.
 */
export const MAX_LOGO_CHARS = 100_000

/** Steps tried, largest first, before giving up. */
const DOWNSCALE_STEPS = [1, 0.75, 0.5, 0.35]

/** Anything the browser can paint onto a canvas. */
export const LOGO_TYPES = 'image/png,image/jpeg,image/webp,image/svg+xml'

export function isLogoFile(file) {
  return String(file?.type || '')
    .toLowerCase()
    .startsWith('image/')
}

const failed = (reason) => ({ ok: false, reason, dataUrl: '' })

/**
 * Read a file the designer picked and return a stored-ready data URL.
 *
 * Always downscales and re-encodes rather than storing what was handed over:
 * a designer's logo file is a print asset and is routinely measured in
 * megabytes, and the version that goes in a footer does not need to be.
 *
 * @param {File|Blob} file
 * @returns {Promise<{ok: boolean, dataUrl: string, reason?: string,
 *                    width?: number, height?: number, chars?: number}>}
 */
export async function prepareStudioLogo(file) {
  if (!file) return failed('no-file')
  if (!isLogoFile(file)) return failed('unsupported-type')
  if (typeof document === 'undefined') return failed('no-canvas')

  let source
  try {
    source = await readAsDataUrl(file)
  } catch {
    return failed('read-failed')
  }

  let img
  try {
    img = await loadImage(source)
  } catch {
    return failed('decode-failed')
  }

  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) return failed('decode-failed')

  for (const step of DOWNSCALE_STEPS) {
    const scale = Math.min(1, (LOGO_MAX_EDGE / Math.max(w, h)) * step)
    const cw = Math.max(1, Math.round(w * scale))
    const ch = Math.max(1, Math.round(h * scale))

    let encoded
    try {
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) return failed('no-canvas')
      /* PNG, and no white fill behind it. A logo is placed onto a page whose
         colour this file does not know; flattening transparency to white here
         would put a visible box around every mark that has any. */
      ctx.drawImage(img, 0, 0, cw, ch)
      encoded = canvas.toDataURL('image/png')
    } catch {
      // Tainted canvas, or a browser refusing toDataURL.
      return failed('encode-failed')
    }

    if (encoded.length <= MAX_LOGO_CHARS) {
      return { ok: true, dataUrl: encoded, width: cw, height: ch, chars: encoded.length }
    }
  }

  return failed('too-large')
}

/**
 * Plain-language reason, for copy that has to explain a rejected file.
 *
 * Deliberately not phrased as the designer's mistake: handing over the print
 * version of a logo is the normal thing to do, not an error.
 */
export function logoProblemText(reason) {
  switch (reason) {
    case 'unsupported-type':
      return 'That file type can’t be used. PNG, JPG, WEBP or SVG work.'
    case 'too-large':
      return 'That image is too detailed to store. A simpler or smaller version works.'
    case 'read-failed':
    case 'decode-failed':
      return 'That file couldn’t be opened.'
    case 'no-canvas':
    case 'encode-failed':
      return 'This browser wouldn’t process the image.'
    case 'no-file':
      return ''
    default:
      return 'That image couldn’t be used.'
  }
}

/**
 * The studio name to credit, falling back to the invoice identity.
 *
 * The app already asks for this once: `prefs.invoiceFrom` is the "from" block
 * a designer fills in to send an invoice. Asking a second time, in a second
 * place, for the same fact is what PRODUCT.md §21 means by making the designer
 * remember a decision already made — so an unset studio name reads the invoice
 * identity rather than printing nothing.
 *
 * Only the first non-empty line: an invoice "from" block is usually a postal
 * address, and the studio name is its first line. The rest is not a credit.
 *
 * @param {{studioName?: string, invoiceFrom?: string}} prefs
 */
export function resolveStudioName(prefs = {}) {
  const explicit = String(prefs.studioName || '').trim()
  if (explicit) return explicit
  const firstLine = String(prefs.invoiceFrom || '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)
  return firstLine || ''
}

/** True when nothing would be credited — the state worth surfacing. */
export function hasStudioIdentity(prefs = {}) {
  return Boolean(resolveStudioName(prefs) || String(prefs.studioLogo || '').trim())
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('decode'))
    img.onload = () => resolve(img)
    img.src = src
  })
}
