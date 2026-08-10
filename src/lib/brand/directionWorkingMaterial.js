/**
 * Chosen direction as Identity's provisional working material.
 *
 * DISPLAY / CONTEXT ONLY. Resolves what the active route already holds —
 * composition refs and citations — without writing project brand fields.
 * Canonical Identity (palette, type faces, logoImage) stays the system of
 * record until the designer Uses or edits.
 *
 *   CHOSEN DIRECTION MATERIAL  ≠  FINAL APPROVED IDENTITY SYSTEM
 */

import { normalizeHex } from '../color'
import { directionComposition } from './directionComposition'
import { directionEvidence } from './directionEvidence'

const clean = (v) => String(v ?? '').trim()

function typeLabelFromSample(sample) {
  if (!sample || sample.category !== 'type') return ''
  const family = clean(sample.family)
  if (!family) return ''
  const weight = Number(sample.weight)
  const weightWord = Number.isFinite(weight) && weight >= 700 ? 'Bold' : 'Regular'
  return `${family} ${weightWord}`
}

function colourHexesFromEvidence(items) {
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
 * @param {object} project
 * @param {object|null} direction  one of project.directions, or null
 * @param {array} [moodItems]
 * @returns {null | {
 *   directionId: string,
 *   title: string,
 *   note: string,
 *   evidence: array,
 *   colour: { source: 'ref'|'evidence'|'none', hexes: string[], roles: object|null },
 *   type: { source: 'ref'|'evidence'|'none', heading: string, body: string, samples: string[] },
 *   mark: { source: 'ref'|'none', concept: object|null },
 *   parts: { colour: object, type: object, mark: object },
 *   hasAnyMaterial: boolean,
 * }}
 */
export function directionWorkingMaterial(project, direction, moodItems = []) {
  if (!direction?.id) return null

  const partsResolved = directionComposition(project, direction)
  const evidence = directionEvidence(direction, moodItems, project?.id)

  let colourSource = 'none'
  let colourHexes = []
  let colourRoles = null
  if (partsResolved.palette) {
    colourHexes = (partsResolved.palette.hexes || [])
      .map((h) => normalizeHex(h))
      .filter(Boolean)
    colourRoles = partsResolved.palette.roles || null
    if (colourHexes.length) colourSource = 'ref'
  }
  if (colourSource === 'none') {
    colourHexes = colourHexesFromEvidence(evidence)
    if (colourHexes.length) colourSource = 'evidence'
  }

  let typeSource = 'none'
  let heading = ''
  let body = ''
  let samples = []
  if (partsResolved.typePairing) {
    heading = clean(partsResolved.typePairing.heading)
    body = clean(partsResolved.typePairing.body)
    if (heading || body) typeSource = 'ref'
  }
  if (typeSource === 'none') {
    samples = typeLabelsFromEvidence(evidence)
    if (samples.length) typeSource = 'evidence'
  }

  const markConcept = partsResolved.mark || null
  const markSource = markConcept ? 'ref' : 'none'

  const colourPart = {
    slot: 'colour',
    source: colourSource,
    state:
      colourSource === 'ref'
        ? 'captured'
        : colourSource === 'evidence'
          ? 'evidence'
          : 'missing',
    summary:
      colourSource === 'ref'
        ? `${colourHexes.length} colours on this route`
        : colourSource === 'evidence'
          ? `${colourHexes.length} cited colours — develop into a palette on Color`
          : 'No colour on this route yet',
  }

  const typePart = {
    slot: 'type',
    source: typeSource,
    state:
      typeSource === 'ref'
        ? 'captured'
        : typeSource === 'evidence'
          ? 'evidence'
          : 'missing',
    summary:
      typeSource === 'ref'
        ? [heading, body].filter(Boolean).join(' + ')
        : typeSource === 'evidence'
          ? `Sample reactions only (${samples.slice(0, 2).join(', ')}${
              samples.length > 2 ? '…' : ''
            }) — no pairing captured`
          : 'No type on this route yet',
  }

  const markPart = {
    slot: 'mark',
    source: markSource,
    state: markSource === 'ref' ? 'captured' : 'missing',
    summary:
      markSource === 'ref'
        ? markConcept.label || 'Mark on this route'
        : 'No mark on this route yet',
  }

  const hasAnyMaterial =
    colourSource !== 'none' || typeSource !== 'none' || markSource !== 'none'

  return {
    directionId: String(direction.id),
    title: clean(direction.title),
    note: clean(direction.note),
    evidence,
    colour: {
      source: colourSource,
      hexes: colourHexes,
      roles: colourRoles,
    },
    type: {
      source: typeSource,
      heading,
      body,
      samples,
    },
    mark: {
      source: markSource,
      concept: markConcept,
    },
    parts: {
      colour: colourPart,
      type: typePart,
      mark: markPart,
    },
    hasAnyMaterial,
  }
}

/**
 * Active direction's working material, or null when none is open.
 */
export function activeDirectionWorkingMaterial(project, moodItems = []) {
  const id = project?.activeDirectionId || null
  if (!id) return null
  const direction = (project?.directions || []).find((d) => d?.id === id)
  return directionWorkingMaterial(project, direction, moodItems)
}

/**
 * Project-shaped view for Identity's sheet while a direction is open.
 *
 * Overrides only the visual system slots that the route actually holds
 * (type pairing, mark image). Never invents faces or a logo. Brief words and
 * designer-authored lines stay on the real project. Does not mutate store.
 *
 * @param {object} project
 * @param {ReturnType<typeof directionWorkingMaterial>} working
 */
export function projectViewForDirectionMaterial(project, working) {
  if (!project || !working) return project
  const next = { ...project }
  if (working.type.source === 'ref') {
    if (working.type.heading) next.typeHeading = working.type.heading
    if (working.type.body) next.typeBody = working.type.body
  }
  if (working.mark.concept?.image) {
    next.logoImage = working.mark.concept.image
  }
  return next
}
