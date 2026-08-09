/**
 * A direction as a small visual preview — paper, type, mark.
 *
 * DISPLAY ONLY. Nothing here is written to the store. A direction holds
 * refKeys and evidence keys; this resolves them at the moment of draw, the
 * same way `directionComposition` and `directionEvidence` do.
 *
 * WHEN A SLOT IS UNSET, the preview may fall back to catalog facts on the
 * route's own citations (colour hexes, type sample labels). It does not read
 * the project's live Identity palette or pairing, and it invents no names,
 * palettes or rationales.
 */

import { bestTextOn, mapPaletteRoles, normalizeHex } from '../color'
import { directionComposition } from './directionComposition'
import { directionEvidence } from './directionEvidence'
import { typeSpecimen } from './typeSpecimen'

/**
 * The two rungs a direction card needs — hierarchy, not the full type bench.
 *
 * Display (heading face) + body (body face) so a pairing is visible. The
 * shared tagline text is applied to the second rung after resolution — see
 * `directionPreview` — so A/B/C read the same words while the faces change.
 */
export const PREVIEW_RUNG_IDS = Object.freeze(['display', 'body'])

const clean = (v) => String(v ?? '').trim()

/**
 * A type-face label from a Visual Discovery type sample.
 *
 * Samples store family + weight as catalog facts. The rest of the app speaks
 * in "Family Weight" labels (`typePairingSnapshot`, `fontFamilyFromLabel`),
 * so this is the same shape — not a new naming scheme.
 */
function typeLabelFromSample(sample) {
  if (!sample || sample.category !== 'type') return ''
  const family = clean(sample.family)
  if (!family) return ''
  const weight = Number(sample.weight)
  const weightWord = Number.isFinite(weight) && weight >= 700 ? 'Bold' : 'Regular'
  return `${family} ${weightWord}`
}

/** Hexes cited on this route — sample colours and colour pins only. */
function hexesFromEvidence(items) {
  const out = []
  for (const item of items || []) {
    if (item?.missing) continue
    if (item.sample?.category === 'color' && item.sample.hex) {
      const h = normalizeHex(item.sample.hex)
      if (h) out.push(h)
      continue
    }
    const pin = item.pin || {}
    if (pin.type === 'color') {
      const h = normalizeHex(pin.visual || pin.hex || '')
      if (h) out.push(h)
    }
  }
  return out
}

/** Type-face labels cited on this route, in citation order. */
function typeLabelsFromEvidence(items) {
  const out = []
  for (const item of items || []) {
    if (item?.missing) continue
    const label = typeLabelFromSample(item.sample)
    if (label) out.push(label)
  }
  return out
}

/**
 * Project-shaped input for `typeSpecimen`, scoped to this route.
 *
 * Tagline and brief-derived lines stay on the live project so A, B and C share
 * the same real words — the design variables that change are paper, faces and
 * mark. The route title, when present, is the display line (user-authored);
 * it is not invented.
 *
 * @param {object} project
 * @param {object} direction
 * @param {{typeHeading: string, typeBody: string}} faces
 */
function specimenProject(project, direction, faces) {
  const title = clean(direction?.title)
  const base = project || {}
  /* Spread keeps effectiveWord sources (positioning, promise, …) available so
     the body rung can use real project language when it exists. type faces are
     always the route's resolved ones — never silently the Identity pairing. */
  const next = {
    ...base,
    typeHeading: faces.typeHeading,
    typeBody: faces.typeBody,
  }
  if (title) {
    /* Display rung prefers clientName, then wordmark, then project name.
       Putting the route name on clientName makes it the specimen title without
       inventing brand copy. */
    next.detective = { ...(base.detective || {}), clientName: title }
  }
  return next
}

/**
 * Resolve a direction into the view-model a small preview can draw.
 *
 * @param {object} project
 * @param {object} direction
 * @param {{ moodItems?: array, projectId?: string|number }} [opts]
 * @returns {{
 *   paper: string,
 *   ink: string,
 *   hexes: string[],
 *   mark: object|null,
 *   rungs: array,
 *   title: string,
 *   sources: { palette: 'ref'|'evidence'|'none', type: 'ref'|'evidence'|'none' }
 * }}
 */
export function directionPreview(project, direction, opts = {}) {
  const parts = directionComposition(project, direction)
  const projectId = opts.projectId ?? project?.id
  const cited = directionEvidence(direction, opts.moodItems, projectId)

  let hexes = []
  let paletteSource = 'none'
  if (Array.isArray(parts.palette?.hexes) && parts.palette.hexes.length) {
    hexes = parts.palette.hexes.map((h) => normalizeHex(h)).filter(Boolean)
    paletteSource = 'ref'
  } else {
    hexes = hexesFromEvidence(cited)
    if (hexes.length) paletteSource = 'evidence'
  }

  let typeHeading = ''
  let typeBody = ''
  let typeSource = 'none'
  if (parts.typePairing) {
    typeHeading = clean(parts.typePairing.heading)
    typeBody = clean(parts.typePairing.body)
    if (typeHeading || typeBody) typeSource = 'ref'
  } else {
    const labels = typeLabelsFromEvidence(cited)
    if (labels.length) {
      typeHeading = labels[0]
      typeBody = labels[1] || labels[0]
      typeSource = 'evidence'
    }
  }

  const roles = mapPaletteRoles(hexes)
  /* Paper is the light surface the specimen sits on; ink must contrast with
     that surface, not with cover (roles.text is cover-contrast). */
  const paper = roles.background || roles.quiet || '#FAFAF9'
  const ink = bestTextOn(paper)

  const specimen = typeSpecimen(
    specimenProject(project, direction, { typeHeading, typeBody })
  )
  const display = specimen.find((r) => r.id === 'display')
  const body = specimen.find((r) => r.id === 'body')
  const heading = specimen.find((r) => r.id === 'heading')
  /* Second rung keeps the body face and size (the pairing under test) but
     carries the shared tagline when the project has one — so three cards
     compare design variables, not three different sentences. When there is
     no tagline, the body rung's own resolved line stands. */
  const second =
    body && heading?.sourced
      ? { ...body, text: heading.text, own: heading.own, sourced: heading.sourced }
      : body
  const rungs = [display, second].filter(Boolean)

  return {
    paper,
    ink,
    hexes,
    mark: parts.mark || null,
    rungs,
    title: clean(direction?.title),
    sources: { palette: paletteSource, type: typeSource },
  }
}
