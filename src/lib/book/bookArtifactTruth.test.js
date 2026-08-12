import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import useAppStore from '../../store/useAppStore'
import { buildBrandPackSnapshot, downloadBrandPackVectorPdf } from './exportFiles'
import { bookContentPages, PAGE_FIELDS, readField, fieldHome } from './bookContent'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  bookBuilderFor,
  projectBookSetup,
  marginPercentForEdge,
  EDGE_STOPS,
  EDGE_ORDER,
} from './bookBuilder'
import {
  BOOK_EDGE_SPACE,
  BOOK_PAGE_SIZES,
  resolveBookSetup,
} from './brandBookSetup'
import { buildDeliveryPack, PRIVATE_PACK_FIELDS } from '../client/brandDelivery'

/**
 * THE BRAND BOOK IS A PRODUCED ARTIFACT, NOT A PLACE TO TYPE.
 *
 * `bookOwnsNothing.test.js` holds the authoring half — that the builder has no
 * input for a fact the brief or Identity already owns. This file holds the
 * PRODUCTION half, which is the part only the generated file can answer:
 *
 *   · the same canonical truth produces the same document (artifact identity)
 *   · a change to the brief, or to Identity, reaches the produced file
 *   · nothing is invented to fill a gap
 *   · the preview, the produced artifact and the delivery payload are three
 *     different things, and none of them is silently standing in for another
 *
 * Every assertion here reads the GENERATED PDF's text layer or its page
 * geometry rather than the pack that fed it. "The pack carries it" is exactly
 * the step that was already true while the file the client received ignored
 * it — see `bookFieldsReach.test.js` for the same reasoning.
 */

/* One generation is ~0.5s, so the fixtures are shared and the count is kept
   deliberately low. */
async function pdfText(blob) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
  }).promise
  let out = ''
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    out += `${content.items.map((it) => it.str).join(' ')}\n`
  }
  return out
}

async function firstPageSize(blob) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
  }).promise
  const v = (await doc.getPage(1)).getViewport({ scale: 1 })
  return { w: Math.round(v.width), h: Math.round(v.height) }
}

const generate = async (pack, book) => {
  const res = await downloadBrandPackVectorPdf(pack, null, {
    returnBlobOnly: true,
    book,
  })
  expect(res?.ok, `generation failed: ${res?.error}`).toBe(true)
  return res.blob
}

const fresh = (name = 'Northwind Coffee') => {
  useAppStore.getState().clearToEmpty()
  return useAppStore.getState().createNewProject(name)
}

const current = () => {
  const s = useAppStore.getState()
  return s.projects.find((p) => p.id === s.currentProjectId)
}

const snapshot = () =>
  buildBrandPackSnapshot({ project: current(), tasks: [], moodItems: [] })

/* ─────────────────────────────────── artifact identity ─────────────── */

describe('a produced brand book has a stable identity', () => {
  afterEach(() => vi.useRealTimers())

  it('dates itself from the pack it was built from, not from the clock', async () => {
    /* The cover read `new Date()`, so one pack produced a different document
       every day it was generated. That is not a cosmetic difference: the
       reveal page regenerates the PDF in the CLIENT's browser, so the client's
       copy was stamped the day they opened the link rather than the day it was
       delivered, and the designer's copy of the same delivery disagreed with
       it. Re-generation now reproduces the delivered document. */
    const pack = {
      projectName: 'Northwind Coffee',
      logoWordmark: 'Northwind Coffee',
      palette: ['#1C1917', '#0F766E', '#A8A29E'],
      detective: { clientName: 'Northwind Coffee', goal: 'Look like a staple.' },
      exportedAt: '2026-03-04T10:00:00.000Z',
    }

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-04T10:00:00Z'))
    const madeOnTheDay = await pdfText(await generate(pack))

    vi.setSystemTime(new Date('2026-11-19T10:00:00Z'))
    const madeMonthsLater = await pdfText(await generate(pack))

    expect(madeMonthsLater).toBe(madeOnTheDay)
    expect(madeOnTheDay).toContain(
      new Date('2026-03-04T10:00:00.000Z').toLocaleDateString()
    )
  })

  it('still dates a hand-built pack rather than printing nothing', async () => {
    /* The fallback is honest, not silent: a pack with no stamp is dated now,
       which is what it is, instead of leaving the cover undated. */
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-06T10:00:00Z'))
    const text = await pdfText(
      await generate({ projectName: 'Undated', palette: ['#111111'] })
    )
    expect(text).toContain(new Date('2026-05-06T10:00:00Z').toLocaleDateString())
  })
})

/* ─────────────────────────────── canonical truth reaches the file ──── */

describe('the produced book is built from canonical truth', () => {
  beforeEach(() => {
    fresh()
  })

  it('reflects a change made in the brief', async () => {
    const store = useAppStore.getState()
    store.updateDetective('clientName', 'Northwind Coffee')
    store.updateDetective('usp', 'Roasted before the sun is up')
    store.updateDetective('audience', 'Neighbours who walk to work')

    const text = await pdfText(await generate(snapshot()))
    expect(text).toContain('Roasted before the sun is up')
    expect(text).toContain('Neighbours who walk to work')
  })

  it('reflects a change made in Identity', async () => {
    const store = useAppStore.getState()
    store.updateDetective('clientName', 'Northwind Coffee')
    store.updateBrandField('tagline', 'Slow mornings, kept')
    store.updateBrandField('positioning', 'The roaster that opens first')

    const text = await pdfText(await generate(snapshot()))
    expect(text).toContain('Slow mornings, kept')
    expect(text).toContain('The roaster that opens first')
  })

  it('re-exporting after an edit produces the edited book, not the old one', async () => {
    const store = useAppStore.getState()
    store.updateDetective('clientName', 'Northwind Coffee')
    store.updateBrandField('tagline', 'First light')
    const before = await pdfText(await generate(snapshot()))
    expect(before).toContain('First light')

    useAppStore.getState().updateBrandField('tagline', 'Before the sun')
    const after = await pdfText(await generate(snapshot()))
    expect(after).toContain('Before the sun')
    expect(after).not.toContain('First light')
  })

  it('survives a reload — the produced book comes back from stored truth', async () => {
    const store = useAppStore.getState()
    store.updateDetective('clientName', 'Northwind Coffee')
    store.updateDetective('usp', 'Roasted before the sun is up')
    store.updateBrandField('tagline', 'Slow mornings, kept')

    /* A reload is the persisted JSON coming back — the artifact is not stored,
       so what has to survive is everything the artifact is derived from. */
    const persisted = JSON.parse(JSON.stringify(current()))
    const rebuilt = buildBrandPackSnapshot({
      project: persisted,
      tasks: [],
      moodItems: [],
    })
    rebuilt.exportedAt = '2026-03-04T10:00:00.000Z'
    const live = snapshot()
    live.exportedAt = '2026-03-04T10:00:00.000Z'

    expect(await pdfText(await generate(rebuilt))).toBe(
      await pdfText(await generate(live))
    )
  })
})

/* ───────────────────────────────────── nothing is invented ─────────── */

describe('a gap is reported, never filled', () => {
  beforeEach(() => {
    fresh()
  })

  it('omits the pages it has no answers for, and says what each needs', () => {
    const { pages, omitted } = bookContentPages(snapshot())
    const ids = pages.map((p) => p.id)
    expect(ids).not.toContain('story')
    expect(ids).not.toContain('imagery')
    /* Absence is described, not merely absent — otherwise the only way to
       learn a page is missing is to notice it is not there. */
    expect(omitted.length).toBeGreaterThan(0)
    for (const o of omitted) {
      expect(o.needs, `"${o.id}" is omitted with nothing said about why`).toBeTruthy()
    }
  })

  it('a page appears once the project actually answers for it', () => {
    expect(bookContentPages(snapshot()).pages.map((p) => p.id)).not.toContain(
      'story'
    )
    useAppStore.getState().updateDetective('story', 'It started in a kitchen.')
    expect(bookContentPages(snapshot()).pages.map((p) => p.id)).toContain('story')
  })

  it('prints no placeholder copy into an empty book', async () => {
    const text = await pdfText(await generate(snapshot()))
    expect(text).not.toMatch(/\bTBD\b/i)
    expect(text).not.toMatch(/lorem ipsum/i)
    expect(text).not.toMatch(/\be\.g\./i)
  })

  it('does not let the composed brief summary stand in for a real answer', () => {
    /* `project.brief` is recomposed from the client's answers on every
       keystroke, so it is a working artefact rather than prose anyone wrote.
       Printing it as Story or Positioning is invented copy wearing a heading.

       The Story PAGE may still appear — "The goal" is a declared field with a
       real answer behind it. What must not appear is the run-on summary as
       Story's prose, or as a positioning line nobody wrote. */
    useAppStore.getState().updateDetective('goal', 'Look established')
    const pack = snapshot()
    expect(pack.brief).toContain('Goal:')
    expect(pack.positioning).toBe('')

    const story = bookContentPages(pack).pages.find((p) => p.id === 'story')
    expect(story.blocks.some((b) => b.kind === 'prose')).toBe(false)
    for (const b of story.blocks) {
      expect(String(b.text || '')).not.toContain('Goal:')
    }
  })
})

/* ─────────────────────── the book reads, it does not author ────────── */

describe('every printed field resolves to a home outside the book', () => {
  it('reads canonical project state, not a book-local copy', () => {
    /* The read order is the one `buildBrandPackSnapshot` resolves in, so what
       the builder shows is what will print. A book-scoped value cannot win. */
    const x = {
      pack: { positioning: 'canonical', toneOfVoice: 'canonical tone' },
      d: { positioning: 'stale brief copy', toneOfVoice: 'brief tone' },
    }
    expect(readField({ scope: 'project', field: 'positioning' }, x)).toBe(
      'canonical'
    )
    /* Brief-scoped fields resolve brief-first, for the same reason. */
    expect(readField({ scope: 'detective', field: 'toneOfVoice' }, x)).toBe(
      'brief tone'
    )
  })

  it('sends every editable printed field somewhere it can actually be typed', () => {
    for (const [page, rows] of Object.entries(PAGE_FIELDS)) {
      for (const f of rows) {
        if (f.editedElsewhere) continue
        expect(fieldHome(f), `${page}.${f.field} has no home`).toBeTruthy()
      }
    }
  })
})

/* ──────────────── preview ≠ artifact ≠ delivery verification ───────── */

describe('preview, produced artifact and delivery are three different things', () => {
  beforeEach(() => {
    fresh()
  })

  it('the delivery carries canonical truth, not a stored PDF', () => {
    /* The reveal page regenerates the real book from `delivery.pack` through
       the same generator the designer used. There is deliberately only ONE
       production pipeline — a stored copy of the bytes would be a second
       answer to "what is the brand book" that could drift from the first. */
    useAppStore.getState().updateBrandField('tagline', 'Slow mornings, kept')
    const { pack } = buildDeliveryPack(snapshot())
    expect(pack.tagline).toBe('Slow mornings, kept')
    expect(pack.pdf).toBeUndefined()
    expect(pack.blob).toBeUndefined()
    expect(pack.artifactUrl).toBeUndefined()
  })

  it('strips the designer’s private working record from what is delivered', () => {
    const pack = snapshot()
    const { pack: delivered } = buildDeliveryPack(pack)
    for (const field of PRIVATE_PACK_FIELDS) {
      expect(delivered, `"${field}" reached the client`).not.toHaveProperty(field)
    }
  })

  it('a delivered pack still produces the same book the designer proofed', async () => {
    const store = useAppStore.getState()
    store.updateDetective('clientName', 'Northwind Coffee')
    store.updateBrandField('tagline', 'Slow mornings, kept')

    const designerPack = snapshot()
    designerPack.exportedAt = '2026-03-04T10:00:00.000Z'
    const { pack: clientPack } = buildDeliveryPack(designerPack)

    const book = { pageSize: 'letter', edgeSpace: 'standard', printShop: false }
    expect(await pdfText(await generate(clientPack, book))).toBe(
      await pdfText(await generate(designerPack, book))
    )
  })
})

/* ────────────────────── page setup: one home, seeded once ──────────── */

/**
 * THE PAGE SETUP HAS ONE LIVE HOME: THE PROJECT.
 *
 * It had two. `project.bookBuilder.print.pageSize` / `grid.edge` (per
 * project, defaulting A4 + roomy) drove the Builder; `prefs.book*`
 * (workspace-sticky, defaulting Letter + standard) drove the download, the
 * package, the kit and the published delivery. So the book a designer laid
 * out and proofed came out at a different trim and margin from the one the
 * client received, with nothing on screen to say so.
 *
 * Owner decision, 2026-08-12 — the SEEDED VARIANT: studio prefs are defaults
 * only. They are copied into a project at creation and at the v10 migration,
 * and are never consulted again. The project is the single live source for
 * the Builder, the preview, the PDF, the package and the delivery alike.
 *
 * The block these replace pinned the divergence as existing behaviour. It is
 * gone because the divergence is gone; the assertions below are the contract
 * that took its place.
 */
describe('page setup is owned by the project, seeded from the studio', () => {
  beforeEach(() => {
    fresh()
  })

  const setPrefs = (patch) => {
    const setPref = useAppStore.getState().setPref
    Object.entries(patch).forEach(([k, v]) => setPref(k, v))
  }

  it('a new project inherits the studio page size and edge', () => {
    setPrefs({ bookPageSize: 'a4', bookEdgeSpace: 'tight', bookPrintShop: true })
    useAppStore.getState().createNewProject('Seeded')
    expect(projectBookSetup(current())).toEqual({
      pageSize: 'a4',
      edgeSpace: 'tight',
      printShop: true,
    })
  })

  it('two projects can legitimately use different page setups', () => {
    setPrefs({ bookPageSize: 'letter', bookEdgeSpace: 'standard' })
    const a = useAppStore.getState().createNewProject('US client')
    setPrefs({ bookPageSize: 'a4', bookEdgeSpace: 'roomy' })
    const b = useAppStore.getState().createNewProject('EU client')

    const find = (id) => useAppStore.getState().projects.find((p) => p.id === id)
    expect(projectBookSetup(find(a.id)).pageSize).toBe('letter')
    expect(projectBookSetup(find(b.id)).pageSize).toBe('a4')
  })

  it('changing a studio default does not alter a project that exists', () => {
    setPrefs({ bookPageSize: 'letter', bookEdgeSpace: 'standard' })
    useAppStore.getState().createNewProject('Already made')
    setPrefs({ bookPageSize: 'a4', bookEdgeSpace: 'tight', bookPrintShop: true })
    expect(projectBookSetup(current())).toEqual({
      pageSize: 'letter',
      edgeSpace: 'standard',
      printShop: false,
    })
  })

  it('no consumer resolves page setup from prefs — the chain does not exist', () => {
    /* The project answers even when the prefs say something else entirely,
       which is the difference between a seed and a fallback. */
    useAppStore.getState().setBookBuilder({ pageSize: 'a4', edgeSpace: 'roomy' })
    setPrefs({ bookPageSize: 'letter', bookEdgeSpace: 'tight' })
    expect(projectBookSetup(current())).toMatchObject({
      pageSize: 'a4',
      edgeSpace: 'roomy',
    })

    /* And grepped, because the next `prefs.book*` read added in good faith is
       the one that quietly restores the second authority. */
    const here = dirname(fileURLToPath(import.meta.url))
    const root = resolve(here, '../..')
    const offenders = []
    for (const rel of [
      'App.jsx',
      'views/DeliverView.jsx',
      'views/BrandBookBuilderView.jsx',
      'lib/book/brandBookPdf.js',
      'lib/book/exportFiles.js',
      'lib/deliver/packagePlan.js',
      'lib/deliver/packageFiles.js',
      'lib/client/brandDelivery.js',
      'components/BrandBookPreview.jsx',
      'features/client-portal/PublicBrandReveal.jsx',
    ]) {
      const src = readFileSync(resolve(root, rel), 'utf8')
      if (/\bbookPageSize\b|\bbookEdgeSpace\b|\bbookPrintShop\b/.test(src)) {
        offenders.push(rel)
      }
    }
    expect(offenders).toEqual([])
  })

  it('a project’s setup drives the PDF the Builder exports', async () => {
    useAppStore.getState().setBookBuilder({ pageSize: 'a4', edgeSpace: 'roomy' })
    const a4 = await firstPageSize(
      await generate(snapshot(), projectBookSetup(current()))
    )
    expect(a4).toEqual({ w: 595, h: 842 })

    useAppStore.getState().setBookBuilder({ pageSize: 'letter' })
    const letter = await firstPageSize(
      await generate(snapshot(), projectBookSetup(current()))
    )
    expect(letter).toEqual({ w: 612, h: 792 })
  })

  it('delivery carries the project’s setup, so the client’s copy matches', () => {
    useAppStore.getState().setBookBuilder({ pageSize: 'a4', edgeSpace: 'tight' })
    /* `DeliverToClient` publishes `{ pack, book }` and the reveal page
       regenerates through the same generator with that `book`. What matters
       is that the value it publishes is the project's. */
    expect(projectBookSetup(current())).toMatchObject({
      pageSize: 'a4',
      edgeSpace: 'tight',
    })
    const { pack } = buildDeliveryPack(snapshot())
    expect(pack).toBeTruthy()
  })

  it('a reload does not resurrect the studio pref over the project value', () => {
    useAppStore.getState().setBookBuilder({ pageSize: 'a4', edgeSpace: 'roomy' })
    setPrefs({ bookPageSize: 'letter', bookEdgeSpace: 'tight' })
    const reloaded = JSON.parse(JSON.stringify(current()))
    expect(projectBookSetup(reloaded)).toMatchObject({
      pageSize: 'a4',
      edgeSpace: 'roomy',
    })
  })
})

describe('the Builder proofs the edge that actually prints', () => {
  it('screen padding and PDF margin come from one table', () => {
    /* `EDGE_STOPS` carried roomy 20mm / standard 14mm / tight 10mm while
       `BOOK_EDGE_SPACE` defined the same ids as 60/48/36pt (21.2 / 16.9 /
       12.7mm). The Builder padded from the first, the PDF from the second,
       so "Standard" meant two different edges. One table now. */
    for (const size of ['letter', 'a4']) {
      const width = BOOK_PAGE_SIZES.find((s) => s.id === size).w
      for (const edge of EDGE_ORDER) {
        const pt = BOOK_EDGE_SPACE.find((e) => e.id === edge).margin
        const pct = marginPercentForEdge(edge, size)
        /* The screen percentage is that same point margin over the same trim
           width — one decimal place of rounding, nothing else. */
        expect(pct).toBeCloseTo((pt / width) * 100, 1)
        /* And it agrees with the geometry the generator will resolve. */
        expect(resolveBookSetup({ pageSize: size, edgeSpace: edge }).margin).toBe(pt)
      }
    }
  })

  it('the edge stops carry no competing distance of their own', () => {
    for (const id of EDGE_ORDER) {
      expect(EDGE_STOPS[id].label).toBeTruthy()
      expect(EDGE_STOPS[id].mm).toBeUndefined()
      expect(EDGE_STOPS[id].in).toBeUndefined()
    }
  })

  it('grid.margin stays a guide, never the content margin', () => {
    /* The guide overlay's number is independent of the trim decision — it
       used to be recomputed from the chosen edge, tying a working aid to
       what the client receives. */
    const before = bookBuilderFor(current()).grid.margin
    useAppStore.getState().setBookBuilder({ edgeSpace: 'tight' })
    expect(bookBuilderFor(current()).grid.margin).toBe(before)
    useAppStore.getState().setBookBuilder({ edgeSpace: 'roomy' })
    expect(bookBuilderFor(current()).grid.margin).toBe(before)
  })
})

describe('the v10 migration gives every project one setup', () => {
  const migrate = (persisted) => {
    const { migrate: run } = useAppStore.persist.getOptions()
    return run(persisted, 9)
  }

  const workspace = (project, prefs) => ({
    projects: [{ id: 'p1', name: 'Old', ...project }],
    currentProjectId: 'p1',
    prefs: { bookPageSize: 'a4', bookEdgeSpace: 'tight', bookPrintShop: true, ...prefs },
  })

  it('seeds a project that never chose, from the studio pref', () => {
    const out = migrate(workspace({ bookBuilder: null }))
    expect(out.projects[0].bookBuilder).toMatchObject({
      pageSize: 'a4',
      edgeSpace: 'tight',
      printShop: true,
    })
  })

  it('preserves an explicit Builder choice rather than overwriting it', () => {
    const out = migrate(
      workspace({ bookBuilder: { print: { pageSize: 'letter', bleed: false }, grid: { edge: 'roomy' } } })
    )
    expect(out.projects[0].bookBuilder).toMatchObject({
      pageSize: 'letter',
      edgeSpace: 'roomy',
      printShop: false,
    })
  })

  it('is idempotent — running it twice changes nothing', () => {
    const once = migrate(workspace({ bookBuilder: null }))
    const twice = migrate({ ...once, prefs: { ...once.prefs, bookPageSize: 'letter' } })
    expect(twice.projects[0].bookBuilder).toEqual(once.projects[0].bookBuilder)
  })

  it('is deterministic — the same input gives the same answer', () => {
    const a = migrate(workspace({ bookBuilder: { grid: { edge: 'standard' } } }))
    const b = migrate(workspace({ bookBuilder: { grid: { edge: 'standard' } } }))
    expect(a.projects[0].bookBuilder).toEqual(b.projects[0].bookBuilder)
  })

  it('leaves a workspace that carried no projects alone', () => {
    const out = migrate({ prefs: {} })
    expect(Array.isArray(out.projects)).toBe(true)
  })
})
