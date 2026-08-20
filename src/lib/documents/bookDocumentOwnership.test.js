import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  BOOK_COMPOSITION_KEYS,
  BOOK_OVERRIDE_KEYS,
  bookBuilderFor,
  bookCompositionOf,
  bookOverridesOf,
  compositionFromLegacy,
  compositionToLegacy,
} from '../book/bookBuilder'
import { frozenBookContentFrom } from '../book/bookContent'
import {
  bookVersionRenderInputs,
  buildDocumentVersionData,
  ensureBookDocumentData,
  packFromBookVersion,
} from './documentModel'
import { bookContentPages } from '../book/bookContent'
import useAppStore from '../../store/useAppStore'

/**
 * PHASE 7 — THE BOOK DOCUMENT OWNS THE BOOK, AND A FROZEN VERSION IS READABLE.
 *
 * Two claims, and the second is the one 4B left open. A Book Version used to
 * carry overrides and refs and nothing else, which meant it could not be
 * re-rendered: the words came from the live project, so re-rendering last
 * month's send printed this month's brief. Nothing in the app read a Book
 * Version at all — they were write-only records.
 *
 * The tests below are mostly one test written several ways: change the live
 * project after a freeze, and prove the frozen thing does not move.
 */

const ROOT = new URL('../../..', import.meta.url).pathname
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

/** Comments may describe the old architecture; code may not be it. */
const codeOnly = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

function allSource() {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (/\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name)) out.push(rel)
    }
  }
  walk('src')
  return out
}

/** A project as it looked BEFORE Phase 7: everything in the legacy bag. */
const LEGACY = () => ({
  id: 'p1',
  name: 'Legacy Co',
  bookBuilder: {
    v: 1,
    pageSize: 'a4',
    edgeSpace: 'tight',
    printShop: true,
    type: { headlineSize: 40, bodySize: 12 },
    typeColor: { headline: 'auto' },
    pageBg: { pageCover: 'white' },
    grid: { columns: 8, show: true },
    running: { show: false, text: 'Legacy running' },
    pageOrder: ['cover', 'voice', 'colour'],
    pageLocking: { lockedPages: ['voice'] },
  },
})

describe('the Document owns the Book', () => {
  it('names overrides and composition as different things', () => {
    expect(BOOK_OVERRIDE_KEYS).toContain('pageSize')
    expect(BOOK_OVERRIDE_KEYS).toContain('grid')
    expect(BOOK_OVERRIDE_KEYS).toContain('running')
    /* Page arrangement is NOT an override — it was in the same bag, which is
       how it came to be missing from the freeze. */
    for (const key of BOOK_COMPOSITION_KEYS) {
      expect(BOOK_OVERRIDE_KEYS).not.toContain(key)
    }
  })

  it('answers from the Document once it has one', () => {
    const p = {
      ...LEGACY(),
      document: {
        documentId: 'doc_1',
        kind: 'book',
        templateId: 'dtpl_builtin_book',
        overrides: { pageSize: 'letter' },
        composition: [{ itemId: 'bpage_cover', pageId: 'cover', locked: false }],
      },
    }
    expect(bookOverridesOf(p).pageSize).toBe('letter')
    expect(bookBuilderFor(p).pageSize).toBe('letter')
    expect(bookCompositionOf(p).map((r) => r.pageId)).toEqual(['cover'])
  })

  /* CANONICAL FIRST, LEGACY SECOND, NEVER MERGED. A half-and-half read would
     make the answer depend on which keys were written when. */
  it('does not merge the legacy bag into the Document', () => {
    const p = {
      ...LEGACY(),
      document: {
        documentId: 'doc_1',
        kind: 'book',
        templateId: 'dtpl_builtin_book',
        overrides: { pageSize: 'letter' },
        composition: [],
      },
    }
    /* `edgeSpace` is 'tight' in the legacy bag and absent from the Document.
       It must resolve to the DEFAULT, not to the legacy value. */
    expect(bookBuilderFor(p).edgeSpace).not.toBe('tight')
  })

  it('still answers for a project that has never migrated', () => {
    const p = LEGACY()
    expect(bookBuilderFor(p).pageSize).toBe('a4')
    expect(bookBuilderFor(p).running.text).toBe('Legacy running')
    expect(bookCompositionOf(p).map((r) => r.pageId)).toEqual(['cover', 'voice', 'colour'])
    expect(bookCompositionOf(p).find((r) => r.pageId === 'voice').locked).toBe(true)
  })
})

describe('composition identity', () => {
  it('identifies rows by pageId, never by position', () => {
    const rows = bookCompositionOf(LEGACY())
    expect(rows.every((r) => r.pageId && r.itemId)).toBe(true)
    /* Dropping the first row must not re-point the others. */
    const without = rows.slice(1)
    expect(without.map((r) => r.pageId)).toEqual(['voice', 'colour'])
  })

  it('round-trips through the legacy shape the editor works in', () => {
    const rows = bookCompositionOf(LEGACY())
    const legacy = compositionToLegacy(rows)
    expect(legacy.pageOrder).toEqual(['cover', 'voice', 'colour'])
    expect(legacy.pageLocking.lockedPages).toEqual(['voice'])
    expect(compositionFromLegacy(legacy, rows)).toEqual(rows)
  })

  it('keeps locks when only the order changes', () => {
    const rows = bookCompositionOf(LEGACY())
    const next = compositionFromLegacy({ pageOrder: ['colour', 'cover', 'voice'] }, rows)
    expect(next.map((r) => r.pageId)).toEqual(['colour', 'cover', 'voice'])
    expect(next.find((r) => r.pageId === 'voice').locked).toBe(true)
  })
})

describe('migration', () => {
  it('moves the legacy bag into the Document on ensure', () => {
    const doc = ensureBookDocumentData(LEGACY())
    expect(doc.kind).toBe('book')
    expect(doc.templateId).toBe('dtpl_builtin_book')
    expect(doc.overrides.pageSize).toBe('a4')
    expect(doc.overrides.running.text).toBe('Legacy running')
    expect(doc.composition.map((r) => r.pageId)).toEqual(['cover', 'voice', 'colour'])
  })

  it('is idempotent', () => {
    const p = LEGACY()
    const once = ensureBookDocumentData(p, '2026-01-01T00:00:00.000Z')
    const twice = ensureBookDocumentData(
      { ...p, document: once },
      '2026-02-02T00:00:00.000Z'
    )
    expect(twice).toEqual(once)
  })

  it('is non-destructive — the legacy bag survives', () => {
    const p = LEGACY()
    const before = JSON.stringify(p.bookBuilder)
    ensureBookDocumentData(p)
    expect(JSON.stringify(p.bookBuilder)).toBe(before)
  })

  /* A 4B Document was an identity with nothing in it. Filling it from defaults
     rather than from the legacy bag would silently reset a laid-out book. */
  it('fills a 4B identity-only Document from the legacy bag', () => {
    const p = {
      ...LEGACY(),
      document: {
        documentId: 'doc_old',
        kind: 'book',
        templateId: 'dtpl_builtin_book',
        createdAt: 'x',
        updatedAt: 'x',
      },
    }
    const doc = ensureBookDocumentData(p)
    expect(doc.documentId).toBe('doc_old')
    expect(doc.overrides.pageSize).toBe('a4')
    expect(doc.composition.map((r) => r.pageId)).toEqual(['cover', 'voice', 'colour'])
  })
})

// ── The freeze ──

const SNAP_ID = 'idsnap_book'
const SNAPSHOT = {
  v: 1,
  kind: 'identitySnapshot',
  snapshotId: SNAP_ID,
  payload: {
    mark: { id: 'mk1', image: 'FROZEN-MARK' },
    palette: { hexes: ['#111111', '#222222'], roles: { primary: '#111111' } },
    type: { heading: 'Frozen Head', body: 'Frozen Body', why: 'Frozen why' },
    wordmark: 'FrozenMark',
    logoDirection: 'frozen direction',
  },
}

const FROZEN_PROJECT = () => ({
  id: 'p1',
  name: 'Book Co',
  positioning: 'FROZEN POSITIONING',
  tagline: 'FROZEN TAGLINE',
  detective: { audience: 'FROZEN AUDIENCE', toneOfVoice: 'FROZEN TONE' },
  palette: ['#111111', '#222222'],
  typeHeading: 'Frozen Head',
  typeBody: 'Frozen Body',
  logoConcepts: [{ id: 'mk1', chosen: true, image: 'FROZEN-MARK' }],
  document: {
    documentId: 'doc_1',
    kind: 'book',
    templateId: 'dtpl_builtin_book',
    overrides: { pageSize: 'a4', running: { text: 'FROZEN RUNNING' } },
    composition: [
      { itemId: 'bpage_cover', pageId: 'cover', locked: false },
      { itemId: 'bpage_voice', pageId: 'voice', locked: true },
    ],
  },
})

const freeze = (project) => {
  const pack = {
    positioning: project.positioning,
    tagline: project.tagline,
    clientName: 'Book Co',
    detective: project.detective,
  }
  const built = buildDocumentVersionData(project, {
    identitySnapshotId: SNAP_ID,
    content: frozenBookContentFrom(pack),
  })
  expect(built.ok, built.error).toBe(true)
  return built.version
}

describe('a frozen Book Version carries enough to be re-rendered', () => {
  it('records the composition that was sent', () => {
    const v = freeze(FROZEN_PROJECT())
    expect(v.composition.map((r) => r.pageId)).toEqual(['cover', 'voice'])
  })

  it('records the resolved words that were printed', () => {
    const v = freeze(FROZEN_PROJECT())
    expect(v.content.positioning).toBe('FROZEN POSITIONING')
    expect(v.content.audience).toBe('FROZEN AUDIENCE')
    expect(v.content.toneOfVoice).toBe('FROZEN TONE')
  })

  /* The client's answers are resolved to values, not copied as a second
     `detective`. There is one home for the brief and this is not it. */
  it('stores no second copy of the brief', () => {
    const v = freeze(FROZEN_PROJECT())
    expect(v.content.detective).toBeUndefined()
    for (const forbidden of ['detective', 'brief', 'tasks', 'directions', 'pageOrder']) {
      expect(Object.keys(v), `${forbidden} rode along`).not.toContain(forbidden)
    }
  })

  it('requires an Identity Snapshot', () => {
    const bad = buildDocumentVersionData(FROZEN_PROJECT(), { identitySnapshotId: '' })
    expect(bad.ok).toBe(false)
  })
})

describe('a frozen Version renders without the live project', () => {
  it('builds a pack from the Version and the Snapshot alone', () => {
    const pack = packFromBookVersion(freeze(FROZEN_PROJECT()), SNAPSHOT)
    expect(pack.positioning).toBe('FROZEN POSITIONING')
    expect(pack.typeHeading).toBe('Frozen Head')
    expect(pack.logoImage).toBe('FROZEN-MARK')
    expect(pack.palette).toEqual(['#111111', '#222222'])
    expect(pack.bookComposition.map((r) => r.pageId)).toEqual(['cover', 'voice'])
    expect(pack.frozen).toBe(true)
  })

  /* THE POINT OF THE PHASE, stated as a signature: the adapter takes no
     project, so it cannot read one. */
  it('takes no project argument at all', () => {
    expect(packFromBookVersion.length).toBe(2)
  })

  /* The strongest form of the claim, and it has to actually rewrite the
     project — an earlier draft of this test called the adapter twice with the
     same inputs, which proves only that the function is pure. */
  it('does not move when the whole live project is rewritten', () => {
    const project = FROZEN_PROJECT()
    const version = freeze(project)
    const before = JSON.stringify(packFromBookVersion(version, SNAPSHOT))

    /* Everything the book prints, changed underneath it. */
    project.positioning = 'LIVE POSITIONING'
    project.tagline = 'LIVE TAGLINE'
    project.detective = { audience: 'LIVE AUDIENCE', toneOfVoice: 'LIVE TONE' }
    project.palette = ['#ffffff']
    project.typeHeading = 'Live Head'
    project.typeBody = 'Live Body'
    project.logoConcepts = [{ id: 'mk2', chosen: true, image: 'LIVE-MARK' }]
    project.document.overrides = { pageSize: 'letter' }
    project.document.composition = [{ itemId: 'x', pageId: 'zzz', locked: false }]

    const after = JSON.stringify(packFromBookVersion(version, SNAPSHOT))
    expect(after).toBe(before)
    expect(after, 'live state reached a frozen render').not.toContain('LIVE')
    expect(after).not.toContain('zzz')
  })

  it('leaves the brief empty so a live answer cannot leak in', () => {
    const pack = packFromBookVersion(freeze(FROZEN_PROJECT()), SNAPSHOT)
    expect(pack.detective).toEqual({})
  })

  /* NEVER a silent fallback. A snapshot that cannot answer for the mark says
     so; substituting today's mark would show work that was never sent. */
  it('names missing references rather than substituting live Identity', () => {
    const empty = { ...SNAPSHOT, payload: {} }
    const pack = packFromBookVersion(freeze(FROZEN_PROJECT()), empty)
    expect(pack.missingRefs).toEqual(['mark', 'palette', 'typePairing'])
    expect(pack.logoImage).toBe('')
    expect(pack.palette).toEqual([])
    expect(pack.typeHeading).toBe('')
  })

  it('is deterministic ignoring nothing — the same Version gives the same pack', () => {
    const version = freeze(FROZEN_PROJECT())
    expect(packFromBookVersion(version, SNAPSHOT)).toEqual(
      packFromBookVersion(version, SNAPSHOT)
    )
  })
})

describe('one writer, one reader, one renderer', () => {
  const sources = allSource().map((rel) => [rel, read(rel)])

  it('nothing writes project.bookBuilder except the migration path', () => {
    for (const [rel, src] of sources) {
      if (rel.endsWith('store/useAppStore.js')) continue
      expect(codeOnly(src), `${rel} writes the legacy bag`).not.toMatch(
        /bookBuilder:\s*\{[\s\S]{0,40}\.\.\.\(?p\.bookBuilder/
      )
    }
  })

  it('setBookBuilder writes the Document, not the legacy bag', () => {
    const store = codeOnly(read('src/store/useAppStore.js'))
    const action = store.slice(
      store.indexOf('setBookBuilder: (patch)'),
      store.indexOf('recordPublishedIdentity:')
    )
    expect(action).toMatch(/document: next/)
    expect(action).toMatch(/overrides:/)
    expect(action).toMatch(/composition:/)
    expect(action, 'the legacy bag was rewritten').not.toMatch(/bookBuilder:\s*\{/)
  })

  it('the editor reads composition from the Document', () => {
    const view = codeOnly(read('src/views/BrandBookBuilderView.jsx'))
    expect(view).toMatch(/bookCompositionOf\(project\)/)
    expect(
      view,
      'the editor still reads page order straight out of the legacy bag'
    ).not.toMatch(/project\?\.bookBuilder\?\.pageOrder/)
  })

  it('the editor ensures a Document on open, not at Send', () => {
    const view = codeOnly(read('src/views/BrandBookBuilderView.jsx'))
    expect(view).toMatch(/ensureBookDocument\(currentProjectId\)/)
  })

  it('there is no second Book renderer', () => {
    /* The frozen path produces a pack for the SAME generator. A second
       rasteriser or a second page planner would be the split this avoids. */
    const model = codeOnly(read('src/lib/documents/documentModel.js'))
    expect(model).not.toMatch(/jsPDF|pdfDoc|new PDFDocument/)
  })
})

describe('Phase 7 changes nothing it was told not to', () => {
  it('leaves Delivery alone', () => {
    for (const rel of [
      'src/features/client-portal/DeliverToClient.jsx',
      'src/lib/client/brandDelivery.js',
      'src/lib/client/clientPortal.js',
      'src/lib/client/reviewArtifact.js',
    ]) {
      const src = codeOnly(read(rel))
      expect(src, `${rel} learned about Book composition`).not.toMatch(
        /bookCompositionOf|packFromBookVersion|frozenBookContentFrom/
      )
    }
  })

  it('does not make the Book reviewable', () => {
    const units = read('src/lib/client/reviewArtifact.js')
    expect(units).not.toMatch(/\bbook:\s*Object\.freeze/)
  })

  it('does not use applyTemplate to build the Document', () => {
    const model = codeOnly(read('src/lib/documents/documentModel.js'))
    expect(model).not.toMatch(/applyTemplate/)
  })

  it('keeps one built-in Book template and adds no template records', () => {
    const model = read('src/lib/documents/documentModel.js')
    expect(model).toMatch(/DTPL_BUILTIN_BOOK = 'dtpl_builtin_book'/)
    expect(model).not.toMatch(/templateRecords|createTemplate|saveAsMyTemplate/)
  })
})

// ── The frozen export path ──

/**
 * A project holding one frozen Version and its snapshot, ready to render.
 * Built through the real freeze so the Version under test is the one the
 * app would actually have written.
 */
const SENT_PROJECT = () => {
  const p = FROZEN_PROJECT()
  p.identitySnapshots = [SNAPSHOT]
  p.documentVersions = [freeze(p)]
  return p
}

describe('a frozen Version can be exported on its own', () => {
  it('hands the existing generator its two arguments and nothing new', () => {
    const p = SENT_PROJECT()
    const r = bookVersionRenderInputs(p, p.documentVersions[0].documentVersionId)
    expect(r.ok).toBe(true)
    /* `pack` and `book` — exactly what BrandBookPreview takes and exactly what
       downloadBrandPackVectorPdf takes. A third argument would mean a second
       rendering contract. */
    expect(Object.keys(r.book).sort()).toEqual(['edgeSpace', 'pageSize', 'printShop'])
    expect(r.book.pageSize).toBe('a4')
    expect(r.pack.frozen).toBe(true)
  })

  it('will not render a Presentation Version as a book', () => {
    const p = SENT_PROJECT()
    p.documentVersions = [
      { ...p.documentVersions[0], templateId: 'dtpl_builtin_presentation' },
    ]
    const r = bookVersionRenderInputs(p, p.documentVersions[0].documentVersionId)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/not a Book Version/i)
  })

  it('refuses an id it does not hold rather than rendering something else', () => {
    const p = SENT_PROJECT()
    expect(bookVersionRenderInputs(p, 'dver_nope').ok).toBe(false)
    expect(bookVersionRenderInputs(p, '').ok).toBe(false)
  })

  /**
   * THE POINT OF THE WHOLE PHASE, STATED AS A DIFF.
   *
   * Rewrite every live field the export used to read — brief, identity, the
   * Book's own settings, the page order — and the frozen export must come back
   * byte-identical. `exportedAt` is the Version's own createdAt, not a stamp
   * taken at export time, so nothing is excused here.
   */
  it('is deterministic after the live project is rewritten underneath it', () => {
    const p = SENT_PROJECT()
    const id = p.documentVersions[0].documentVersionId
    const before = JSON.stringify(bookVersionRenderInputs(p, id))

    p.positioning = 'LIVE POSITIONING'
    p.tagline = 'LIVE TAGLINE'
    p.detective = { audience: 'LIVE AUDIENCE', toneOfVoice: 'LIVE TONE' }
    p.palette = ['#ff0000']
    p.typeHeading = 'Live Head'
    p.typeBody = 'Live Body'
    p.logoConcepts = [{ id: 'mk1', chosen: true, image: 'LIVE-MARK' }]
    p.bookBuilder = { pageSize: 'letter', pageOrder: ['colour', 'cover'] }
    p.document.overrides = { pageSize: 'letter' }
    p.document.composition = [{ itemId: 'bpage_x', pageId: 'colour', locked: false }]
    /* A re-publish APPENDS a new snapshot; it never edits the old one. The
       older Version must keep resolving the older snapshot. Overwriting
       `idsnap_book` in place would be forging an immutable record, which is
       not a thing the app can do — `documentVersionOwnership.test.js` holds
       that store's append-only behaviour. */
    p.identitySnapshots = [
      SNAPSHOT,
      {
        ...SNAPSHOT,
        snapshotId: 'idsnap_later',
        payload: { ...SNAPSHOT.payload, mark: { id: 'mk1', image: 'LIVE-MARK' } },
      },
    ]

    const after = JSON.stringify(bookVersionRenderInputs(p, id))
    expect(after).toBe(before)
    expect(after).not.toMatch(/LIVE/)
  })

  /* A snapshot that has gone missing is a missing state, never a live read. */
  it('names what it could not resolve instead of borrowing today’s Identity', () => {
    const p = SENT_PROJECT()
    p.identitySnapshots = []
    const r = bookVersionRenderInputs(p, p.documentVersions[0].documentVersionId)
    expect(r.ok).toBe(true)
    expect(r.missingRefs).toEqual(['mark', 'palette', 'typePairing'])
    expect(r.pack.logoImage).toBe('')
    expect(r.pack.palette).toEqual([])
  })
})

describe('one renderer, fed two ways', () => {
  /**
   * The claim is not "the code looks similar" — it is that the SAME content
   * pipeline accepts both packs. `bookContentPages` is the single declaration
   * of which pages exist and what prints on them, and both the on-screen
   * preview and the PDF resolve through it. Running a frozen pack through it
   * here is the proof that no second pipeline is needed.
   */
  it('the frozen pack goes through the page pipeline the working pack does', () => {
    const p = SENT_PROJECT()
    const frozenPack = bookVersionRenderInputs(p, p.documentVersions[0].documentVersionId).pack

    const frozen = bookContentPages(frozenPack)
    expect(frozen.pages.length).toBeGreaterThan(0)

    /* The frozen brief is empty, and the words still print — because they were
       resolved flat at freeze and `readField` finds them there. This is the
       single behaviour that lets one pipeline serve both adapters. */
    const text = JSON.stringify(frozen.pages)
    expect(text).toContain('FROZEN POSITIONING')
    expect(text).toContain('FROZEN AUDIENCE')
    expect(frozenPack.detective).toEqual({})
  })

  it('gives the same pages for the same Version every time', () => {
    const p = SENT_PROJECT()
    const id = p.documentVersions[0].documentVersionId
    const a = bookContentPages(bookVersionRenderInputs(p, id).pack)
    const b = bookContentPages(bookVersionRenderInputs(p, id).pack)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

// ── Editing is not sending ──

/**
 * THE ONE THING A DESIGNER MUST BE ABLE TO DO WITHOUT CONSEQUENCE: work.
 *
 * A Version is a promise to a client that a specific book was sent on a
 * specific day. If typing minted one, the list would fill with hundreds of
 * near-identical rows and the promise would mean nothing — and the freeze the
 * client's approval hangs off would no longer identify anything.
 */
describe('ordinary Book editing never mints a Version', () => {
  beforeEach(() => {
    useAppStore.getState().clearToEmpty()
    useAppStore.getState().createNewProject('Phase 7 editing')
  })

  const state = () => useAppStore.getState()
  const project = () => state().projects.find((p) => p.id === state().currentProjectId)

  it('survives a full editing session with zero Versions', () => {
    state().ensureBookDocument(project().id)

    /* Typing in the setup panel. */
    state().setBookBuilder({ pageSize: 'a4' })
    state().setBookBuilder({ edgeSpace: 'tight' })
    state().setBookBuilder({ running: { show: true, text: 'Draft' } })
    /* Reordering pages. */
    state().setBookBuilder({ pageOrder: ['voice', 'cover', 'colour'] })
    state().setBookBuilder({ pageOrder: ['colour', 'voice', 'cover'] })
    /* Locking one. */
    state().setBookBuilder({ pageLocking: { lockedPages: ['voice'] } })
    /* Autosave writing the same thing again. */
    state().setBookBuilder({ pageSize: 'a4' })

    expect(project().documentVersions || []).toHaveLength(0)
    /* …and the work is all still there. */
    expect(bookOverridesOf(project()).pageSize).toBe('a4')
    expect(bookCompositionOf(project()).map((r) => r.pageId)).toEqual([
      'colour',
      'voice',
      'cover',
    ])
    expect(bookCompositionOf(project()).find((r) => r.pageId === 'voice').locked).toBe(true)
  })

  /**
   * Project Versions are capped at 24 and prune the oldest. Document Versions
   * are the client-facing record and are append-only and uncapped — the two
   * must never share a retention rule, or the twenty-fifth send would delete
   * the book a client approved.
   */
  it('keeps Document Versions past the Project Version cap', () => {
    const service = readFileSync(
      join(ROOT, 'src/services/versionService.js'),
      'utf8'
    )
    expect(service).toMatch(/maxVersionsPerProject\s*=\s*24/)

    const store = codeOnly(read('src/store/useAppStore.js'))
    const append = store.slice(
      store.indexOf('recordSentBookVersion:'),
      store.indexOf('recordSentBookVersion:') + 2600
    )
    expect(append, 'the Version list is pruned').not.toMatch(
      /documentVersions[\s\S]{0,200}\.slice\(-?\d/
    )
    expect(append).toMatch(/documentVersions:\s*\[\s*\.\.\./)

    /* And behaviourally: thirty freezes, thirty rows, the first one intact. */
    const p = SENT_PROJECT()
    const rows = []
    for (let i = 0; i < 30; i += 1) rows.push(freeze(p))
    expect(new Set(rows.map((v) => v.documentVersionId)).size).toBe(30)
    expect(rows[0].content).toEqual(rows[29].content)
  })
})
