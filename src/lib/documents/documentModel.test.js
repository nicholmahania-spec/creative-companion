import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore from '../../store/useAppStore'
import {
  DTPL_BUILTIN_BOOK,
  DTPL_BUILTIN_PRESENTATION,
  DOCUMENT_KIND_BOOK,
  DOCUMENT_KIND_PRESENTATION,
  DOCUMENT_VERSION_CONTENT_REF_KINDS,
  DOCUMENT_VERSION_FORBIDDEN_KEYS,
  FREEZE_SENT,
  FREEZE_SENT_FOR_REVIEW,
  buildDocumentVersionData,
  buildPresentationVersionData,
  contentRefKindsOf,
  ensureBookDocumentData,
  ensurePresentationDocumentData,
  expandPresentationComposition,
  isBookDocument,
  isPresentationDocument,
  versionHasForbiddenKeys,
} from './documentModel'
import { blankPresentationBuilder } from './presentationBuilder'
import { buildIdentitySnapshot } from '../artifacts/identitySnapshot'

const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)

function fresh() {
  s().clearToEmpty()
  s().createNewProject('Document model')
}

describe('Document model', () => {
  beforeEach(fresh)

  it('ensures one Book Document on the project', () => {
    const first = ensureBookDocumentData(cur())
    expect(first.kind).toBe(DOCUMENT_KIND_BOOK)
    expect(first.templateId).toBe(DTPL_BUILTIN_BOOK)
    expect(first.projectId).toBe(cur().id)
    expect(first.documentId).toMatch(/^doc_/)
    const again = ensureBookDocumentData({ ...cur(), document: first })
    expect(again.documentId).toBe(first.documentId)
  })

  it('uses the built-in Book template id', () => {
    expect(DTPL_BUILTIN_BOOK).toBe('dtpl_builtin_book')
    expect(isBookDocument(ensureBookDocumentData(cur()))).toBe(true)
  })
})

describe('Document Version shape', () => {
  beforeEach(fresh)

  it('requires identitySnapshotId and a Book Document', () => {
    expect(buildDocumentVersionData(cur(), {}).ok).toBe(false)
    const identity = buildIdentitySnapshot(cur())
    expect(
      buildDocumentVersionData(cur(), { identitySnapshotId: identity.snapshotId }).ok
    ).toBe(false)
    const withDoc = { ...cur(), document: ensureBookDocumentData(cur()) }
    const built = buildDocumentVersionData(withDoc, {
      identitySnapshotId: identity.snapshotId,
    })
    expect(built.ok).toBe(true)
    expect(built.version.freezeEvent).toBe(FREEZE_SENT)
    expect(built.version.identitySnapshotId).toBe(identity.snapshotId)
    expect(built.version.documentVersionId).toMatch(/^dver_/)
    expect(built.version.documentId).toBe(withDoc.document.documentId)
    expect(built.version.templateId).toBe(DTPL_BUILTIN_BOOK)
    expect(built.version.overrides).toMatchObject({
      pageSize: expect.any(String),
      edgeSpace: expect.any(String),
    })
    expect(built.version).not.toHaveProperty('pageOrder')
    expect(versionHasForbiddenKeys(built.version)).toEqual([])
    for (const kind of contentRefKindsOf(built.version)) {
      expect(DOCUMENT_VERSION_CONTENT_REF_KINDS).toContain(kind)
    }
    for (const key of DOCUMENT_VERSION_FORBIDDEN_KEYS) {
      expect(built.version).not.toHaveProperty(key)
    }
  })
})

describe('Presentation Document model', () => {
  beforeEach(fresh)

  it('ensures one Presentation Document without replacing the Book alias', () => {
    const book = ensureBookDocumentData(cur())
    const project = { ...cur(), document: book }
    const pres = ensurePresentationDocumentData(project)
    expect(pres.kind).toBe(DOCUMENT_KIND_PRESENTATION)
    expect(pres.templateId).toBe(DTPL_BUILTIN_PRESENTATION)
    expect(pres.documentId).toMatch(/^doc_/)
    expect(pres.documentId).not.toBe(book.documentId)
    expect(isPresentationDocument(pres)).toBe(true)
    expect(isBookDocument(book)).toBe(true)
    const again = ensurePresentationDocumentData({
      ...project,
      documents: [book, pres],
    })
    expect(again.documentId).toBe(pres.documentId)
  })

  it('requires a snapshot id, a Presentation Document, and at least one direction', () => {
    expect(buildPresentationVersionData(cur(), {}).ok).toBe(false)
    const identity = buildIdentitySnapshot(cur())
    expect(
      buildPresentationVersionData(cur(), { identitySnapshotId: identity.snapshotId }).ok
    ).toBe(false)
    const pres = ensurePresentationDocumentData(cur())
    const withDoc = {
      ...cur(),
      documents: [pres],
      presentationBuilder: blankPresentationBuilder(),
    }
    expect(
      buildPresentationVersionData(withDoc, { identitySnapshotId: identity.snapshotId }).ok
    ).toBe(false)
  })

  it('expands working Directions into composition refs, not payloads', () => {
    const slot = s().addDirection()
    s().updateDirection(slot, { title: 'Warm route', note: 'secret' })
    const dir = cur().directions.find((d) => d.id === slot)
    const palId = s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    void palId
    s().captureDirectionFrom(slot, 'palette')
    const project = {
      ...cur(),
      presentationBuilder: {
        v: 1,
        contents: [{ itemId: 'pitem_1', kind: 'direction', id: dir.recordId }],
      },
    }
    const composition = expandPresentationComposition(project)
    expect(composition).toHaveLength(1)
    expect(composition[0].sourceId).toBe(dir.recordId)
    expect(composition[0].label).toBe('Warm route')
    expect(composition[0]).not.toHaveProperty('note')
    expect(composition[0]).not.toHaveProperty('evidence')
    expect(composition[0].contentRefs.palette.kind).toBe('palette')
    const built = buildPresentationVersionData(
      { ...project, documents: [ensurePresentationDocumentData(project)] },
      { identitySnapshotId: buildIdentitySnapshot(cur()).snapshotId }
    )
    expect(built.ok).toBe(true)
    expect(built.version.freezeEvent).toBe(FREEZE_SENT_FOR_REVIEW)
    expect(built.version.templateId).toBe(DTPL_BUILTIN_PRESENTATION)
    expect(built.version.overrides).toEqual({})
    expect(built.version.contentRefs).toEqual({})
    expect(built.version.composition[0].label).toBe('Warm route')
    for (const key of DOCUMENT_VERSION_FORBIDDEN_KEYS) {
      expect(built.version).not.toHaveProperty(key)
    }
    for (const kind of contentRefKindsOf(built.version.composition[0])) {
      expect(DOCUMENT_VERSION_CONTENT_REF_KINDS).toContain(kind)
    }
  })
})
