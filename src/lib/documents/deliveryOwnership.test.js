import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import useAppStore from '../../store/useAppStore'
import { readDeliveryEnvelope } from '../client/brandDelivery'
import { deliverySourceFor } from './documentModel'

/**
 * PHASE 8 — A DELIVERY IS A NAMED, FROZEN THING, OR IT DOES NOT HAPPEN.
 *
 * What this replaces. Delivery used to build the client's copy from
 * `buildCurrentBrandPack()` — the live project — and mint a Document Version
 * afterwards, from live state again, inside a `try` whose handler was
 * `console.error`. Three consequences, all of them shipped: the client's book
 * was whatever the project happened to contain at that instant and nothing
 * could afterwards say which book it was; the Version was a second independent
 * freeze that nothing ever read; and a Version that failed to persist left the
 * delivery standing anyway, claiming to be a frozen thing that did not exist.
 *
 * So most of the tests below are one test written several ways: change the
 * project after a send, and prove the delivery does not move. The rest pin the
 * ordering, because the ordering is what makes the first part true.
 *
 * NO APPROVAL ANYWHERE IN THIS FILE, deliberately. D1=C and D2=E: Delivery
 * records what was delivered, it does not adjudicate it. A test asserting an
 * approval gate would be asserting a feature this phase was told not to build.
 */

const ROOT = new URL('../../..', import.meta.url).pathname
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const codeOnly = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const SNAP_ID = 'idsnap_delivery'
const VER_ID = 'dver_delivery'

const SNAPSHOT = {
  v: 1,
  kind: 'identitySnapshot',
  snapshotId: SNAP_ID,
  payload: {
    mark: { id: 'mk1', image: 'FROZEN-MARK' },
    palette: { hexes: ['#101010', '#202020'], roles: { primary: '#101010' } },
    type: { heading: 'Frozen Head', body: 'Frozen Body', why: 'Frozen why' },
    wordmark: 'FrozenMark',
    logoDirection: 'frozen direction',
  },
}

/** A project holding one frozen Book Version and the snapshot it froze. */
const SENT = (over = {}) => ({
  id: 'p1',
  name: 'Delivery Co',
  positioning: 'LIVE POSITIONING',
  tagline: 'LIVE TAGLINE',
  detective: { audience: 'LIVE AUDIENCE' },
  palette: ['#ff0000'],
  typeHeading: 'Live Head',
  typeBody: 'Live Body',
  logoConcepts: [{ id: 'mk1', chosen: true, image: 'LIVE-MARK' }],
  directions: [{ recordId: 'dir_a', title: 'LIVE DIRECTION' }],
  bookBuilder: { pageSize: 'letter' },
  document: {
    documentId: 'doc_1',
    kind: 'book',
    templateId: 'dtpl_builtin_book',
    overrides: { pageSize: 'letter' },
    composition: [{ itemId: 'bpage_live', pageId: 'colour', locked: false }],
  },
  identitySnapshots: [SNAPSHOT],
  documentVersions: [
    {
      documentVersionId: VER_ID,
      documentId: 'doc_1',
      projectId: 'p1',
      templateId: 'dtpl_builtin_book',
      freezeEvent: 'sent',
      createdAt: '2026-08-20T00:00:00.000Z',
      identitySnapshotId: SNAP_ID,
      overrides: { pageSize: 'a4', edgeSpace: 'tight', printShop: true },
      contentRefs: {},
      composition: [{ itemId: 'bpage_cover', pageId: 'cover', locked: false }],
      content: { positioning: 'FROZEN POSITIONING', tagline: 'FROZEN TAGLINE' },
    },
  ],
  ...over,
})

describe('a Delivery names exactly one Version', () => {
  // T1
  it('requires an exact immutable Version id', () => {
    const p = SENT()
    expect(deliverySourceFor(p, VER_ID).ok).toBe(true)
    expect(deliverySourceFor(p, '').ok).toBe(false)
    expect(deliverySourceFor(p, null).ok).toBe(false)
  })

  // T4
  it('delivers the Version it was given, not another one', () => {
    const p = SENT()
    p.documentVersions = [
      ...p.documentVersions,
      { ...p.documentVersions[0], documentVersionId: 'dver_other', overrides: { pageSize: 'letter' } },
    ]
    const r = deliverySourceFor(p, VER_ID)
    expect(r.source.documentVersionId).toBe(VER_ID)
    expect(r.book.pageSize).toBe('a4')
  })

  // T3
  it('has no way to ask for "the latest"', () => {
    const model = codeOnly(read('src/lib/documents/documentModel.js'))
    const fn = model.slice(
      model.indexOf('export function deliverySourceFor'),
      model.indexOf('function joinWords')
    )
    expect(fn, 'deliverySourceFor reaches for the end of the list').not.toMatch(
      /length\s*-\s*1|\.at\(-1\)|\.pop\(\)|slice\(-1\)/
    )
    /* And the caller names the id it just minted rather than a lookup. */
    const send = codeOnly(read('src/features/client-portal/DeliverToClient.jsx'))
    expect(send).toMatch(/deliverySourceFor\([\s\S]{0,160}recorded\.version\.documentVersionId/)
  })

  // T15
  it('refuses a Version it does not hold, by name', () => {
    const r = deliverySourceFor(SENT(), 'dver_nope')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/no such version/i)
  })

  it('refuses a Presentation Version rather than delivering the wrong document', () => {
    const p = SENT()
    p.documentVersions = [{ ...p.documentVersions[0], templateId: 'dtpl_builtin_presentation' }]
    const r = deliverySourceFor(p, VER_ID)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/not a Book Version/i)
  })

  // T2 / M9
  it('never falls back to the live project when there is no Version', () => {
    const r = deliverySourceFor(SENT({ documentVersions: [] }), VER_ID)
    expect(r.ok).toBe(false)
    expect(JSON.stringify(r)).not.toMatch(/LIVE/)
  })
})

describe('what the Version says is what the client gets', () => {
  // T6
  it('uses the Identity Snapshot that Version froze', () => {
    const r = deliverySourceFor(SENT(), VER_ID)
    expect(r.source.identitySnapshotId).toBe(SNAP_ID)
    expect(r.pack.logoImage).toBe('FROZEN-MARK')
    expect(r.pack.palette).toEqual(['#101010', '#202020'])
    expect(r.pack.typeHeading).toBe('Frozen Head')
  })

  it('takes the older snapshot when a newer one exists', () => {
    const p = SENT()
    p.identitySnapshots = [
      SNAPSHOT,
      {
        ...SNAPSHOT,
        snapshotId: 'idsnap_newer',
        payload: { ...SNAPSHOT.payload, mark: { id: 'mk1', image: 'NEWER-MARK' } },
      },
    ]
    expect(deliverySourceFor(p, VER_ID).pack.logoImage).toBe('FROZEN-MARK')
  })

  // T7 / T8 / T9 — one claim, three ways
  it('does not move when live Identity, Book and Directions are all rewritten', () => {
    const p = SENT()
    const before = JSON.stringify(deliverySourceFor(p, VER_ID))

    p.palette = ['#00ff00']
    p.typeHeading = 'Rewritten'
    p.typeBody = 'Rewritten'
    p.logoConcepts = [{ id: 'mk1', chosen: true, image: 'REWRITTEN-MARK' }]
    p.directions = [{ recordId: 'dir_a', title: 'REWRITTEN DIRECTION' }]
    p.bookBuilder = { pageSize: 'a3' }
    p.document.overrides = { pageSize: 'a3' }
    p.document.composition = [{ itemId: 'bpage_x', pageId: 'type', locked: true }]
    p.detective = { audience: 'REWRITTEN' }
    p.positioning = 'REWRITTEN'

    const after = JSON.stringify(deliverySourceFor(p, VER_ID))
    expect(after).toBe(before)
    expect(after).not.toMatch(/REWRITTEN|LIVE/)
  })

  // T5
  it('does not move when a newer Version is created afterwards', () => {
    const p = SENT()
    const before = JSON.stringify(deliverySourceFor(p, VER_ID))
    p.documentVersions = [
      ...p.documentVersions,
      {
        ...p.documentVersions[0],
        documentVersionId: 'dver_newer',
        createdAt: '2026-09-01T00:00:00.000Z',
        overrides: { pageSize: 'a3' },
        content: { positioning: 'NEWER' },
      },
    ]
    expect(JSON.stringify(deliverySourceFor(p, VER_ID))).toBe(before)
  })

  // T21
  it('gives the same delivery for the same Version every time', () => {
    const p = SENT()
    expect(JSON.stringify(deliverySourceFor(p, VER_ID))).toBe(
      JSON.stringify(deliverySourceFor(p, VER_ID))
    )
  })
})

describe('a Version that cannot answer for itself is refused', () => {
  /* Stricter than the renderer on purpose: `bookVersionRenderInputs` reports
     missing refs and draws the rest, which is right for looking at history.
     Sending a client a book with no mark is worse than not sending it. */
  it('refuses when the Version’s snapshot has gone', () => {
    const r = deliverySourceFor(SENT({ identitySnapshots: [] }), VER_ID)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/missing the mark, the colors and the type/i)
  })

  it('refuses when only one reference is unresolvable', () => {
    const p = SENT()
    p.identitySnapshots = [{ ...SNAPSHOT, payload: { ...SNAPSHOT.payload, mark: null } }]
    const r = deliverySourceFor(p, VER_ID)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/missing the mark/i)
    expect(r.error).not.toMatch(/colors|type/i)
  })

  it('refuses a Version that records no identity at all', () => {
    const p = SENT()
    p.documentVersions = [{ ...p.documentVersions[0], identitySnapshotId: '' }]
    const r = deliverySourceFor(p, VER_ID)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/no identity recorded/i)
  })
})

describe('what travels to the client', () => {
  // T17 / T18 / M13
  it('carries ids and nothing else', () => {
    const r = deliverySourceFor(SENT(), VER_ID)
    expect(Object.keys(r.source).sort()).toEqual(['documentVersionId', 'identitySnapshotId'])
    const json = JSON.stringify(r.source)
    for (const leak of [
      'composition',
      'contentRefs',
      'palette',
      'typeHeading',
      'logoImage',
      'directions',
      'project_local_id',
      'projectId',
      'p1',
    ]) {
      expect(json, `${leak} reached the client source metadata`).not.toContain(leak)
    }
  })

  it('projects the envelope key by key rather than spreading whatever it is given', () => {
    const pub = codeOnly(read('src/lib/client/brandDelivery.js'))
    const block = pub.slice(pub.indexOf('if (source && typeof source'), pub.indexOf('const { data, error }'))
    expect(block, 'source is spread into the envelope').not.toMatch(/\.\.\.source/)
    expect(block).toMatch(/documentVersionId/)
    expect(block).toMatch(/identitySnapshotId/)
  })

  // T18 — the studio's own key never travels
  it('keeps project_local_id as a write scope and never in the payload', () => {
    const pub = read('src/lib/client/brandDelivery.js')
    /* Comments stripped first: the block deliberately EXPLAINS that
       `project_local_id` never travels, and a prose mention of the field is
       not the field being written. */
    const code = codeOnly(pub)
    const envelope = code.slice(code.indexOf('const envelope = {'), code.indexOf('const { data, error }'))
    expect(envelope, 'the studio row key reached the client envelope').not.toMatch(
      /project_local_id|projectLocalId/
    )
    expect(pub, 'the write is no longer scoped to the project').toMatch(
      /\.eq\('project_local_id'/
    )
  })

  // T16
  it('sends only the published projection — Versions never leave the studio', () => {
    const pub = codeOnly(read('src/lib/client/brandDelivery.js'))
    expect(pub, 'the Version list reached the delivery module').not.toMatch(/documentVersions/)
  })
})

describe('legacy deliveries are read, never rebuilt', () => {
  // T12
  it('still reads a v:1 envelope', () => {
    const out = readDeliveryEnvelope({ v: 1, pack: { projectName: 'Old' }, book: { pageSize: 'letter' } })
    expect(out.pack.projectName).toBe('Old')
    expect(out.book.pageSize).toBe('letter')
    expect(out.source, 'a Version id was invented for an old delivery').toBeUndefined()
  })

  it('still reads the bare pack that predates envelopes', () => {
    const out = readDeliveryEnvelope({ projectName: 'Ancient' })
    expect(out.pack.projectName).toBe('Ancient')
    expect(out.source).toBeUndefined()
  })

  it('reads source back off a v:2 envelope', () => {
    const out = readDeliveryEnvelope({
      v: 2,
      pack: { projectName: 'New' },
      source: { documentVersionId: VER_ID, identitySnapshotId: SNAP_ID },
    })
    expect(out.source).toEqual({ documentVersionId: VER_ID, identitySnapshotId: SNAP_ID })
  })

  // M10 — nothing may look up the "matching" Version for an old delivery
  it('has no code path that resolves a legacy delivery against the live project', () => {
    const del = codeOnly(read('src/lib/client/brandDelivery.js'))
    expect(del).not.toMatch(/deliverySourceFor|bookVersionRenderInputs|currentBrandPack/)
  })
})

describe('one writer, one reader', () => {
  // T10 / M8
  it('delivery_pack is written in exactly one place', () => {
    const sources = [
      'src/lib/client/brandDelivery.js',
      'src/features/client-portal/DeliverToClient.jsx',
      'src/features/client-portal/PublicBrandReveal.jsx',
      'src/views/DeliverView.jsx',
      'src/store/useAppStore.js',
    ]
    const writes = []
    for (const rel of sources) {
      const src = codeOnly(read(rel))
      for (const m of src.matchAll(/delivery_pack\s*:/g)) writes.push(`${rel}@${m.index}`)
    }
    expect(writes, `delivery_pack is written in ${writes.length} places`).toHaveLength(1)
    expect(writes[0]).toContain('brandDelivery.js')
  })

  // T11 / M7
  it('the client route reads the stored delivery and nothing else', () => {
    const reveal = codeOnly(read('src/features/client-portal/PublicBrandReveal.jsx'))
    expect(reveal).toMatch(/fetchBrandDelivery/)
    for (const live of ['useAppStore', 'currentBrandPack', 'buildIdentitySnapshot', 'bookBuilderFor']) {
      expect(reveal, `/d/ reads ${live}`).not.toMatch(new RegExp(live))
    }
  })

  // T13
  it('re-delivery does not rewrite what the client already did', () => {
    const del = codeOnly(read('src/lib/client/brandDelivery.js'))
    const publish = del.slice(del.indexOf('export async function publishDelivery'), del.indexOf('export async function unpublishDelivery'))
    for (const field of ['delivery_viewed_at', 'delivery_reaction']) {
      expect(publish, `publishDelivery rewrites ${field}`).not.toMatch(
        new RegExp(`${field}\\s*:`)
      )
    }
  })
})

describe('the Delivery history is a record, not a source', () => {
  beforeEach(() => {
    useAppStore.getState().clearToEmpty()
    useAppStore.getState().createNewProject('Phase 8 history')
  })

  const state = () => useAppStore.getState()
  const project = () => state().projects.find((p) => p.id === state().currentProjectId)

  const deliver = (versionId) =>
    state().recordDelivery({
      projectId: project().id,
      portalId: 'portal_1',
      documentVersionId: versionId,
      identitySnapshotId: SNAP_ID,
    })

  // T22 / M12
  it('appends and never rewrites', () => {
    const a = deliver('dver_a')
    const b = deliver('dver_b')
    expect(a.ok && b.ok).toBe(true)
    const rows = project().deliveryHistory
    expect(rows).toHaveLength(2)
    expect(rows[0].documentVersionId).toBe('dver_a')
    expect(rows[1].documentVersionId).toBe('dver_b')
    /* The first row means what it meant when it was written. */
    expect(rows[0]).toEqual(a.entry)
  })

  it('records ids, never the book', () => {
    deliver('dver_a')
    const row = project().deliveryHistory[0]
    expect(Object.keys(row).sort()).toEqual([
      'deliveredAt',
      'deliveryId',
      'documentVersionId',
      'identitySnapshotId',
      'portalId',
      'v',
    ])
  })

  it('refuses a history row that names no Version', () => {
    expect(state().recordDelivery({ projectId: project().id }).ok).toBe(false)
  })

  // T20 / T19 — retention must not reach this list or the Versions it names
  it('is not pruned, and no Project Version cap applies to it', () => {
    for (let i = 0; i < 30; i += 1) deliver(`dver_${i}`)
    expect(project().deliveryHistory).toHaveLength(30)
    expect(project().deliveryHistory[0].documentVersionId).toBe('dver_0')

    const store = codeOnly(read('src/store/useAppStore.js'))
    const action = store.slice(
      store.indexOf('recordDelivery:'),
      store.indexOf('ensurePresentationDocument:')
    )
    /* Targeted at the LIST, not at any slice: the row id is minted with
       `Math.random().toString(36).slice(2, 10)`, which is not retention. */
    expect(action, 'the history list is pruned').not.toMatch(
      /deliveryHistory[\s\S]{0,80}?\.slice\(|maxVersions|deliveryHistory[\s\S]{0,60}?\.shift\(/
    )
  })

  // M12 — history is never a delivery input
  it('is never read as a Delivery source', () => {
    for (const rel of [
      'src/lib/client/brandDelivery.js',
      'src/lib/documents/documentModel.js',
    ]) {
      expect(codeOnly(read(rel)), `${rel} reads deliveryHistory`).not.toMatch(/deliveryHistory/)
    }
  })
})

describe('no approval gate was invented', () => {
  it('Delivery reads no review round, response or step status', () => {
    for (const rel of [
      'src/lib/documents/documentModel.js',
      'src/lib/client/brandDelivery.js',
    ]) {
      const src = codeOnly(read(rel))
      for (const word of ['step_status', 'review_rounds', 'review_responses', 'approvalStaleness']) {
        expect(src, `${rel} gates Delivery on ${word}`).not.toMatch(new RegExp(word))
      }
    }
    const fn = codeOnly(read('src/lib/documents/documentModel.js'))
    const block = fn.slice(fn.indexOf('export function deliverySourceFor'), fn.indexOf('function joinWords'))
    expect(block).not.toMatch(/approv/i)
  })
})
