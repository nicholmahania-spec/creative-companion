/**
 * One entry per typeface the app can actually render.
 *
 * `TYPE_PAIRS` in color.js describes *pairs* — a heading and a body chosen
 * together, with a single stylesheet between them. That shape can't express a
 * heading and a body picked independently, which is what the Brand Book
 * Builder does, and it's why a family outside the pair list used to be named
 * on screen while rendering in the fallback: `loadTypePairFont` had nothing to
 * fetch for it. This registry is the per-family view that fixes that.
 *
 * Storage does not change: `project.typeHeading` / `typeBody` stay label
 * strings like `'Fraunces SemiBold'`, so every existing reader keeps working.
 * `labelFor()` and `parseLabel()` are the two ends of that round-trip.
 */

/**
 * Weight suffixes, matching the vocabulary `fontFamilyFromLabel` already
 * strips (color.js). Numeric weights are what the Builder's selects emit.
 */
export const WEIGHT_LABELS = {
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
}

const LABEL_WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}

/**
 * Families the Builder offers, plus every family already named by TYPE_PAIRS,
 * so nothing that was loadable before stops being loadable.
 *
 * `googleCss: null` means "already available, don't fetch" — Plus Jakarta Sans
 * is loaded app-wide from index.html, and System UI is native.
 */
export const FONT_FAMILIES = [
  { id: 'fraunces', name: 'Fraunces', google: 'Fraunces', category: 'serif' },
  {
    id: 'playfair',
    name: 'Playfair Display',
    google: 'Playfair+Display',
    category: 'display',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    google: 'Space+Grotesk',
    category: 'sans',
  },
  {
    id: 'bricolage',
    name: 'Bricolage Grotesque',
    google: 'Bricolage+Grotesque',
    category: 'display',
  },
  { id: 'inter', name: 'Inter', google: 'Inter', category: 'sans' },
  {
    id: 'source-serif',
    name: 'Source Serif 4',
    google: 'Source+Serif+4',
    category: 'serif',
  },
  {
    id: 'plex-mono',
    name: 'IBM Plex Mono',
    google: 'IBM+Plex+Mono',
    category: 'mono',
  },
  /* Added to widen what a brand pack can specify. The roster was five
     overlapping neutral sans with no condensed, no slab and no old-style
     serif, so an identity needing compression or classicism had nothing to
     pick. All SIL OFL — a client can license them for their own use, which
     an Adobe Fonts kit could not offer. */
  { id: 'archivo', name: 'Archivo', google: 'Archivo', category: 'sans' },
  { id: 'oswald', name: 'Oswald', google: 'Oswald', category: 'display' },
  {
    id: 'instrument-serif',
    name: 'Instrument Serif',
    google: 'Instrument+Serif',
    category: 'display',
  },
  {
    id: 'newsreader',
    name: 'Newsreader',
    google: 'Newsreader',
    category: 'serif',
  },
  {
    id: 'eb-garamond',
    name: 'EB Garamond',
    google: 'EB+Garamond',
    category: 'serif',
  },
  {
    id: 'zilla-slab',
    name: 'Zilla Slab',
    google: 'Zilla+Slab',
    category: 'serif',
  },
  { id: 'syne', name: 'Syne', google: 'Syne', category: 'display' },
  { id: 'outfit', name: 'Outfit', google: 'Outfit', category: 'sans' },
  // Already in TYPE_PAIRS — keep them resolvable through this registry too.
  {
    id: 'jakarta',
    name: 'Plus Jakarta Sans',
    google: null,
    category: 'sans',
  },
  {
    id: 'libre-baskerville',
    name: 'Libre Baskerville',
    google: 'Libre+Baskerville',
    category: 'serif',
  },
  {
    id: 'source-sans',
    name: 'Source Sans 3',
    google: 'Source+Sans+3',
    category: 'sans',
  },
  { id: 'dm-sans', name: 'DM Sans', google: 'DM+Sans', category: 'sans' },
  { id: 'lato', name: 'Lato', google: 'Lato', category: 'sans' },
  { id: 'system-ui', name: 'System UI', google: null, category: 'system' },
]

/**
 * The families grouped for a picker, in display order.
 *
 * Derived from FONT_FAMILIES rather than written out, because the Brand Book
 * Builder used to hold its own two literals — `HEADLINE_FONTS` and
 * `BODY_FONTS` — naming seven of the thirteen families here. A family added
 * to the registry was loadable but appeared in no dropdown, so the roster and
 * what you could actually pick drifted apart silently.
 *
 * Grouping is not decoration: both pickers now offer every family, and an
 * unsorted list of twenty-one means reading all of it to find one. The
 * categories let the eye skip to a lane.
 */
const CATEGORY_LABELS = [
  ['sans', 'Sans serif'],
  ['serif', 'Serif'],
  ['display', 'Display'],
  ['mono', 'Monospace'],
  ['system', 'System'],
]

export const FONT_GROUPS = CATEGORY_LABELS.map(([id, label]) => ({
  id,
  label,
  families: FONT_FAMILIES.filter((f) => f.category === id),
})).filter((g) => g.families.length)

const WEIGHT_SUFFIX_RE =
  /\s+(Thin|ExtraLight|Light|Regular|Medium|SemiBold|Semibold|Bold|ExtraBold|Black|Italic|Oblique).*$/i

/** `('Fraunces', '600')` → `'Fraunces SemiBold'`. */
export function labelFor(family, weight) {
  const fam = String(family || '').trim()
  if (!fam) return ''
  const suffix = WEIGHT_LABELS[String(weight)] || WEIGHT_LABELS[400]
  return `${fam} ${suffix}`
}

/**
 * `'Fraunces SemiBold'` → `{ family: 'Fraunces', weight: '600' }`.
 *
 * Unknown suffixes fall back to 400 rather than throwing — a project may hold
 * a label typed before this registry existed.
 */
export function parseLabel(label) {
  const raw = String(label || '').trim()
  if (!raw) return { family: '', weight: '400' }
  const match = raw.match(WEIGHT_SUFFIX_RE)
  const family = raw.replace(WEIGHT_SUFFIX_RE, '').trim()
  const suffix = match ? String(match[1]).toLowerCase() : ''
  return { family: family || raw, weight: LABEL_WEIGHTS[suffix] || '400' }
}

/** The registry entry for a family name, or null. */
export function familyByName(name) {
  const n = String(name || '')
    .trim()
    .toLowerCase()
  return FONT_FAMILIES.find((f) => f.name.toLowerCase() === n) || null
}

/**
 * A single Google Fonts URL covering every label passed in.
 *
 * Returns null when nothing needs fetching — all families native or already
 * loaded — so the caller can remove the stylesheet rather than request an
 * empty one.
 */
export function googleCssForLabels(labels = [], weights = [400, 500, 600, 700]) {
  const wanted = new Map()
  labels.filter(Boolean).forEach((label) => {
    const { family } = parseLabel(label)
    const entry = familyByName(family)
    if (entry?.google) wanted.set(entry.google, true)
  })
  if (!wanted.size) return null
  const wght = weights.join(';')
  const families = [...wanted.keys()]
    .map((g) => `family=${g}:wght@${wght}`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}
