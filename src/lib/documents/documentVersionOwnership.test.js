import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useAppStore from '../../store/useAppStore'
import versionService from '../../services/versionService'
import {
  DTPL_BUILTIN_BOOK,
  DOCUMENT_VERSION_CONTENT_REF_KINDS,
  DOCUMENT_VERSION_FORBIDDEN_KEYS,
  FREEZE_SENT,
} from './documentModel'
import { buildIdentitySnapshot } from '../artifacts/identitySnapshot'

const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)

function fresh() {
  s().clearToEmpty()
  return s().createNewProject('4B ownership')
}

function sendOnce() {
  const identity = buildIdentitySnapshot(cur())
  s().recordPublishedIdentity(identity, cur().id)
  const recorded = s().recordSentBookVersion({
    projectId: cur().id,
    identitySnapshotId: identity.snapshotId,
  })
  return { identity, recorded }
}

describe('Document ensure and built-in template', () => {
  beforeEach(fresh)

  it('creates one Book Document per project', () => {
    const a = s().ensureBookDocument(cur().id)
    const b = s().ensureBookDocument(cur().id)
    expect(a.ok).toBe(true)
    expect(b.document.documentId).toBe(a.document.documentId)
    expect(cur().document.kind).toBe('book')
    expect(cur().document.templateId).toBe(DTPL_BUILTIN_BOOK)
  })
})

describe('Document Version immutability and Send freeze', () => {
  beforeEach(fresh)

  it('records the required shape at freezeEvent sent', () => {
    const { identity, recorded } = sendOnce()
    expect(recorded.ok).toBe(true)
    const v = recorded.version
    expect(v.freezeEvent).toBe(FREEZE_SENT)
    expect(v.identitySnapshotId).toBe(identity.snapshotId)
    expect(v.documentVersionId).toMatch(/^dver_/)
    expect(v.documentId).toBe(cur().document.documentId)
    expect(v.templateId).toBe(DTPL_BUILTIN_BOOK)
    expect(v.overrides).toEqual(
      expect.objectContaining({
        pageSize: expect.any(String),
        edgeSpace: expect.any(String),
        printShop: expect.any(Boolean),
        type: expect.any(Object),
        typeColor: expect.any(Object),
        pageBg: expect.any(Object),
        running: expect.any(Object),
      })
    )
    expect(v.overrides).not.toHaveProperty('pageOrder')
    expect(v.overrides).not.toHaveProperty('grid')
    for (const key of DOCUMENT_VERSION_FORBIDDEN_KEYS) {
      expect(v).not.toHaveProperty(key)
    }
    for (const ref of Object.values(v.contentRefs || {})) {
      expect(DOCUMENT_VERSION_CONTENT_REF_KINDS).toContain(ref.kind)
      expect(ref.id).toBeTruthy()
    }
  })

  it('requires identitySnapshotId', () => {
    expect(s().recordSentBookVersion({ projectId: cur().id }).ok).toBe(false)
    expect(cur().documentVersions || []).toEqual([])
  })

  it('deep-copies so later Book and Identity edits do not mutate the Version', () => {
    s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    const { recorded } = sendOnce()
    const frozen = JSON.parse(JSON.stringify(recorded.version))

    s().setBookBuilder({ pageSize: 'a4', edgeSpace: 'tight' })
    s().updateBrandField('typeHeading', 'Inter Bold')
    s().setProjectPalette(['#111111', '#EEEEEE'])

    const stored = cur().documentVersions[0]
    expect(stored.overrides.pageSize).toBe(frozen.overrides.pageSize)
    expect(stored.contentRefs).toEqual(frozen.contentRefs)
    expect(stored.identitySnapshotId).toBe(frozen.identitySnapshotId)
  })

  it('does not create a Version when publish never succeeds', () => {
    const identity = buildIdentitySnapshot(cur())
    expect(cur().documentVersions).toEqual([])
    expect(identity.snapshotId).toBeTruthy()
    expect(cur().documentVersions).toEqual([])
  })

  it('a successful Send records exactly one Version', () => {
    sendOnce()
    expect(cur().documentVersions).toHaveLength(1)
  })

  it('a second Send appends; the first Version is unchanged', () => {
    const first = sendOnce()
    const snap = JSON.parse(JSON.stringify(cur().documentVersions[0]))
    s().updateBrandField('tagline', 'Later')
    const second = sendOnce()
    expect(second.recorded.ok).toBe(true)
    expect(cur().documentVersions).toHaveLength(2)
    expect(cur().documentVersions[0]).toEqual(snap)
    expect(cur().documentVersions[1].identitySnapshotId).toBe(
      second.identity.snapshotId
    )
    expect(cur().documentVersions[1].identitySnapshotId).not.toBe(
      first.identity.snapshotId
    )
  })

  it('unpublish does not delete Versions', async () => {
    sendOnce()
    const before = JSON.parse(JSON.stringify(cur().documentVersions))
    const { unpublishDelivery } = await import('../../lib/client/brandDelivery')
    await unpublishDelivery('portal-unused')
    expect(cur().documentVersions).toEqual(before)
  })
})

describe('Phase 4A and house-style cannot mutate Document Versions', () => {
  beforeEach(fresh)

  it('restoreVersion leaves documentVersions untouched', async () => {
    s().updateBrandField('tagline', 'Saved')
    sendOnce()
    const before = JSON.parse(JSON.stringify(cur().documentVersions))
    const version = await versionService.createVersionSnapshot({
      changeType: 'test',
    })
    s().updateBrandField('tagline', 'Drifted')
    const spy = vi
      .spyOn(versionService, 'getVersionById')
      .mockResolvedValue(version)
    try {
      expect((await versionService.restoreVersion(version.id)).ok).toBe(true)
    } finally {
      spy.mockRestore()
    }
    expect(cur().documentVersions).toEqual(before)
    expect(cur().tagline).toBe('Saved')
  })

  it('applyTemplate leaves documentVersions untouched', async () => {
    sendOnce()
    const before = JSON.parse(JSON.stringify(cur().documentVersions))
    s().saveAsTemplate('House', '')
    const tpl = s().getTemplates().find((t) => t.name === 'House')
    await s().applyTemplate(tpl.id)
    expect(cur().documentVersions).toEqual(before)
  })
})

describe('persistence round-trip', () => {
  beforeEach(fresh)

  it('export then hydrate keeps Document and Versions', () => {
    s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    const { identity, recorded } = sendOnce()
    expect(recorded.ok).toBe(true)
    const payload = s().exportAllData()
    const projectId = cur().id
    const expected = JSON.parse(
      JSON.stringify(
        payload.projects.find((p) => p.id === projectId).documentVersions[0]
      )
    )

    s().clearToEmpty()
    const r = s().hydrateFromPayload(payload)
    expect(r.ok).toBe(true)
    const restored = s().projects.find((p) => p.id === projectId)
    expect(restored.document.documentId).toBe(expected.documentId)
    expect(restored.document.templateId).toBe(DTPL_BUILTIN_BOOK)
    expect(restored.documentVersions).toHaveLength(1)
    const v = restored.documentVersions[0]
    expect(v.documentVersionId).toBe(expected.documentVersionId)
    expect(v.documentId).toBe(expected.documentId)
    expect(v.templateId).toBe(expected.templateId)
    expect(v.freezeEvent).toBe(FREEZE_SENT)
    expect(v.identitySnapshotId).toBe(identity.snapshotId)
    expect(v.overrides).toEqual(expected.overrides)
    expect(v.contentRefs).toEqual(expected.contentRefs)
  })
})

describe('Send wiring in DeliverToClient', () => {
  /**
   * THIS TEST USED TO ASSERT THE OPPOSITE, AND THE REVERSAL IS THE POINT.
   *
   * Through Phase 4B it read "records a Version only after a successful
   * publish" — publish first, then mint the Version. That was the honest
   * description of the code at the time, and it was the defect Phase 8 exists
   * to correct: the client's copy was built from live project state, the
   * Version was a second independent freeze that nothing read, and when the
   * Version failed to persist the delivery stood anyway.
   *
   * Phase 8 inverts it: freeze, verify the freeze, resolve that exact Version,
   * and only then publish what the Version says. So the ordering assertion is
   * inverted here rather than deleted — the ordering was always the thing worth
   * pinning, and leaving the old direction in place would pin the defect.
   */
  it('freezes and verifies a Version BEFORE it publishes anything', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../features/client-portal/DeliverToClient.jsx', import.meta.url)),
      'utf8'
    )
    const send = src.slice(src.indexOf('const send = async'), src.indexOf('const takeBack'))
    const recordIdentity = send.indexOf('recordPublishedIdentity')
    const recordVersion = send.indexOf('recordSentBookVersion')
    const verify = send.indexOf('if (!recorded?.ok)')
    const resolve = send.indexOf('deliverySourceFor')
    const publish = send.indexOf('await publishDelivery')
    const failReturn = send.indexOf('if (!r.ok)')

    expect(recordIdentity).toBeGreaterThan(0)
    expect(recordVersion, 'the Version is not frozen in Send').toBeGreaterThan(recordIdentity)
    expect(verify, 'the freeze result is not checked').toBeGreaterThan(recordVersion)
    expect(resolve, 'Delivery does not resolve the frozen Version').toBeGreaterThan(verify)
    expect(publish, 'publish runs before the freeze it is supposed to send').toBeGreaterThan(
      resolve
    )
    expect(failReturn).toBeGreaterThan(publish)
    expect(send).toContain('identitySnapshotId: identity.snapshotId')

    /* The publish is fed the RESOLVED Version, never the live props. */
    expect(send, 'the live pack still reaches the client').toMatch(/pack: from\.pack/)
    expect(send, 'the live book setup still reaches the client').toMatch(/book: from\.book/)

    /* Undo still closes the link again, and still comes last. */
    expect(send.indexOf('unpublishDelivery(portalId)')).toBeGreaterThan(publish)
  })

  /* A freeze failure is a refused send, not a logged one. */
  it('does not swallow a Version persistence failure', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../features/client-portal/DeliverToClient.jsx', import.meta.url)),
      'utf8'
    )
    const send = src.slice(src.indexOf('const send = async'), src.indexOf('const takeBack'))
    const verify = send.slice(send.indexOf('if (!recorded?.ok)'))
    expect(verify.slice(0, 240)).toMatch(/setError/)
    expect(verify.slice(0, 240)).toMatch(/return/)
    /* The old shape: console.error and carry on. */
    expect(
      send.slice(0, send.indexOf('await publishDelivery')),
      'a freeze failure is only logged'
    ).not.toMatch(/console\.error\([^)]*document version/i)
  })
})
