/**
 * File naming for a client handoff.
 *
 * What a client receives today is whatever the file was called on the
 * designer's desk, which is how `logo-final-final-2.ai` reaches a printer.
 * A convention costs nothing to apply once and is the difference between a
 * folder someone can use in a year and one they email you about.
 *
 * The shape is Brand_Group_Item_Variant.ext, each part in PascalCase, joined
 * by underscores, with empty parts dropped:
 *
 *   SparrowsPromise_Logo_Primary_FullColor.svg
 *   SparrowsPromise_Colour_Specifications.pdf
 *
 * Underscores between parts and no spaces anywhere on purpose: these files go
 * to printers, FTP drops and CMS uploads, where a space becomes %20 and a
 * hyphen is ambiguous against hyphenated brand names.
 */

/** Latin transliteration for the accents a business name actually contains. */
const FOLD = {
  à: 'a', á: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a', æ: 'ae',
  ç: 'c', è: 'e', é: 'e', ê: 'e', ë: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i',
  ñ: 'n', ò: 'o', ó: 'o', ô: 'o', ö: 'o', õ: 'o', ø: 'o', œ: 'oe',
  ß: 'ss', ù: 'u', ú: 'u', û: 'u', ü: 'u', ý: 'y', ÿ: 'y',
}

const fold = (s) =>
  String(s || '')
    .toLowerCase()
    /* Non-ASCII only — the ASCII split below handles the rest, and folding
       the whole string would eat the separators it depends on.

       NO `u` FLAG — the class is the exact complement of ASCII only over
       16-bit code units. With `u` it stops matching anything above U+FFFF, so
       an astral character would reach `namePart`'s split instead of being
       folded to a space here.

       That is an intent note, not a live hazard, and the distinction is worth
       stating so nobody hardens against the wrong thing: the only caller
       immediately splits on `[^a-z0-9]+`, an ASCII allowlist, so an emoji is
       eaten either way and the output is identical. Checked by execution, not
       by reading — adding `u` leaves every test in this file green. */
    .replace(/[\u0080-\uFFFF]/g, (ch) => FOLD[ch] ?? ' ')

/**
 * One name part in PascalCase — "Sparrow's Promise" → "SparrowsPromise".
 *
 * The apostrophe is deleted rather than turned into a separator, because
 * "Sparrow S Promise" is not a thing anyone would call that business.
 */
export function namePart(raw) {
  /* Split camelCase before folding, so a part that arrives already joined
     ("FullColor", "businessCard") keeps its word boundaries instead of
     flattening to "Fullcolor". Callers pass both shapes and neither is
     wrong. */
  const split = String(raw || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  const cleaned = fold(split).replace(/['’]/g, '')
  return cleaned
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('')
}

/**
 * A file name from its parts. Empty parts are dropped, so a file with no
 * variant is `Brand_Logo_Primary.svg`, never `Brand_Logo_Primary_.svg`.
 *
 * @param {{ brand?: string, group?: string, item?: string, variant?: string, ext?: string }} parts
 * @returns {string}
 */
export function assetFileName({ brand, group, item, variant, ext } = {}) {
  const stem =
    [brand, group, item, variant].map(namePart).filter(Boolean).join('_') ||
    'Asset'
  const dot = String(ext || '').replace(/^\./, '').toLowerCase()
  return dot ? `${stem}.${dot}` : stem
}

/**
 * Make every name in a list unique, in place order.
 *
 * Two assets can legitimately reduce to the same name (two PNGs both called
 * "primary"), and a zip silently keeps only the last one written — the client
 * then receives fewer files than the manifest promised, with nothing anywhere
 * saying so. Suffixed `_2`, `_3` in the order they appear.
 *
 * @param {string[]} names
 * @returns {string[]}
 */
export function uniqueNames(names = []) {
  const seen = new Map()
  return names.map((n) => {
    const key = String(n).toLowerCase()
    const hit = seen.get(key)
    if (!hit) {
      seen.set(key, 1)
      return n
    }
    seen.set(key, hit + 1)
    const dot = n.lastIndexOf('.')
    return dot > 0
      ? `${n.slice(0, dot)}_${hit + 1}${n.slice(dot)}`
      : `${n}_${hit + 1}`
  })
}

/**
 * The extension the actual BYTES imply, or null when they say nothing.
 *
 * The mime type in a data URL is a claim, and it is routinely wrong or absent —
 * `application/octet-stream` from a file input, a mime the app never mapped.
 * The bytes are not a claim. A real package shipped two files named `.png`
 * whose first four bytes were `%PDF`, because the mime was unrecognised and the
 * caller fell back to guessing `png`; a client double-clicking those gets a
 * broken image.
 *
 * Decoded, not prefix-matched. Comparing leading base64 characters looks
 * tempting and is wrong: base64 is only stable across whole three-byte groups,
 * so `<svg ` and `<svgX` diverge mid-signature and a PNG's prefix depends on
 * the first byte of its IHDR length. Decoding sixteen bytes costs nothing and
 * has no such edge.
 *
 * @param {string} base64  a data URL, or the bare base64 payload of one
 * @returns {string|null}
 */
export function extFromBytes(base64) {
  const b = headBytes(base64, 16)
  if (!b) return null
  const at = (i, ...sig) => sig.every((v, k) => b[i + k] === v)

  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png'
  if (at(0, 0xff, 0xd8, 0xff)) return 'jpg'
  if (at(0, 0x25, 0x50, 0x44, 0x46)) return 'pdf' // %PDF
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return 'gif' // GIF8
  /* RIFF is a container — WAV and AVI open the same way — so webp is only
     claimed when the fourth word says so. */
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'webp'

  /* SVG is text, so it has no magic number. Look for the markup that starts
     one, past any BOM or leading whitespace. */
  const head = b
    .map((c) => String.fromCharCode(c))
    .join('')
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase()
  if (head.startsWith('<svg') || head.startsWith('<?xml') || head.startsWith('<!doctype svg')) {
    return 'svg'
  }
  return null
}

/** First `n` decoded bytes of a base64 payload, or null if it cannot be read. */
function headBytes(base64, n) {
  const s = String(base64 || '')
    .replace(/^data:[^,]*,/, '')
    .replace(/\s+/g, '')
  if (!s) return null
  // Slice on a 4-character boundary so the chunk decodes on its own.
  const chunk = s.slice(0, Math.ceil(n / 3) * 4)
  if (chunk.length < 4) return null
  /* `atob` only. A `Buffer` fallback was here and was wrong twice over: this is
     browser code, so it would never have run, and naming a Node global in
     src/** is the `no-undef` shape the lint ratchet holds at zero because it
     is a crash that has not happened yet. `atob` is in every browser and in
     Node since 18; this repo requires Node 24. */
  if (typeof atob !== 'function') return null
  try {
    const bin = atob(chunk)
    const out = []
    for (let i = 0; i < Math.min(bin.length, n); i++) out.push(bin.charCodeAt(i) & 0xff)
    return out.length ? out : null
  } catch {
    return null
  }
}

/** The extension a data URL's mime type implies, or null when it is not one. */
export function extFromDataUrl(url) {
  const m = String(url || '').match(/^data:([a-zA-Z0-9.+/-]+);base64,/)
  if (!m) return null
  const mime = m[1].toLowerCase()
  if (mime.includes('svg')) return 'svg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('pdf')) return 'pdf'
  return null
}
