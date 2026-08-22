/**
 * Which applications the brand book shows.
 *
 * The book rendered four fixed mocks — business card, social post, packaging,
 * signage — for every project, whatever the brand was for. A brand that only
 * ever appears in an app got a carrier bag; a bakery got a social tile it had
 * no account for. Meanwhile "Where will this be used?" was asked in the brief
 * (Phase 1) and consumed by nothing at all.
 *
 * This maps that answer onto the mocks the book knows how to draw. It is
 * deliberately a pure lookup with no PDF knowledge — the drawing lives in
 * brandBookPdf, the decision about *what* to draw lives here, where it can be
 * tested without generating a document.
 */

/** Every mock the book can draw, in the order they should appear. */
/**
 * The standard trim size for each surface, for the mock captions in the book.
 *
 * A mock without a size is a picture; a mock with one is something a printer
 * can quote from. These are the common specifications, not this project's
 * decisions — anything bespoke belongs in the designer's own note beside the
 * touchpoint. Surfaces with no meaningful fixed size are absent rather than
 * given an invented one.
 */
export const TOUCHPOINT_SPECS = {
  businessCard: '3.5 × 2 in · 85 × 55 mm',
  print: 'A4 · 210 × 297 mm',
  social: '1080 × 1080 px',
  website: '1440 px wide',
  app: '1024 px icon',
  email: '600 px wide',
  packaging: 'To die-line',
  merch: 'S – XXL',
  signage: 'To survey',
}

export const TOUCHPOINT_ORDER = [
  'businessCard',
  'print',
  'social',
  'website',
  'app',
  'email',
  'packaging',
  'merch',
  'signage',
]

/**
 * What each mock is called when it is named to a reader.
 *
 * Lived privately inside brandBookPdf.js, which meant the on-screen book had
 * no way to name the same mocks and had to list the raw brief answer instead —
 * so the two surfaces described the Applications page differently. The labels
 * belong with the order they label.
 */
export const TOUCHPOINT_LABEL = {
  businessCard: 'Business Card',
  print: 'Print',
  social: 'Social Post',
  website: 'Website',
  app: 'App',
  email: 'Email',
  packaging: 'Packaging',
  merch: 'Merch',
  signage: 'Signage',
}

/** A mock's reader-facing name, falling back to its id. */
export const touchpointLabel = (id) => TOUCHPOINT_LABEL[id] || id

/**
 * One-line prompt for the note field — what to check on this mock.
 * Keeps Touchpoints tied to the book applications page.
 */
export const TOUCHPOINT_CHECK = {
  businessCard: 'Lockup, type size, contact hierarchy',
  print: 'Headline, logo placement, margins',
  social: 'Crop, wordmark vs icon, contrast',
  website: 'Nav mark, hero type, accent use',
  app: 'Icon, splash, readable at small size',
  email: 'Header mark, signature line',
  packaging: 'Front panel, hierarchy at arm’s length',
  merch: 'Print area, one color vs full',
  signage: 'Distance read, contrast',
}

export const touchpointCheckHint = (id) =>
  TOUCHPOINT_CHECK[id] || 'How the system shows up here'
/**
 * Brief surface id → the mocks it implies.
 *
 * `print` yields two: a business card is print, and it is the single most
 * recognisable proof a system holds together. Dropping it because someone
 * ticked "Print" rather than a card-shaped box would lose the best mock in
 * the book on a technicality.
 */
const SURFACE_TO_TOUCHPOINTS = {
  print: ['businessCard', 'print'],
  social: ['social'],
  website: ['website'],
  app: ['app'],
  email: ['email'],
  packaging: ['packaging'],
  merch: ['merch'],
  signage: ['signage'],
}

/**
 * Retired default set. Not a membership source.
 *
 * The book used to invent these four mocks when nobody named a surface.
 * That presented unjudged applications as the brand in use. Empty now
 * means empty: the Applications page is omitted until Brief surfaces,
 * bought deliverables, or designerSurfaces derive a set.
 */
export const LEGACY_TOUCHPOINTS = [
  'businessCard',
  'social',
  'packaging',
  'signage',
]

/**
 * @param {string[]} surfaces  brief `brandSurfaces` ids
 * @param {string[]} deliverables  brief `deliverablesPicked` ids
 * @returns {string[]} touchpoint keys, in TOUCHPOINT_ORDER, no duplicates
 */
export function touchpointsFor(surfaces = [], deliverables = []) {
  const picked = new Set()
  for (const s of Array.isArray(surfaces) ? surfaces : []) {
    for (const t of SURFACE_TO_TOUCHPOINTS[s] || []) picked.add(t)
  }

  /* A deliverable the client explicitly asked to be MADE counts too. Someone
     can order business cards without thinking to tick "Print" as a place the
     brand lives, and the book should not then refuse to show them one. */
  const deliv = Array.isArray(deliverables) ? deliverables : []
  if (deliv.includes('businessCard')) picked.add('businessCard')
  if (deliv.includes('packaging')) picked.add('packaging')
  if (deliv.includes('signage')) picked.add('signage')
  if (deliv.includes('merch')) picked.add('merch')
  if (deliv.includes('website')) picked.add('website')
  if (deliv.includes('socialKit')) picked.add('social')
  if (deliv.includes('emailSignature')) picked.add('email')
  if (deliv.includes('printCollateral')) picked.add('print')

  if (picked.size === 0) return []
  return TOUCHPOINT_ORDER.filter((t) => picked.has(t))
}

/**
 * One line for the Applications page subhead, so the client can see the page
 * answers their own brief rather than looking like a template.
 */
export function touchpointsBlurb(surfaces = [], deliverables = []) {
  const chosen = touchpointsFor(surfaces, deliverables)
  const named =
    (Array.isArray(surfaces) && surfaces.length) ||
    (Array.isArray(deliverables) && deliverables.length)
  return named
    ? 'Proof of system — the places you said this brand lives.'
    : 'Proof of system — how the brand shows up in the world.'
}

/**
 * Every surface the brand has to appear on: the client's brief answer first,
 * then anything the designer added at Touchpoints.
 *
 * TWO LISTS, ONE VIEW. Touchpoints used to push straight into
 * `detective.brandSurfaces`, so a designer adding "signage" rewrote the
 * client's own answer with no record that anyone had. The brief keeps saying
 * what the client asked for; `designerSurfaces` holds the rest. Both reach the
 * client's book — who noticed a surface is a question about authorship, not
 * about whether the brand appears there.
 *
 * @param {object} project
 * @returns {string[]} brief ids first, designer additions after, no repeats
 */
export function allBrandSurfaces(project) {
  const brief = Array.isArray(project?.detective?.brandSurfaces)
    ? project.detective.brandSurfaces
    : []
  const mine = Array.isArray(project?.designerSurfaces)
    ? project.designerSurfaces
    : []
  return [...brief, ...mine.filter((id) => id && !brief.includes(id))]
}

/**
 * The surfaces a book has, from either kind of pack.
 *
 * A live pack carries the brief's SURFACES and `touchpointsFor` maps them to
 * touchpoints. A frozen pack carries the touchpoint list the Version was built
 * from and an empty `detective` on purpose, so deriving is neither possible
 * nor wanted there — what was frozen is the answer.
 *
 * The hoisted `brandSurfaces` wins, but `buildBrandPackSnapshot` only fills it
 * when the brief holds surfaces — an older project answered into `detective`
 * alone, so dropping that fallback would empty its Applications section.
 */
export function packTouchpoints(pack) {
  if (Array.isArray(pack?.touchpoints) && pack.touchpoints.length) return [...pack.touchpoints]
  return touchpointsFor(
    pack?.brandSurfaces?.length ? pack.brandSurfaces : pack?.detective?.brandSurfaces,
    pack?.detective?.deliverablesPicked
  )
}
