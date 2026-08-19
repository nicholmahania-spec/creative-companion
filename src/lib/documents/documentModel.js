/**
 * Phase 4B — Document / Document Template / Document Version.
 *
 * A Document is the mutable Book composition instance for one project.
 * A Document Template is structure only (built-in Book id this slice).
 * A Document Version is an immutable freeze at a named event.
 *
 * Identity stays on the project. Versions reference it; they do not own it.
 */

import { makeRef } from '../artifacts/artifactRef'
import { paletteSnapshot, typePairingSnapshot } from '../artifacts/artifactSnapshot'
import { bookBuilderFor } from '../book/bookBuilder'

export const DTPL_BUILTIN_BOOK = 'dtpl_builtin_book'

export const DOCUMENT_KIND_BOOK = 'book'

export const FREEZE_SENT = 'sent'

/** Representable events. This slice only writes `sent`. */
export const DOCUMENT_VERSION_FREEZE_EVENTS = Object.freeze([
  'sent',
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
  return {
    documentId: mintDocumentId(),
    projectId: project?.id,
    kind: DOCUMENT_KIND_BOOK,
    templateId: DTPL_BUILTIN_BOOK,
    createdAt: now,
    updatedAt: now,
  }
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
