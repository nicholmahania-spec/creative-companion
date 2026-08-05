/**
 * Read a typeface FROM THE FONT, and be honest that this is far less than
 * colour gives you.
 *
 * The colour side of this feature derives three of five axes from the hex
 * values, because hue and chroma are physical. Letterforms are not so
 * generous. What a browser can actually measure about a font is:
 *
 *   - whether the font is present at all
 *   - how much ink it lays down at a given size (a real proxy for weight)
 *   - how wide it sets (condensed vs extended)
 *   - its x-height relative to cap height
 *
 * Of the five axes, only WEIGHT falls out of that honestly. Warmth,
 * Formality and Era are cultural readings of letterforms — a slab serif
 * reads "rugged" because of where you have seen slab serifs, not because
 * of anything measurable in the outline. Energy has no agreed physical
 * correlate either.
 *
 * So this module derives weight and says nothing else. Four bars reading
 * "not said" is a worse-looking feature than five confident ones and a
 * much better one: the previous version's confident readings were what let
 * it tell a designer that Comic Sans matched a rugged Vermont leather
 * brand.
 *
 * THE MORE USEFUL FINDING is not an axis at all. A cold-start test found
 * the app printing type specimens for "Trade Gothic Next Condensed Bold"
 * rendered in the app's default UI sans — in the client-facing artboard and
 * in the exported PDFs. Showing a client a specimen in the wrong typeface
 * is worse than showing none. Detecting an unavailable font is cheap,
 * certain, and fixes a real defect, so it is the headline here.
 */

/**
 * The CSS family inside a human label.
 *
 * The app stores what a designer types — "Trade Gothic Bold Condensed
 * No. 20", "Plus Jakarta Sans Bold", "System UI — native". None of those is
 * a CSS family, so asking the browser for them by name always failed and
 * the missing-font warning fired on the app's OWN presets. A cold-start run
 * caught it saying "System UI Bold and System UI Regular are not available",
 * which teaches the designer the warning is noise — and a warning nobody
 * reads is worse than none, because this one is right about real fonts.
 */
const STYLE_WORD =
  /^((?:extra|ultra|semi|demi)?(?:thin|light|bold|black|heavy)|book|regular|normal|medium|italic|oblique|condensed|compressed|extended|expanded|narrow|wide|no\.?)$/i

export function cssFamily(label) {
  let name = String(label || '').trim()
  if (!name) return ''
  // "System UI — native" and friends: take the part before a dash note.
  name = name.split(/\s+[—–-]\s+/)[0]

  /* Strip style words only from the END. Stripping them anywhere removed
     real parts of family names — "Freight Text Pro Book" became "Freight
     Pro", because Text and Pro are the family here and only Book is the
     weight. Weight and width always trail the family in these labels. */
  const parts = name.split(/\s+/)
  const isStyle = (tok) => STYLE_WORD.test(tok)
  let changed = true
  while (changed && parts.length > 1) {
    changed = false
    const last = parts[parts.length - 1]
    /* A bare number is only dropped when an explicit "No." precedes it.
       Stripping digits outright turned "Source Sans 3 Regular" into
       "Source Sans" — the 3 IS the family, the way Univers 55 is. */
    if (/^\d+$/.test(last) && parts.length > 2 && /^no\.?$/i.test(parts[parts.length - 2])) {
      parts.pop()
      parts.pop()
      changed = true
    } else if (isStyle(last) && !/^no\.?$/i.test(last)) {
      parts.pop()
      changed = true
    }
  }
  return parts.join(' ')
}

/** Families the browser resolves without any font file. */
const GENERIC = new Set([
  'system ui',
  'system-ui',
  'ui-sans-serif',
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
])

/** Fonts the browser is guaranteed to resolve, used as measuring sticks. */
const FALLBACKS = ['monospace', 'serif', 'sans-serif']

/** A string with enough variety to make two different fonts measure
 *  differently — round, straight, wide and narrow letters. */
const PROBE = 'mmmwwwiiilll0OQ@'

function measureWidth(ctx, family, px = 72) {
  ctx.font = `${px}px ${family}`
  return ctx.measureText(PROBE).width
}

/**
 * Is this font actually available in this browser?
 *
 * `document.fonts.check` is the direct answer but lies by omission for
 * fonts that were never declared — it returns false for a perfectly
 * installed system font in some engines. So a width comparison backs it up:
 * a font that is genuinely missing falls back, and therefore measures
 * IDENTICALLY to the fallback it fell back to.
 *
 * @param {string} family
 * @param {Document} [doc] injectable for tests
 * @returns {boolean|null} null when it cannot be determined at all
 */
export function fontAvailable(family, doc = globalThis.document) {
  const name = cssFamily(family)
  if (!name) return null
  // A generic family is always resolvable; asking by its label is not a
  // question about whether a font file exists.
  if (GENERIC.has(name.toLowerCase())) return true
  if (!doc || typeof doc.createElement !== 'function') return null

  const canvas = doc.createElement('canvas')
  const ctx = canvas.getContext && canvas.getContext('2d')
  if (!ctx) return null

  /* Quote the family so multi-word names ("Trade Gothic Next") parse as one
     family rather than a list — unquoted, the canvas font shorthand silently
     drops the whole declaration and every font measures as the default. */
  const quoted = `"${name.replace(/"/g, '')}"`

  for (const fb of FALLBACKS) {
    const base = measureWidth(ctx, fb)
    const test = measureWidth(ctx, `${quoted}, ${fb}`)
    // Differs from at least one fallback → the font resolved to something
    // of its own.
    if (Math.abs(test - base) > 0.5) return true
  }
  return false
}

/**
 * How much ink the font lays down — a real, measurable proxy for weight.
 *
 * Renders the probe and counts covered pixels. A hairline and a black sit
 * at opposite ends of this and anyone can see why, which is the test for
 * whether a derived axis deserves to exist.
 *
 * @returns {number|null} 0–1, or null if it cannot be measured
 */
export function inkWeight(family, doc = globalThis.document) {
  const name = cssFamily(family)
  if (!name || !doc || typeof doc.createElement !== 'function') return null
  const canvas = doc.createElement('canvas')
  const ctx = canvas.getContext && canvas.getContext('2d')
  if (!ctx || typeof ctx.getImageData !== 'function') return null

  const px = 64
  canvas.width = 512
  canvas.height = 96
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `${px}px "${name.replace(/"/g, '')}", sans-serif`
  const text = 'Hamburgefonstiv'
  const w = ctx.measureText(text).width
  if (!w) return null
  ctx.fillText(text, 4, 72)

  let data
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  } catch {
    return null // tainted or unsupported
  }
  let inked = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 128) inked += 1
  }
  const box = Math.max(1, w * px)
  /* Coverage of the text's own bounding box. Empirically a light weight
     covers roughly a tenth of its box and a black roughly a third, so the
     scale below maps that band across 0–1 rather than leaving every real
     font bunched at the bottom. */
  const coverage = inked / box
  const scaled = (coverage - 0.08) / (0.34 - 0.08)
  return Math.min(1, Math.max(0, scaled))
}

/**
 * The axes readable from a typeface. Mostly nulls, on purpose.
 *
 * @returns {{formality: null, energy: null, warmth: null,
 *   weight: number|null, era: null, available: boolean|null}}
 */
export function axesForTypeface(family, doc = globalThis.document) {
  const available = fontAvailable(family, doc)
  return {
    // Measurable.
    weight: available ? inkWeight(family, doc) : null,
    // Cultural readings of letterforms. A slab serif reads "rugged"
    // because of where you have seen slab serifs, not because of the
    // outline. Left unsaid rather than invented.
    formality: null,
    energy: null,
    warmth: null,
    era: null,
    available,
  }
}

/**
 * The font names a project has specified, deduped and in reading order.
 * @returns {string[]}
 */
export function specifiedFonts(project) {
  return [project?.typeHeading, project?.typeBody]
    .map((f) => String(f || '').trim())
    .filter(Boolean)
    .filter((f, i, all) => all.indexOf(f) === i)
}

/**
 * Fonts the project names but this browser cannot render.
 *
 * The point is not tidiness. Everything the app previews or exports with
 * one of these — the client-facing artboard, the brand book, the
 * stationery PDFs — is silently set in a substitute, and a specimen in the
 * wrong typeface misleads the client rather than informing them.
 *
 * @returns {string[]}
 */
export function missingFonts(project, doc = globalThis.document) {
  return specifiedFonts(project).filter(
    (f) => fontAvailable(f, doc) === false
  )
}
