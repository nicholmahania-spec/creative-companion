import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useAppStore from '../../store/useAppStore'
import versionService from '../../services/versionService'
import { ARTIFACT_KINDS } from '../artifacts/artifactRef'
import { buildIdentitySnapshot } from '../artifacts/identitySnapshot'
import {
  DTPL_BUILTIN_BOOK,
  DTPL_BUILTIN_PRESENTATION,
  DOCUMENT_VERSION_CONTENT_REF_KINDS,
  DOCUMENT_VERSION_FORBIDDEN_KEYS,
  FREEZE_SENT,
  FREEZE_SENT_FOR_REVIEW,
} from './documentModel'

const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)

function fresh() {
  s().clearToEmpty()
  return s().createNewProject('5 presentation ownership')
}

function addNamedDirection(title, extras = {}) {
  const slot = s().addDirection()
  s().updateDirection(slot, { title, ...extras })
  return cur().directions.find((d) => d.id === slot)
}

function seedDirectionWithIdentity(title, markDataUrl) {
  const dir = addNamedDirection(title)
  s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
  s().updateBrandField('typeHeading', 'Fraunces SemiBold')
  s().updateBrandField('typeBody', 'Inter Regular')
  s().captureDirectionFrom(dir.id, 'palette')
  s().captureDirectionFrom(dir.id, 'typePairing')
  if (markDataUrl) {
    const markId = s().addLogoConcept(markDataUrl)
    s().chooseLogoConcept(markId)
    s().captureDirectionFrom(dir.id, 'mark', markId)
  }
  return cur().directions.find((d) => d.recordId === dir.recordId)
}

function include(dir) {
  return s().addPresentationDirection(dir.recordId)
}

function sendReview() {
  return s().sendPresentationForReview(cur().id)
}

function bookSend() {
  const identity = buildIdentitySnapshot(cur())
  s().recordPublishedIdentity(identity, cur().id)
  const recorded = s().recordSentBookVersion({
    projectId: cur().id,
    identitySnapshotId: identity.snapshotId,
  })
  return { identity, recorded }
}

describe('Presentation Document identity and Book alias', () => {
  beforeEach(fresh)

  it('1 Book Document remains book after Presentation is ensured', () => {
    const book = s().ensureBookDocument(cur().id)
    const pres = s().ensurePresentationDocument(cur().id)
    expect(book.ok).toBe(true)
    expect(pres.ok).toBe(true)
    expect(cur().document.kind).toBe('book')
    expect(cur().document.templateId).toBe(DTPL_BUILTIN_BOOK)
    expect(cur().document.documentId).toBe(book.document.documentId)
  })

  it('2 Presentation has its own documentId', () => {
    const book = s().ensureBookDocument(cur().id)
    const pres = s().ensurePresentationDocument(cur().id)
    expect(pres.document.documentId).not.toBe(book.document.documentId)
    expect(pres.document.documentId).toMatch(/^doc_/)
  })

  it('3 Presentation uses the built-in Presentation template', () => {
    const pres = s().ensurePresentationDocument(cur().id)
    expect(pres.document.templateId).toBe(DTPL_BUILTIN_PRESENTATION)
    expect(pres.document.kind).toBe('presentation')
  })

  it('documents[] holds one Book and one Presentation after both are used', () => {
    s().ensureBookDocument(cur().id)
    s().ensurePresentationDocument(cur().id)
    const kinds = cur().documents.map((d) => d.kind).sort()
    expect(kinds).toEqual(['book', 'presentation'])
    expect(cur().document.kind).toBe('book')
  })

  it('ARTIFACT_KINDS.presentation remains stored:false', () => {
    expect(ARTIFACT_KINDS.presentation.stored).toBe(false)
  })
})

describe('Grammar, order, and ordinary edits', () => {
  beforeEach(fresh)

  it('8 working contents only accept direction recordIds', () => {
    const dir = addNamedDirection('Warm')
    expect(s().addPresentationDirection(dir.recordId).ok).toBe(true)
    expect(s().addPresentationDirection('').ok).toBe(false)
    expect(s().addPresentationDirection('not-a-direction').ok).toBe(false)
    expect(cur().presentationBuilder.contents).toHaveLength(1)
    expect(cur().presentationBuilder.contents[0].kind).toBe('direction')
    expect(cur().presentationBuilder.contents[0].id).toBe(dir.recordId)
  })

  it('7 adding to Presentation does not write Direction source records', () => {
    const dir = addNamedDirection('Warm', { note: 'keep' })
    const before = JSON.parse(JSON.stringify(cur().directions))
    include(dir)
    expect(cur().directions).toEqual(before)
  })

  it('5–6 ordinary Presentation edits do not write Identity or Brief', () => {
    const dir = seedDirectionWithIdentity('Warm', 'data:image/png;base64,MARK')
    const tagline = cur().tagline
    const brief = cur().brief
    const detective = JSON.parse(JSON.stringify(cur().detective))
    include(dir)
    expect(cur().tagline).toBe(tagline)
    expect(cur().brief).toBe(brief)
    expect(cur().detective).toEqual(detective)
  })

  it('9 order is preserved into the frozen composition', () => {
    const a = addNamedDirection('First')
    const b = addNamedDirection('Second')
    include(a)
    include(b)
    const sent = sendReview()
    expect(sent.ok).toBe(true)
    expect(sent.version.composition.map((c) => c.sourceId)).toEqual([
      a.recordId,
      b.recordId,
    ])
    expect(sent.version.composition.map((c) => c.label)).toEqual(['First', 'Second'])
  })

  it('10 ordinary edits do not mint Versions', () => {
    const dir = addNamedDirection('Warm')
    include(dir)
    s().movePresentationItem(cur().presentationBuilder.contents[0].itemId, 0)
    s().removePresentationItem(cur().presentationBuilder.contents[0].itemId)
    expect(cur().documentVersions || []).toEqual([])
    expect(cur().identitySnapshots || []).toEqual([])
  })
})

describe('Send-for-review freeze', () => {
  beforeEach(fresh)

  it('11 successful send creates exactly one Version', () => {
    include(seedDirectionWithIdentity('Warm', 'data:image/png;base64,MARK'))
    const sent = sendReview()
    expect(sent.ok).toBe(true)
    expect(cur().documentVersions).toHaveLength(1)
    expect(sent.version.freezeEvent).toBe(FREEZE_SENT_FOR_REVIEW)
    expect(sent.version.identitySnapshotId).toBe(sent.snapshot.snapshotId)
    expect(sent.snapshot.payload.presentedMarks[0].image).toBe(
      'data:image/png;base64,MARK'
    )
  })

  it('12 empty send creates no Version and no snapshot', () => {
    const r = sendReview()
    expect(r.ok).toBe(false)
    expect(cur().documentVersions || []).toEqual([])
    expect(cur().identitySnapshots || []).toEqual([])
  })

  it('15 missing snapshot id creates no Version', () => {
    include(addNamedDirection('Warm'))
    s().ensurePresentationDocument(cur().id)
    expect(s().recordSentPresentationVersion({ projectId: cur().id }).ok).toBe(false)
    expect(cur().documentVersions || []).toEqual([])
  })

  it('13–14 second send appends; first Version is unchanged', () => {
    include(seedDirectionWithIdentity('Warm', 'data:image/png;base64,MARK'))
    const first = sendReview()
    const snap = JSON.parse(JSON.stringify(cur().documentVersions[0]))
    include(addNamedDirection('Cool'))
    const second = sendReview()
    expect(second.ok).toBe(true)
    expect(cur().documentVersions).toHaveLength(2)
    expect(cur().documentVersions[0]).toEqual(snap)
    expect(cur().documentVersions[1].identitySnapshotId).not.toBe(
      first.snapshot.snapshotId
    )
  })

  it('22–23 Version has no forbidden fields or raw image/PDF bytes', () => {
    include(seedDirectionWithIdentity('Warm', 'data:image/png;base64,MARK'))
    const sent = sendReview()
    const v = sent.version
    for (const key of DOCUMENT_VERSION_FORBIDDEN_KEYS) {
      expect(v).not.toHaveProperty(key)
    }
    const json = JSON.stringify(v)
    expect(json).not.toMatch(/data:image/)
    expect(json).not.toMatch(/%PDF/)
    expect(v.overrides).toEqual({})
    expect(v.composition[0].contentRefs.palette.kind).toBe('palette')
    for (const item of v.composition) {
      for (const ref of Object.values(item.contentRefs || {})) {
        expect(DOCUMENT_VERSION_CONTENT_REF_KINDS).toContain(ref.kind)
      }
    }
  })
})

describe('Frozen Presentation isolation', () => {
  beforeEach(fresh)

  it('24 later Identity edits do not change the frozen Version or snapshot', () => {
    include(seedDirectionWithIdentity('Warm', 'data:image/png;base64,MARK'))
    sendReview()
    const versionBefore = JSON.parse(JSON.stringify(cur().documentVersions[0]))
    const snapBefore = JSON.parse(JSON.stringify(cur().identitySnapshots[0]))
    s().setProjectPalette(['#111111', '#EEEEEE'])
    s().updateBrandField('typeHeading', 'Inter Bold')
    s().updateBrandField('tagline', 'Later')
    expect(cur().documentVersions[0]).toEqual(versionBefore)
    expect(cur().identitySnapshots[0]).toEqual(snapBefore)
  })

  it('25 later Direction edits do not change the frozen composition', () => {
    const dir = seedDirectionWithIdentity('Warm', 'data:image/png;base64,MARK')
    include(dir)
    sendReview()
    const before = JSON.parse(JSON.stringify(cur().documentVersions[0]))
    s().updateDirection(dir.id, { title: 'Renamed', note: 'changed' })
    s().captureDirectionFrom(dir.id, 'palette')
    expect(cur().documentVersions[0]).toEqual(before)
    expect(cur().documentVersions[0].composition[0].label).toBe('Warm')
  })

  it('26 later working reorder/remove does not change the frozen Version', () => {
    const a = addNamedDirection('First')
    const b = addNamedDirection('Second')
    include(a)
    include(b)
    sendReview()
    const before = JSON.parse(JSON.stringify(cur().documentVersions[0]))
    s().movePresentationItem(cur().presentationBuilder.contents[0].itemId, 1)
    s().removePresentationItem(cur().presentationBuilder.contents[0].itemId)
    expect(cur().documentVersions[0]).toEqual(before)
    expect(cur().presentationBuilder.contents).toHaveLength(1)
  })
})

describe('Phase 4A, house-style, and Book Send isolation', () => {
  beforeEach(fresh)

  it('18 restoreVersion leaves documents, presentationBuilder, and Versions', async () => {
    include(seedDirectionWithIdentity('Warm', 'data:image/png;base64,MARK'))
    sendReview()
    const beforeDocs = JSON.parse(JSON.stringify(cur().documents))
    const beforeBuilder = JSON.parse(JSON.stringify(cur().presentationBuilder))
    const beforeVersions = JSON.parse(JSON.stringify(cur().documentVersions))
    const version = await versionService.createVersionSnapshot({ changeType: 'test' })
    s().updateBrandField('tagline', 'Drifted')
    const spy = vi
      .spyOn(versionService, 'getVersionById')
      .mockResolvedValue(version)
    try {
      expect((await versionService.restoreVersion(version.id)).ok).toBe(true)
    } finally {
      spy.mockRestore()
    }
    expect(cur().documents).toEqual(beforeDocs)
    expect(cur().presentationBuilder).toEqual(beforeBuilder)
    expect(cur().documentVersions).toEqual(beforeVersions)
  })

  it('19 applyTemplate leaves Presentation state untouched', async () => {
    include(seedDirectionWithIdentity('Warm', 'data:image/png;base64,MARK'))
    sendReview()
    const beforeBuilder = JSON.parse(JSON.stringify(cur().presentationBuilder))
    const beforeDocs = JSON.parse(JSON.stringify(cur().documents))
    const beforeVersions = JSON.parse(JSON.stringify(cur().documentVersions))
    s().saveAsTemplate('House', '')
    const tpl = s().getTemplates().find((t) => t.name === 'House')
    await s().applyTemplate(tpl.id)
    expect(cur().presentationBuilder).toEqual(beforeBuilder)
    expect(cur().documents).toEqual(beforeDocs)
    expect(cur().documentVersions).toEqual(beforeVersions)
  })

  it('20 Book Send only creates freezeEvent sent Book Versions', () => {
    include(addNamedDirection('Warm'))
    const { recorded } = bookSend()
    expect(recorded.ok).toBe(true)
    expect(cur().documentVersions).toHaveLength(1)
    expect(cur().documentVersions[0].freezeEvent).toBe(FREEZE_SENT)
    expect(cur().documentVersions[0].templateId).toBe(DTPL_BUILTIN_BOOK)
    expect(cur().document.kind).toBe('book')
  })
})

describe('persistence and hydration', () => {
  beforeEach(fresh)

  it('16 export then hydrate keeps Presentation Document, builder, Version', () => {
    s().ensureBookDocument(cur().id)
    include(seedDirectionWithIdentity('Warm', 'data:image/png;base64,MARK'))
    const sent = sendReview()
    const payload = s().exportAllData()
    const projectId = cur().id
    s().clearToEmpty()
    expect(s().hydrateFromPayload(payload).ok).toBe(true)
    const restored = s().projects.find((p) => p.id === projectId)
    expect(restored.document.kind).toBe('book')
    expect(restored.documents.map((d) => d.kind).sort()).toEqual([
      'book',
      'presentation',
    ])
    expect(restored.presentationBuilder.contents).toHaveLength(1)
    expect(restored.documentVersions).toHaveLength(1)
    expect(restored.documentVersions[0].documentVersionId).toBe(
      sent.version.documentVersionId
    )
    expect(restored.documentVersions[0].composition[0].label).toBe('Warm')
    expect(restored.identitySnapshots[0].snapshotId).toBe(sent.snapshot.snapshotId)
  })

  it('17 old projects hydrate without inventing a Presentation', () => {
    const opts = useAppStore.persist.getOptions()
    const out = opts.migrate(
      {
        moodItems: [],
        projects: [
          {
            id: 'old',
            name: 'Legacy',
            directions: [],
            document: {
              documentId: 'doc_book1',
              kind: 'book',
              templateId: DTPL_BUILTIN_BOOK,
            },
          },
        ],
      },
      6
    )
    const p = out.projects[0]
    expect(p.document.documentId).toBe('doc_book1')
    expect(p.documents).toHaveLength(1)
    expect(p.documents[0].kind).toBe('book')
    expect(p.documentVersions).toEqual([])
    expect(p.presentationBuilder).toEqual({ v: 1, contents: [] })
    expect(p.documents.some((d) => d.kind === 'presentation')).toBe(false)
  })
})

describe('isolation greps', () => {
  it('4 Presentation store path does not call applyTemplate', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../store/useAppStore.js', import.meta.url)),
      'utf8'
    )
    const start = src.indexOf('ensurePresentationDocument:')
    const end = src.indexOf('The single writer for named colour rows')
    const slice = src.slice(start, end)
    expect(slice).not.toContain('applyTemplate')
    expect(slice).not.toContain('saveAsTemplate')
  })

  it('21 Presentation Send does not call publishDelivery or recordSentBookVersion', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../store/useAppStore.js', import.meta.url)),
      'utf8'
    )
    const start = src.indexOf('sendPresentationForReview:')
    const end = src.indexOf('The single writer for named colour rows')
    const slice = src.slice(start, end)
    expect(start).toBeGreaterThan(0)
    expect(slice).not.toContain('publishDelivery')
    expect(slice).not.toContain('recordSentBookVersion')
    expect(slice).toContain('recordSentPresentationVersion')
    expect(slice).toContain('recordPublishedIdentity')
  })
})
