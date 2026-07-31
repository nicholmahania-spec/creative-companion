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

/**
 * The page backgrounds the book actually paints, resolved to hex.
 *
 * The builder stored these as token ids and resolved them privately inside the
 * view, so the exported PDF never saw them: every page-background control was
 * screen-only, and the file the client received ignored all of them. Resolving
 * here means one implementation, and the pack can carry the answers to the
 * generator rather than the generator re-deriving them from token ids it would
 * have to learn to read.
 *
 * `white` is the builder's own default rather than a token, so it resolves to
 * paper regardless of the palette — a project with no palette still has pages.
 */
export function resolvePageBg(tokens, key) {
  if (!key || key === 'white') return '#ffffff'
  const token = (tokens || []).find((t) => String(t.id) === String(key))
  return token ? token.hex : '#ffffff'
}

/** Every page background for a project, as hex, keyed the way the book is. */
export function resolvedPageBackgrounds(project) {
  const bb = bookBuilderFor(project)
  const tokens = readPaletteTokens(project)
  const out = {}
  Object.keys(bb.pageBg || {}).forEach((k) => {
    out[k] = resolvePageBg(tokens, bb.pageBg[k])
  })
  return out
}

/* ─────────────────── the rest of the Builder, resolved ───────────────────

   Same reasoning as `resolvedPageBackgrounds` above, applied to the four
   control groups that were still screen-only: type size, type colour, grid
   and running elements. Each one drew on the book on screen and was ignored
   by the exported PDF, so the panel looked like it styled the deliverable
   and did not. Resolving here rather than in the view means the screen and
   the generator cannot answer differently, and the pack carries finished
   answers instead of token ids the generator would have to learn to read.

   Font family and weight are deliberately absent: the Builder's pickers
   already write through to `project.typeHeading` / `typeBody`, which the
   book prints on its Type page. They were wired all along.                */

/** The sizes the book is designed at, in pt — the denominator for a ratio. */
export const BOOK_TYPE_BASE = { headline: 32, subhead: 16, body: 10.5 }

const num = (v, fallback) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * Type size as a RATIO per role, not an absolute.
 *
 * The generator sets a different size at each call site — a cover title and a
 * section title are both "headline" and are deliberately not the same size.
 * Handing it one absolute number would flatten that hierarchy into a slab.
 * A ratio scales the design's own proportions, so asking for bigger headlines
 * makes every headline bigger *relative to the others*, which is what the
 * control appears to promise.
 *
 * Clamped: past roughly half or double, the layout's line breaks and column
 * fits stop holding and the book starts overflowing its own pages.
 */
export function resolvedTypeScale(project) {
  const t = bookBuilderFor(project).type || {}
  const ratio = (value, base) =>
    Math.min(2, Math.max(0.5, num(value, base) / base))
  return {
    headline: ratio(t.headlineSize, BOOK_TYPE_BASE.headline),
    subhead: ratio(t.subheadSize, BOOK_TYPE_BASE.subhead),
    body: ratio(t.bodySize, BOOK_TYPE_BASE.body),
  }
}

/**
 * Type colours as hex, or null where the user left it on "auto".
 *
 * null is meaningful and must survive to the generator: "auto" means the book
 * keeps deriving the colour from the palette roles and, on a dark page, from
 * what stays readable on it. Resolving auto to a fixed hex here would freeze
 * that and leave unreadable type on a repainted page.
 */
export function resolvedTypeColors(project) {
  const tokens = readPaletteTokens(project)
  const tc = bookBuilderFor(project).typeColor || {}
  const one = (key) => {
    if (!key || key === 'auto') return null
    const token = tokens.find((t) => String(t.id) === String(key))
    return token ? token.hex : null
  }
  return {
    headline: one(tc.headline),
    subhead: one(tc.subhead),
    body: one(tc.body),
  }
}

/** Grid guides, as numbers the generator can draw without re-parsing. */
export function resolvedGrid(project) {
  const g = bookBuilderFor(project).grid || {}
  return {
    show: !!g.show,
    columns: Math.min(24, Math.max(1, Math.round(num(g.columns, 12)))),
    rows: Math.min(24, Math.max(1, Math.round(num(g.rows, 1)))),
    // Percentages of the content box, as the Builder labels them.
    gutter: Math.min(20, Math.max(0, num(g.gutter, 3))),
    margin: Math.min(30, Math.max(0, num(g.margin, 9))),
  }
}

/**
 * Running header, footer and page numbers.
 *
 * `text` falls back to the project's own name rather than being left blank —
 * the Builder's field says "Defaults to brand name" on screen, and a control
 * that states its own default has to honour it in the file too.
 */
export function resolvedRunning(project) {
  const r = bookBuilderFor(project).running || {}
  const name = String(project?.name || '').trim()
  return {
    show: !!r.show,
    text: String(r.text || '').trim() || name,
    align: ['left', 'center', 'right'].includes(r.align) ? r.align : 'left',
    showFooter: !!r.showFooter,
    footerText: String(r.footerText || '').trim(),
    footerAlign: ['left', 'center', 'right'].includes(r.footerAlign)
      ? r.footerAlign
      : 'left',
    showPageNumbers: !!r.showPageNumbers,
    alternate: !!r.alternate,
  }
}
