/**
 * Brand Book Builder — per-project settings and named colour tokens.
 *
 * Every default here is copied from the owner's `BrandBookBuilder.jsx`
 * `useState` initialisers, so a project that has never opened the Builder
 * renders exactly as their file does on first load. Do not "improve" these
 * values — matching the design is the point.
 *
 * Read through `bookBuilderFor()` / `readPaletteTokens()` rather than touching
 * `project.bookBuilder` directly. Both fill in defaults at read time, which is
 * why projects saved before these fields existed need no migration — the same
 * pattern the store already uses for `writingCase`.
 */

/** Colour-row names from the owner's DEFAULT_COLORS, in order. */
export const DEFAULT_TOKEN_NAMES = ['Primary', 'Accent', 'Ink', 'Paper']

/** Matches the id shape the store already mints for other collections. */
export function mintTokenId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function blankBookBuilder() {
  return {
    /* Somewhere for a future shape change to hang. */
    v: 1,
    type: {
      headlineFont: 'Fraunces',
      bodyFont: 'Inter',
      headlineSize: 32,
      headlineWeight: '600',
      subheadSize: 16,
      subheadWeight: '400',
      bodySize: 10.5,
      bodyWeight: '400',
    },
    typeColor: { headline: 'auto', subhead: 'auto', body: 'auto' },
    pageBg: {
      pageCover: 'white',
      pageColors: 'white',
      pageType: 'white',
      pageBack: 'white',
    },
    grid: { columns: 12, rows: 1, gutter: 3, margin: 9, show: true },
    running: {
      show: true,
      text: '',
      align: 'left',
      showFooter: false,
      footerText: '',
      footerAlign: 'left',
      showPageNumbers: true,
      alternate: false,
    },
    print: { pageSize: 'letter', bleed: false },
  }
}

/** Sections whose keys are merged individually rather than replaced wholesale. */
const SECTIONS = ['type', 'typeColor', 'pageBg', 'grid', 'running', 'print']

/**
 * The Builder's settings for a project, with every key present.
 *
 * Merges one level INTO each section rather than spreading the stored object
 * over the blank one. A shallow merge would let a partially-written section
 * (say `grid` saved before `rows` existed) drop its siblings and hand the UI
 * an undefined where it expects a number.
 */
export function bookBuilderFor(project) {
  const blank = blankBookBuilder()
  const saved = project?.bookBuilder
  if (!saved || typeof saved !== 'object') return blank
  const out = { ...blank, ...saved }
  SECTIONS.forEach((key) => {
    out[key] = { ...blank[key], ...(saved[key] || {}) }
  })
  return out
}

/**
 * The colour rows the Builder edits: `{ id, name, hex }`, one per palette entry.
 *
 * `hex` always comes from `project.palette` — it is never stored in
 * `paletteTokens`, so there is exactly one home for a colour value and the two
 * arrays cannot disagree about it. Names and ids are positional; a colour added
 * or removed outside the Builder shifts the names with the indices, which shows
 * a stale name rather than corrupting anything.
 *
 * Ids matter beyond React keys: page backgrounds and type colours store a
 * colour's id, so if ids were array indices, deleting one colour would silently
 * re-point every page that referenced a later one.
 */
export function readPaletteTokens(project) {
  const palette = Array.isArray(project?.palette) ? project.palette : []
  const stored = Array.isArray(project?.paletteTokens)
    ? project.paletteTokens
    : []
  return palette.map((hex, i) => {
    const row = stored[i]
    return {
      id: row?.id || `t${i + 1}`,
      name: row?.name || DEFAULT_TOKEN_NAMES[i] || 'New token',
      hex,
    }
  })
}

/** The palette cap the store enforces. Surfaced so the UI can say why. */
export const MAX_COLORS = 8
/** The floor `removePaletteColor` enforces, for the same reason. */
export const MIN_COLORS = 2
