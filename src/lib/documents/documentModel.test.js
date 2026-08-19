import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore from '../../store/useAppStore'
import {
  DTPL_BUILTIN_BOOK,
  DOCUMENT_KIND_BOOK,
  DOCUMENT_VERSION_CONTENT_REF_KINDS,
  DOCUMENT_VERSION_FORBIDDEN_KEYS,
  FREEZE_SENT,
  buildDocumentVersionData,
  contentRefKindsOf,
  ensureBookDocumentData,
  isBookDocument,
  versionHasForbiddenKeys,
} from './documentModel'
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
