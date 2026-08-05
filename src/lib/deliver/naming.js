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
       the whole string would eat the separators it depends on. */
    .replace(/[^\u0000-\u007F]/g, (ch) => FOLD[ch] ?? ' ')

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
