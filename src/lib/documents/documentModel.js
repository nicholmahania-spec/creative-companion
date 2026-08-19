/**
 * Phase 4B / 5 — Document / Document Template / Document Version.
 *
 * A Document is a mutable composition instance for one project.
 * This plane holds the Book (4B) and the Presentation (5).
 * A Document Template is structure only.
 * A Document Version is an immutable freeze at a named event.
 *
 * Identity stays on the project. Versions reference it; they do not own it.
 */

import { makeRef, parseRefKey } from '../artifacts/artifactRef'
import { paletteSnapshot, typePairingSnapshot } from '../artifacts/artifactSnapshot'
import { bookBuilderFor } from '../book/bookBuilder'
import { presentationBuilderFor } from './presentationBuilder'

export const DTPL_BUILTIN_BOOK = 'dtpl_builtin_book'
export const DTPL_BUILTIN_PRESENTATION = 'dtpl_builtin_presentation'

export const DOCUMENT_KIND_BOOK = 'book'
export const DOCUMENT_KIND_PRESENTATION = 'presentation'

export const FREEZE_SENT = 'sent'
export const FREEZE_SENT_FOR_REVIEW = 'sentForReview'

/**
 * Representable events. Book Send writes `sent`.
 * Presentation Send writes `sentForReview`. Later events are not written here.
 */
export const DOCUMENT_VERSION_FREEZE_EVENTS = Object.freeze([
  'sent',
  'sentForReview',
  'changesRequested',
  'approved',
  'delivered',
])

export const DOCUMENT_VERSION_CONTENT_REF_KINDS = Object.freeze([
  'markConcept',
  'palette',
  'typePairing',
])

export const DOCUMENT_VERSION_FORBIDDEN_KEYS = Object.freeze([
  'detective',
  'brief',
  'directions',
  'tasks',
  'logoImage',
  'pageOrder',
  'delivery_pack',
  'pack',
])

function copyJson(value) {
  if (value == null || typeof value !== 'object') return value
  return JSON.parse(JSON.stringify(value))
}

function mint(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function mintDocumentId() {
  return mint('doc')
}

export function mintDocumentVersionId() {
  return mint('dver')
}

export function emptyDocumentVersions() {
  return []
}

export function emptyDocuments() {
  return []
}

export function documentsOf(project) {
  return Array.isArray(project?.documents) ? project.documents.filter(Boolean) : []
}

export function upsertDocumentList(list, doc) {
  const next = Array.isArray(list) ? list.slice() : []
  if (!doc?.kind) return next
  const i = next.findIndex((d) => d?.kind === doc.kind)
  if (i >= 0) next[i] = doc
  else next.push(doc)
  return next
}

/** Additive hydrate: keep Book alias, seed documents[] from it, never invent Presentation. */
export function hydrateProjectDocuments(p) {
  const document = p?.document && typeof p.document === 'object' ? p.document : null
  let documents = Array.isArray(p?.documents)
    ? p.documents.filter((d) => d && typeof d === 'object')
    : []
  if (
    isBookDocument(document) &&
    !documents.some((d) => d?.kind === DOCUMENT_KIND_BOOK && d.documentId === document.documentId)
  ) {
    documents = [...documents, document]
  }
  return {
    document,
    documents,
    documentVersions: Array.isArray(p?.documentVersions) ? p.documentVersions : [],
    presentationBuilder: presentationBuilderFor(p),
  }
}

/**
 * Presentation chrome from the live Book. Working state stays on
 * `project.bookBuilder`; this is a snapshot for a Version.
 */
export function overridesFromBookBuilder(project) {
  const bb = bookBuilderFor(project)
  return copyJson({
    pageSize: bb.pageSize,
    edgeSpace: bb.edgeSpace,
    printShop: bb.printShop,
    type: bb.type,
    typeColor: bb.typeColor,
    pageBg: bb.pageBg,
    running: bb.running,
  })
}

/**
 * Identity artifact refs at this moment. Values stay on the project /
 * identity snapshot; the Version only stores { kind, id }.
 */
export function contentRefsFromProject(project) {
  const refs = {}
  const chosen = (project?.logoConcepts || []).find((c) => c?.chosen)
  if (chosen?.id) {
    refs.markConcept = makeRef('markConcept', String(chosen.id))
  }
  const pal = paletteSnapshot(project)
  if ((pal.hexes || []).length) {
    refs.palette = makeRef('palette', pal.id)
  }
  const type = typePairingSnapshot(project)
  if (String(type.heading || '').trim() || String(type.body || '').trim()) {
    refs.typePairing = makeRef('typePairing', type.id)
  }
  return refs
}

export function isBookDocument(value) {
  return !!(
    value &&
    typeof value === 'object' &&
    value.kind === DOCUMENT_KIND_BOOK &&
    value.documentId &&
    value.templateId === DTPL_BUILTIN_BOOK
  )
}

/** One Book Document for this project. Does not mint if one already exists. */
export function ensureBookDocumentData(project, now = new Date().toISOString()) {
  if (isBookDocument(project?.document)) {
    return project.document
  }
  const listed = documentsOf(project).find(isBookDocument)
  if (listed) return listed
  return {
    documentId: mintDocumentId(),
    projectId: project?.id,
    kind: DOCUMENT_KIND_BOOK,
    templateId: DTPL_BUILTIN_BOOK,
    createdAt: now,
    updatedAt: now,
  }
}

export function isPresentationDocument(value) {
  return !!(
    value &&
    typeof value === 'object' &&
    value.kind === DOCUMENT_KIND_PRESENTATION &&
    value.documentId &&
    value.templateId === DTPL_BUILTIN_PRESENTATION
  )
}

/** One Presentation Document. Looks only at documents[]. Never writes the Book alias. */
export function ensurePresentationDocumentData(project, now = new Date().toISOString()) {
  const listed = documentsOf(project).find(isPresentationDocument)
  if (listed) return listed
  return {
    documentId: mintDocumentId(),
    projectId: project?.id,
    kind: DOCUMENT_KIND_PRESENTATION,
    templateId: DTPL_BUILTIN_PRESENTATION,
    createdAt: now,
    updatedAt: now,
  }
}

const DIRECTION_REF_SLOTS = Object.freeze([
  ['mark', 'markConcept'],
  ['palette', 'palette'],
  ['typePairing', 'typePairing'],
])

/**
 * Expand working Presentation contents into freeze-time composition items.
 * Copies Direction title as label. Does not store note, evidence, or payload.
 */
export function expandPresentationComposition(project) {
  const builder = presentationBuilderFor(project)
  const dirs = Array.isArray(project?.directions) ? project.directions : []
  return builder.contents.map((row) => {
    const dir = dirs.find((d) => d?.recordId && d.recordId === row.id) || null
    const contentRefs = {}
    const refs = dir?.refs && typeof dir.refs === 'object' ? dir.refs : {}
    for (const [slot, kind] of DIRECTION_REF_SLOTS) {
      const parsed = parseRefKey(refs[slot])
      if (!parsed || parsed.kind !== kind || !parsed.id) continue
      contentRefs[kind] = makeRef(kind, parsed.id)
    }
    return {
      itemId: row.itemId,
      sourceKind: 'direction',
      sourceId: row.id,
      label: String(dir?.title || '').trim(),
      contentRefs,
    }
  })
}

/** Mark images to freeze onto an Identity Snapshot for this composition. */
export function presentedMarksFromComposition(project, composition) {
  const concepts = Array.isArray(project?.logoConcepts) ? project.logoConcepts : []
  const out = []
  const seen = new Set()
  for (const item of composition || []) {
    const id = String(item?.contentRefs?.markConcept?.id || '').trim()
    if (!id || seen.has(id)) continue
    const hit = concepts.find((c) => String(c?.id) === id)
    const image = String(hit?.image || '').trim()
    if (!image) continue
    seen.add(id)
    out.push({ id, image })
  }
  return out
}

export function latestSentPresentationVersion(project, documentId) {
  const list = Array.isArray(project?.documentVersions) ? project.documentVersions : []
  const id = String(documentId || '').trim()
  const hits = list.filter(
    (v) =>
      v?.freezeEvent === FREEZE_SENT_FOR_REVIEW &&
      (!id || v.documentId === id)
  )
  return hits.length ? hits[hits.length - 1] : null
}

/**
 * Immutable Presentation Version for a successful send-for-review.
 * identitySnapshotId is required. freezeEvent is always sentForReview.
 */
export function buildPresentationVersionData(
  project,
  { identitySnapshotId } = {}
) {
  const snapshotId = String(identitySnapshotId || '').trim()
  if (!snapshotId) {
    return { ok: false, error: 'identitySnapshotId is required' }
  }
  const doc = documentsOf(project).find(isPresentationDocument)
  if (!isPresentationDocument(doc)) {
    return { ok: false, error: 'No Presentation Document on this project' }
  }
  const builder = presentationBuilderFor(project)
  if (!builder.contents.length) {
    return { ok: false, error: 'Select at least one direction' }
  }
  const version = copyJson({
    documentVersionId: mintDocumentVersionId(),
    documentId: doc.documentId,
    projectId: project.id,
    templateId: DTPL_BUILTIN_PRESENTATION,
    freezeEvent: FREEZE_SENT_FOR_REVIEW,
    createdAt: new Date().toISOString(),
    identitySnapshotId: snapshotId,
    overrides: {},
    contentRefs: {},
    composition: expandPresentationComposition(project),
  })
  return { ok: true, version }
}

/**
 * Immutable Version payload for a successful Send.
 * `identitySnapshotId` is required — the snapshot from that same Send.
 */
export function buildDocumentVersionData(project, { identitySnapshotId, freezeEvent = FREEZE_SENT } = {}) {
  const snapshotId = String(identitySnapshotId || '').trim()
  if (!snapshotId) {
    return { ok: false, error: 'identitySnapshotId is required' }
  }
  if (!isBookDocument(project?.document)) {
    return { ok: false, error: 'No Book Document on this project' }
  }
  const event = freezeEvent || FREEZE_SENT
  if (!DOCUMENT_VERSION_FREEZE_EVENTS.includes(event)) {
    return { ok: false, error: `Unknown freeze event: ${event}` }
  }
  const version = copyJson({
    documentVersionId: mintDocumentVersionId(),
    documentId: project.document.documentId,
    projectId: project.id,
    templateId: project.document.templateId,
    freezeEvent: event,
    createdAt: new Date().toISOString(),
    identitySnapshotId: snapshotId,
    overrides: overridesFromBookBuilder(project),
    contentRefs: contentRefsFromProject(project),
  })
  return { ok: true, version }
}

export function versionHasForbiddenKeys(version) {
  if (!version || typeof version !== 'object') return DOCUMENT_VERSION_FORBIDDEN_KEYS.slice()
  return DOCUMENT_VERSION_FORBIDDEN_KEYS.filter((k) => Object.hasOwn(version, k))
}

export function contentRefKindsOf(version) {
  const refs = version?.contentRefs || {}
  return Object.values(refs)
    .map((r) => r?.kind)
    .filter(Boolean)
}
