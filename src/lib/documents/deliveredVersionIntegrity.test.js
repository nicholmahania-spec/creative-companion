/**
 * The client package is the APPROVED book, not today's project.
 *
 * WHAT THE AUDIT FOUND. Delivery is version-bound by contract (PRD §4.6:
 * freeze a Version, resolve *that* Version by id, build the client's copy from
 * it). The published portal copy did that. The DOWNLOAD did not: `runExport`
 * built every kind from `buildCurrentBrandPack()`, so the brand guide PDF and
 * the client package ZIP tracked live state. A reverse trace over a real
 * downloaded package found no `dver_`, no `idsnap_`, no version id and no date
 * in any of its nine files — the package could not be tied to anything.
 *
 * The failure this creates is quiet and expensive: a designer sends a book, the
 * client approves it, the designer keeps working, and the next download the
 * client is sent is a different book with the same name. Nothing in the app
 * says so.
 *
 * THE DECISIVE TEST, and the shape the audit asked for:
 *
 *     Version A  →  change everything live  →  Version B  →  deliver A
 *     the delivered pack must still be A.
 *
 * Sentinels are used rather than "is it frozen": every identity value differs
 * between A and B, so a live leak cannot hide behind a value that happens to
 * match.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ensureBookDocumentData,
  buildDocumentVersionData,
  latestBookVersionInputs,
  bookVersionRenderInputs,
  deliveryPackFor,
  DTPL_BUILTIN_BOOK,
} from './documentModel'

/** A frozen Identity Snapshot in the shape `recordSentBookVersion` stores. */
const snapshotOf = (id, identity) => ({
  v: 1,
  kind: 'identity',
  snapshotId: id,
  publishedAt: '2026-01-01T00:00:00.000Z',
  refs: [],
  payload: identity,
})

const IDENTITY_A = {
  mark: { id: 'm_a', image: 'data:image/png;base64,AAAA_MARK_A' },
  palette: {
    hexes: ['#A11111', '#111111', '#FFFFFF'],
    roles: { cover: '#A11111', text: '#111111', quiet: '#FFFFFF' },
  },
  type: { heading: 'Version A Serif', body: 'Version A Sans', why: 'because A' },
  wordmark: 'WORDMARK A',
  logoDirection: '',
  presentedMarks: [],
}

const IDENTITY_B = {
  mark: { id: 'm_b', image: 'data:image/png;base64,BBBB_MARK_B' },
  palette: {
    hexes: ['#22B222', '#222222', '#EEEEEE'],
    roles: { cover: '#22B222', text: '#222222', quiet: '#EEEEEE' },
  },
  type: { heading: 'Version B Serif', body: 'Version B Sans', why: 'because B' },
  wordmark: 'WORDMARK B',
  logoDirection: '',
  presentedMarks: [],
}

/** A project with an opened Book, at some identity. */
function projectAt(identity, extra = {}) {
  const base = {
    id: 'p1',
    name: 'Integrity',
    palette: identity.palette.hexes,
    colorRoles: identity.palette.roles,
    typeHeading: identity.type.heading,
    typeBody: identity.type.body,
    typeWhy: identity.type.why,
    logoImage: identity.mark.image,
    logoWordmark: identity.wordmark,
    bookBuilder: { print: { pageSize: 'a4' } },
    documentVersions: [],
    identitySnapshots: [],
    ...extra,
  }
  return { ...base, document: ensureBookDocumentData(base) }
}

/** Freeze a Version the way `recordSentBookVersion` does. */
function freeze(project, identity, snapshotId, pins = null) {
  const built = buildDocumentVersionData(project, {
    identitySnapshotId: snapshotId,
    freezeEvent: 'sent',
    content: { projectName: project.name },
    pins,
  })
  if (!built.ok) throw new Error(built.error)
  return {
    ...project,
    documentVersions: [...project.documentVersions, built.version],
    identitySnapshots: [
      ...project.identitySnapshots,
      snapshotOf(snapshotId, identity),
    ],
  }
}

describe('Version A → live edits → Version B', () => {
  /* Build the whole history once; every assertion reads the same timeline. */
  let afterA
  let afterB

  const setup = () => {
    if (afterB) return
    afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A')

    /* The designer keeps working. EVERY identity value changes. */
    const live = {
      ...afterA,
      palette: IDENTITY_B.palette.hexes,
      colorRoles: IDENTITY_B.palette.roles,
      typeHeading: IDENTITY_B.type.heading,
      typeBody: IDENTITY_B.type.body,
      typeWhy: IDENTITY_B.type.why,
      logoImage: IDENTITY_B.mark.image,
      logoWordmark: IDENTITY_B.wordmark,
    }
    afterB = freeze(live, IDENTITY_B, 'idsnap_B')
  }

  it('keeps two distinct Versions, append-only', () => {
    setup()
    expect(afterA.documentVersions).toHaveLength(1)
    expect(afterB.documentVersions).toHaveLength(2)
    expect(afterB.documentVersions[0]).toEqual(afterA.documentVersions[0])
    const [a, b] = afterB.documentVersions
    expect(a.documentVersionId).not.toBe(b.documentVersionId)
    expect(a.identitySnapshotId).toBe('idsnap_A')
    expect(b.identitySnapshotId).toBe('idsnap_B')
  })

  it('DELIVERING A AFTER B EXISTS STILL DELIVERS A', () => {
    setup()
    const aId = afterB.documentVersions[0].documentVersionId
    const out = bookVersionRenderInputs(afterB, aId)
    expect(out.ok).toBe(true)

    /* Every sentinel is A's, with B sitting in the live project and in a
       later Version. A single live read would show up as a B value here. */
    expect(out.pack.logoWordmark).toBe('WORDMARK A')
    expect(out.pack.typeHeading).toBe('Version A Serif')
    expect(out.pack.typeBody).toBe('Version A Sans')
    expect(out.pack.typeWhy).toBe('because A')
    expect(out.pack.logoImage).toBe(IDENTITY_A.mark.image)
    expect(out.pack.palette).toEqual(IDENTITY_A.palette.hexes)
    expect(out.pack.colorRoles).toEqual(IDENTITY_A.palette.roles)

    /* And nothing of B leaked in. */
    const asText = JSON.stringify(out.pack)
    expect(asText).not.toContain('WORDMARK B')
    expect(asText).not.toContain('Version B Serif')
    expect(asText).not.toContain('MARK_B')
    expect(asText).not.toContain('#22B222')
  })

  it('the delivered pack names the Version it came from', () => {
    setup()
    const aId = afterB.documentVersions[0].documentVersionId
    const out = bookVersionRenderInputs(afterB, aId)
    expect(out.pack.frozen).toBe(true)
    expect(out.pack.documentVersionId).toBe(aId)
  })

  it('delivering B delivers B', () => {
    setup()
    const bId = afterB.documentVersions[1].documentVersionId
    const out = bookVersionRenderInputs(afterB, bId)
    expect(out.ok).toBe(true)
    expect(out.pack.logoWordmark).toBe('WORDMARK B')
    expect(out.pack.typeHeading).toBe('Version B Serif')
    expect(out.pack.logoImage).toBe(IDENTITY_B.mark.image)
    expect(JSON.stringify(out.pack)).not.toContain('WORDMARK A')
  })

  it('is historically reproducible — A renders the same after B and after more edits', () => {
    setup()
    const aId = afterB.documentVersions[0].documentVersionId
    const first = bookVersionRenderInputs(afterB, aId).pack
    const churned = {
      ...afterB,
      logoWordmark: 'SOMETHING ELSE ENTIRELY',
      palette: ['#000000'],
      colorRoles: { cover: '#000000' },
      typeHeading: 'Third Face',
      logoImage: 'data:image/png;base64,CCCC',
    }
    const second = bookVersionRenderInputs(churned, aId).pack
    expect(second).toEqual(first)
  })
})

describe('the export path resolves the same Version the preview does', () => {
  it('latestBookVersionInputs returns the newest Book Version', () => {
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A')
    const afterB = freeze(
      { ...afterA, logoWordmark: IDENTITY_B.wordmark },
      IDENTITY_B,
      'idsnap_B'
    )
    const latest = latestBookVersionInputs(afterB)
    expect(latest).not.toBeNull()
    expect(latest.pack.logoWordmark).toBe('WORDMARK B')
    expect(latest.version.documentVersionId).toBe(
      afterB.documentVersions[1].documentVersionId
    )
  })

  it('REFUSES rather than falling back to live state', () => {
    /* The whole point of the contract: no Version means say so, never dress a
       live render as a frozen one. */
    const fresh = projectAt(IDENTITY_A)
    expect(latestBookVersionInputs(fresh)).toBeNull()
    expect(latestBookVersionInputs({})).toBeNull()
    expect(latestBookVersionInputs(null)).toBeNull()
  })

  it('ignores Presentation Versions — they are not the book', () => {
    /* A "Send for review" from Presentation mints a Version too. Treating one
       as the book would render the wrong document from real data. */
    const p = projectAt(IDENTITY_A)
    const withPresentation = {
      ...p,
      documentVersions: [
        {
          documentVersionId: 'dver_pres',
          templateId: 'dtpl_builtin_presentation',
          identitySnapshotId: 'idsnap_A',
          composition: [],
        },
      ],
      identitySnapshots: [snapshotOf('idsnap_A', IDENTITY_A)],
    }
    expect(latestBookVersionInputs(withPresentation)).toBeNull()
  })

  it('a Book Version is what the resolver accepts', () => {
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A')
    expect(afterA.documentVersions[0].templateId).toBe(DTPL_BUILTIN_BOOK)
    expect(latestBookVersionInputs(afterA)).not.toBeNull()
  })
})

describe('the export path is wired to the resolver', () => {
  /* The behavioural blocks above prove the resolver. They cannot prove
     `runExport` calls it — and that omission WAS the bug: every mechanism
     needed for a version-bound download already existed and shipped, unused,
     for the client-facing kinds. */
  it('App.runExport resolves a frozen Version for the client-facing kinds', async () => {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { dirname, resolve } = await import('node:path')
    const here = dirname(fileURLToPath(import.meta.url))
    const app = readFileSync(resolve(here, '../../App.jsx'), 'utf8')
    const i = app.indexOf('const runExport = (')
    expect(i, 'runExport moved').toBeGreaterThan(-1)
    const body = app.slice(i, i + 3000)
    expect(body).toMatch(/deliveryPackFor\(/)
    expect(body).toMatch(/kind === 'package' \|\| kind === 'pdf'/)
    /* The client-facing pack must not be the live one. */
    expect(body).toMatch(/const pack = delivery\.pack/)
  })
})

/**
 * The book is frozen; the folder around it is not.
 *
 * Binding the WHOLE package to the Version was tried and measured, and it
 * broke the package in two ways at once — both caught by downloading a real
 * one, neither by any test:
 *   · every file was renamed `Brand_*` because a frozen pack carries
 *     `detective: {}` by design and the packager names files from the client
 *     on it;
 *   · `05_APPLICATIONS/` lost the produced business card, because a Version
 *     freezes only artwork the BOOK REFERENCES (`appAssets: []` here) and the
 *     card is on the designer's shelf, not in the book.
 * Taking a paid deliverable off a client to make a purity point is a worse bug
 * than the one being fixed, so the split is explicit and tested.
 */
describe('deliveryPackFor — frozen book, current folder', () => {
  const livePack = {
    detective: { clientName: 'Real Client', deliverablesPicked: ['businessCard'] },
    projectName: 'Real Client',
    studio: 'A Studio',
    packageAssets: [{ id: 'pa_1', name: 'Business card', rights: 'clientOwned' }],
    logoWordmark: 'LIVE WORDMARK',
    typeHeading: 'Live Face',
  }
  const liveBook = { pageSize: 'letter' }

  it('takes the BOOK from the frozen Version', () => {
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A')
    const out = deliveryPackFor(afterA, livePack, liveBook)
    expect(out.frozen).toBe(true)
    expect(out.pack.logoWordmark).toBe('WORDMARK A')
    expect(out.pack.typeHeading).toBe('Version A Serif')
    expect(out.pack.palette).toEqual(IDENTITY_A.palette.hexes)
    expect(out.pack.logoWordmark).not.toBe('LIVE WORDMARK')
  })

  it('keeps the client name, the brief and the shelf CURRENT', () => {
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A')
    const out = deliveryPackFor(afterA, livePack, liveBook)
    /* Without these the zip is named `Brand_*` and loses a bought file. */
    expect(out.pack.detective.clientName).toBe('Real Client')
    expect(out.pack.detective.deliverablesPicked).toEqual(['businessCard'])
    expect(out.pack.projectName).toBe('Real Client')
    expect(out.pack.studio).toBe('A Studio')
    expect(out.pack.packageAssets).toHaveLength(1)
    expect(out.pack.packageAssets[0].id).toBe('pa_1')
  })

  it('falls back to live, and SAYS it is not frozen, with no Version', () => {
    const fresh = projectAt(IDENTITY_A)
    const out = deliveryPackFor(fresh, livePack, liveBook)
    expect(out.frozen).toBe(false)
    expect(out.pack).toBe(livePack)
    expect(out.book).toBe(liveBook)
  })

  it('a live edit after the freeze does not change the delivered book', () => {
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A')
    const before = deliveryPackFor(afterA, livePack, liveBook).pack
    const churnedLive = { ...livePack, logoWordmark: 'EDITED', typeHeading: 'Edited Face' }
    const after = deliveryPackFor(afterA, churnedLive, liveBook).pack
    expect(after.logoWordmark).toBe(before.logoWordmark)
    expect(after.typeHeading).toBe(before.typeHeading)
    expect(after.logoWordmark).toBe('WORDMARK A')
  })

  it('takes the page setup from the Version, not the live book', () => {
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A')
    const out = deliveryPackFor(afterA, livePack, liveBook)
    expect(out.book).not.toBe(liveBook)
  })
})

/**
 * THE ★ PACK IS AUTHORED WORK AND MUST SURVIVE THE FREEZE.
 *
 * The Imagery page is drawn from `pack.pins`. Nothing froze them, so binding
 * delivery to a Version silently dropped the mood board — a 20-page working
 * book delivered as 17. The pins are not derivable from anything else in the
 * Version: they are images the designer chose, in an order they chose, each
 * with a "why" they wrote.
 */
const PINS_A = [
  { id: 'p1', type: 'image', note: 'One warm ink on uncoated stock', visual: 'data:image/png;base64,PINA1', inPack: true, packHero: true },
  { id: 'p2', type: 'image', note: 'Botanical as data, not decoration', visual: 'data:image/png;base64,PINA2', inPack: true, packHero: false },
]
const PINS_B = [
  { id: 'p9', type: 'image', note: 'A COMPLETELY DIFFERENT REFERENCE', visual: 'data:image/png;base64,PINB9', inPack: true, packHero: true },
]

describe('the ★ pack freezes with the Book', () => {
  it('a Version carries the starred pins by value', () => {
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A', PINS_A)
    const v = afterA.documentVersions[0]
    expect(v.pins).toHaveLength(2)
    expect(v.pins[0].note).toBe('One warm ink on uncoated stock')
    expect(v.pins[0].visual).toBe('data:image/png;base64,PINA1')
  })

  it('BY VALUE — unstarring a pin later cannot change a delivered book', () => {
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A', PINS_A)
    /* The live shelf is emptied entirely. */
    const churned = { ...afterA, moodItems: [] }
    const out = bookVersionRenderInputs(
      churned,
      afterA.documentVersions[0].documentVersionId
    )
    expect(out.pack.pins).toHaveLength(2)
    expect(out.pack.pins[0].visual).toBe('data:image/png;base64,PINA1')
  })

  it('the frozen pack hands the Imagery page its pins', () => {
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A', PINS_A)
    const out = bookVersionRenderInputs(
      afterA,
      afterA.documentVersions[0].documentVersionId
    )
    /* Same key and shape the live pack uses, so one page draws both. */
    expect(Array.isArray(out.pack.pins)).toBe(true)
    expect(out.pack.pins.map((p) => p.note)).toEqual([
      'One warm ink on uncoated stock',
      'Botanical as data, not decoration',
    ])
  })

  it('DELIVERING A AFTER B STILL DELIVERS A\u2019S IMAGERY', () => {
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A', PINS_A)
    const afterB = freeze(
      { ...afterA, logoWordmark: IDENTITY_B.wordmark },
      IDENTITY_B,
      'idsnap_B',
      PINS_B
    )
    const aId = afterB.documentVersions[0].documentVersionId
    const out = bookVersionRenderInputs(afterB, aId)
    expect(out.pack.pins.map((p) => p.id)).toEqual(['p1', 'p2'])
    const asText = JSON.stringify(out.pack.pins)
    expect(asText).not.toContain('COMPLETELY DIFFERENT')
    expect(asText).not.toContain('PINB9')
  })

  it('a Version frozen before pins were captured still renders', () => {
    /* Backwards compatibility: an older Version has no `pins` key at all and
       must not throw or invent one. */
    const afterA = freeze(projectAt(IDENTITY_A), IDENTITY_A, 'idsnap_A', PINS_A)
    const legacy = {
      ...afterA,
      documentVersions: afterA.documentVersions.map((v) => {
        const copy = { ...v }
        delete copy.pins
        return copy
      }),
    }
    const out = bookVersionRenderInputs(
      legacy,
      afterA.documentVersions[0].documentVersionId
    )
    expect(out.ok).toBe(true)
    expect(out.pack.pins).toEqual([])
  })

  it('the store passes the sent pack\u2019s pins into the Version', () => {
    /* The resolver above is only correct if `recordSentBookVersion` actually
       hands it the pins — the omission that caused this whole finding. */
    const store = readFileSync(
      new URL('../../store/useAppStore.js', import.meta.url),
      'utf8'
    )
    const i = store.indexOf('recordSentBookVersion:')
    expect(i).toBeGreaterThan(-1)
    const block = store.slice(i, i + 3000)
    expect(block).toMatch(/pins:\s*sentPins/)
    expect(block).toMatch(/sentPack\.pins/)
  })
})
