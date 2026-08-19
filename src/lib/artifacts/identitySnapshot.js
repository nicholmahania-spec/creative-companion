/**
 * A published Identity snapshot — the values as they were at send time.
 *
 * Live Identity (palette, type faces, chosen mark) stays mutable on the
 * project. This record is a copy taken when the studio publishes, so a later
 * edit cannot change what was sent. It is not the delivery pack, the Brand
 * Book, or a Direction artifact.
 *
 * Stored two ways on a new send:
 *   - appended to `project.identitySnapshots` (history; earlier entries stay)
 *   - copied onto `delivery_pack.identity` (what /d reads for this send)
 *
 * Rows published before this existed have no snapshot. Those keep rendering
 * from the pack alone.
 */

import { makeRef, refKey } from './artifactRef'
import { paletteSnapshot, typePairingSnapshot } from './artifactSnapshot'

const clean = (v) => String(v ?? '').trim()

function copyJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function chosenMark(project) {
  const concepts = Array.isArray(project?.logoConcepts) ? project.logoConcepts : []
  const hit = concepts.find((c) => c?.chosen) || null
  if (hit) return { id: clean(hit.id), image: clean(hit.image) }
  const legacy = clean(project?.logoImage)
  return legacy ? { id: '', image: legacy } : null
}

/**
 * Copy of the project's Identity at this moment. Always a new snapshotId,
 * even when the content matches an earlier send.
 *
 * @param {object} project
 * @param {{ publishedAt?: string }} [opts]
 */
export function buildIdentitySnapshot(project, { publishedAt } = {}) {
  const mark = chosenMark(project)
  const pal = paletteSnapshot(project)
  const type = typePairingSnapshot(project)
  const hasPalette = (pal.hexes || []).length > 0
  const hasType = !!(clean(type.heading) || clean(type.body))
  const refs = [
    mark?.id ? refKey(makeRef('markConcept', mark.id)) : '',
    hasPalette ? refKey(makeRef('palette', pal.id)) : '',
    hasType ? refKey(makeRef('typePairing', type.id)) : '',
  ].filter(Boolean)

  return copyJson({
    v: 1,
    kind: 'identitySnapshot',
    snapshotId: `idsnap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    publishedAt: publishedAt || new Date().toISOString(),
    refs,
    payload: {
      mark: mark ? { id: mark.id, image: mark.image } : null,
      palette: hasPalette ? { hexes: pal.hexes, roles: pal.roles } : null,
      type: hasType
        ? {
            heading: clean(type.heading),
            body: clean(type.body),
            why: clean(project?.typeWhy),
          }
        : null,
      wordmark: clean(project?.logoWordmark),
      logoDirection: clean(project?.logoDirection),
    },
  })
}

/**
 * Presentation Send only. Attaches frozen mark images for the composition.
 * Book Send never calls this — payload.presentedMarks stays absent.
 */
export function withPresentedMarks(snapshot, marks) {
  if (!isIdentitySnapshot(snapshot)) return snapshot
  const list = Array.isArray(marks)
    ? marks
        .map((m) => ({
          id: clean(m?.id),
          image: clean(m?.image),
        }))
        .filter((m) => m.id && m.image)
    : []
  const next = copyJson(snapshot)
  next.payload = { ...(next.payload || {}), presentedMarks: list }
  return next
}

/** Frozen mark image. Never reads live logoConcepts. */
export function frozenPresentedMarkImage(snapshot, markId) {
  const id = clean(markId)
  if (!id || !isIdentitySnapshot(snapshot)) return ''
  const marks = snapshot.payload?.presentedMarks
  if (!Array.isArray(marks)) return ''
  const hit = marks.find((m) => clean(m?.id) === id)
  return clean(hit?.image)
}

/** True for a snapshot this module would have written. */
export function isIdentitySnapshot(value) {
  return !!(
    value &&
    typeof value === 'object' &&
    value.kind === 'identitySnapshot' &&
    clean(value.snapshotId)
  )
}

/**
 * Identity fields from a snapshot onto a delivery pack, for /d.
 *
 * Pack-only fields (page setup, words, pins) stay on the pack. Missing
 * snapshot values leave the pack field alone so an old row without a
 * snapshot is unchanged.
 */
export function packForPublishedIdentity(pack, snapshot) {
  if (!pack || typeof pack !== 'object') return pack
  if (!isIdentitySnapshot(snapshot)) return pack
  const payload = snapshot.payload || {}
  const next = { ...pack }
  if (payload.palette?.hexes) next.palette = [...payload.palette.hexes]
  if (payload.palette?.roles) next.colorRoles = { ...payload.palette.roles }
  if (payload.type) {
    if (payload.type.heading) next.typeHeading = payload.type.heading
    if (payload.type.body) next.typeBody = payload.type.body
    if ('why' in payload.type) next.typeWhy = payload.type.why
  }
  if (payload.mark && 'image' in payload.mark) next.logoImage = payload.mark.image || ''
  if ('wordmark' in payload) next.logoWordmark = payload.wordmark
  if ('logoDirection' in payload) next.logoDirection = payload.logoDirection
  return next
}
