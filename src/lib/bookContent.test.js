import { describe, expect, it } from 'vitest'
import { bookContentPages, paginateBlocks, APPENDIX_PAGES } from './bookContent'
import { bookPlan } from './bookDocument'

/**
 * The book's length is derived from what the project holds. These tests are
 * the guard on the repo's first build rule: a page must never appear with
 * invented content, and a page whose answers exist must never be dropped.
 *
 * They derive the expected page list from `bookDocument.js` rather than
 * freezing it. The previous version of this file spelled the old order out,
 * so when the book was rebuilt to the Harbor & Hearth layout an intentional
 * change read as nine regressions — the same trap `processGuide.test.js` and
 * `clientInbox.test.js` fell into, which CLAUDE.md calls out by name.
 *
 * Input is a pack, not a raw project, because that is what the PDF is given.
 */

const ids = (r) => r.pages.map((p) => p.id)
const textOf = (page) =>
  page.blocks
    .flatMap((b) =>
      b.kind === 'group' ? b.rows.map((r) => r.text) : b.kind === 'list' ? b.items : [b.text]
    )
    .join(' ')
const pageNamed = (r, id) => r.pages.find((p) => p.id === id)

/** Every page the plan can produce for this pack, prose or not. */
const plannedIds = (pack) => {
  const plan = bookPlan(pack)
  return [
    ...plan.foundations.map((f) => f.id),
    ...plan.sections.map((s) => s.id),
    ...APPENDIX_PAGES.map((a) => a.id),
  ]
}

describe('bookContentPages', () => {
  it('invents nothing for an empty project', () => {
    /* The failure this guards is the Promise/Proof bug: pages rendering from
       fields nothing ever wrote. Every prose page must be absent.

       Applications is the one page that survives, and not because content was
       invented for it — `touchpointsFor` falls back to four default mocks when
       no surface is picked, which is behaviour the PDF has always had and this
       now matches. It is called out here so the exception stays deliberate
       rather than becoming the crack the rule leaks through. */
    const r = bookContentPages({})
    expect(ids(r)).toEqual(['apps'])
  })

  it('survives a null project', () => {
    expect(() => bookContentPages(null)).not.toThrow()
  })

  it('never loses a page — every one is drawn or accounted for', () => {
    const pack = { voice: 'Warm', doUse: 'Keep it short' }
    const seen = new Set([...ids(bookContentPages(pack)), ...bookContentPages(pack).omitted.map((o) => o.id)])
    plannedIds(pack).forEach((id) => {
      /* Colour and Typography carry no prose — the builder and the PDF draw
         them from the palette and the scale — so they are legitimately in
         neither list. */
      if (id === 'color' || id === 'type') return
      expect(seen.has(id), `${id} is neither drawn nor reported missing`).toBe(true)
    })
  })

  it('every omitted page names what it is waiting for', () => {
    bookContentPages({}).omitted.forEach((o) => {
      expect(o.label).toBeTruthy()
      expect(o.needs).toBeTruthy()
    })
  })

  it('builds a page only from the answer that belongs to it', () => {
    const r = bookContentPages({ detective: { story: 'Born in a shed.' } })
    /* Story is itself a brief field, so it also earns the Agreed brief page —
       the same double appearance the PDF produces, not a leak. */
    expect(ids(r)).toContain('story')
    expect(ids(r)).toContain('brief')
    expect(textOf(pageNamed(r, 'story'))).toContain('Born in a shed.')
  })

  it('falls back to the brief for Story, the way the PDF does', () => {
    const r = bookContentPages({ brief: 'An older project wrote it here.' })
    expect(textOf(pageNamed(r, 'story'))).toContain('older project')
  })

  it('treats whitespace-only answers as absent', () => {
    // "   " is not an answer; a page of one blank line is still a fake page.
    const r = bookContentPages({ voice: '   ', doUse: '\n\t ' })
    expect(ids(r)).not.toContain('voice')
    expect(ids(r)).not.toContain('usage')
  })

  it('carries the chosen direction through as the decision line', () => {
    /* The Harbor & Hearth layout has no Direction page; the choice survives as
       the decision line on Brand Voice, which is where the PDF prints it. */
    const r = bookContentPages({
      directions: [
        { id: 'a', label: 'A', title: 'Quiet', note: 'Lots of air' },
        { id: 'b', label: 'B', title: 'Loud', note: 'High contrast', chosen: true },
      ],
    })
    const voice = textOf(pageNamed(r, 'voice'))
    expect(voice).toContain('Loud')
    expect(voice).not.toContain('Lots of air')
  })

  it('names the mocks the book will actually draw', () => {
    /* The page lists the mocks, not the raw brief answer, so what is on screen
       is what the reader sees in the PDF. */
    const r = bookContentPages({ brandSurfaces: ['website'], detective: {} })
    expect(pageNamed(r, 'apps').blocks[0].items).toEqual(['Website'])
  })

  it('carries the brief through as filled chapters only', () => {
    const r = bookContentPages({ detective: { clientName: 'Sparrow & Co.' } })
    const page = pageNamed(r, 'brief')
    expect(page).toBeTruthy()
    expect(page.blocks.every((b) => b.kind === 'group' && b.rows.length > 0)).toBe(true)
    expect(textOf(page)).toContain('Sparrow & Co.')
  })

  it('orders pages foundations → numbered sections → appendix', () => {
    /* The order is the PDF's, so the two cannot drift into different
       documents. Derived from the plan rather than spelled out. */
    const pack = {
      tagline: 'Warm by design',
      detective: { audience: 'Homeowners', clientName: 'Sparrow' },
      logoDirection: 'A monogram',
      doUse: 'Give it room',
      handoffNote: 'Figma file shared',
    }
    const got = ids(bookContentPages(pack))
    const want = plannedIds(pack).filter((id) => got.includes(id))
    expect(got).toEqual(want)
  })

  it('puts each field on the page that owns it', () => {
    const r = bookContentPages({
      logoDirection: 'A monogram',
      doUse: 'Give it room',
      dontUse: 'Never stretch it',
      handoffNote: 'Figma file shared',
      detective: { toneOfVoice: 'Plain and warm', technical: 'CMYK for print' },
    })
    expect(textOf(pageNamed(r, 'logo'))).toContain('A monogram')
    // Writing folded into Brand Voice when the book moved to Harbor & Hearth.
    expect(textOf(pageNamed(r, 'voice'))).toContain('Plain and warm')
    const usage = textOf(pageNamed(r, 'usage'))
    expect(usage).toContain('Give it room')
    expect(usage).toContain('Never stretch it')
    const handoff = textOf(pageNamed(r, 'handoff'))
    expect(handoff).toContain('Figma file shared')
    expect(handoff).toContain('CMYK for print')
  })
})

describe('paginateBlocks', () => {
  const group = (title, n, len = 40) => ({
    kind: 'group',
    title,
    rows: Array.from({ length: n }, (_, i) => ({ label: `Q${i}`, text: 'x'.repeat(len) })),
  })

  it('never drops a block', () => {
    /* The whole reason pagination exists: .bbb-page is overflow:hidden, so a
       block that does not make it onto a page is gone from the book. */
    const blocks = [group('01', 4), group('02', 4), group('03', 4)]
    const rowsIn = blocks.reduce((n, b) => n + b.rows.length, 0)
    const rowsOut = paginateBlocks(blocks)
      .flat()
      .reduce((n, b) => n + b.rows.length, 0)
    expect(rowsOut).toBe(rowsIn)
  })

  it('starts a new page rather than piling a second group onto a full one', () => {
    /* The bug this caught: only `rows.length` gated the split, so each new
       group's FIRST row was appended to whatever page was open however full.
       Three chapters landed on one page, each adding a title, and it rendered
       at half again the page height. */
    /* Each group is small enough to fit alone but two do not fit together —
       the only shape that exercises the break BEFORE a group. Groups big
       enough to split internally pass either way, which is why the first
       version of this test did not catch the bug it was written for. */
    const pages = paginateBlocks([group('01', 2, 10), group('02', 2, 10)])
    expect(pages).toHaveLength(2)
    pages.forEach((blocks) => expect(blocks).toHaveLength(1))
    expect(pages[0][0].title).toBe('01')
    expect(pages[1][0].title).toBe('02')
    // Neither group was broken up, so neither is a continuation.
    expect(pages[1][0].title).not.toContain('cont.')
  })

  it('marks continuation pages so a split chapter still says what it is', () => {
    const pages = paginateBlocks([group('01 · Your details', 8)])
    expect(pages.length).toBeGreaterThan(1)
    expect(pages[0][0].title).toBe('01 · Your details')
    expect(pages[1][0].title).toContain('cont.')
  })

  it('keeps a single oversized row whole rather than cutting an answer', () => {
    // Growing the page is the safety net; splitting mid-sentence is not.
    const pages = paginateBlocks([group('01', 1, 4000)])
    expect(pages).toHaveLength(1)
    expect(pages[0][0].rows[0].text).toHaveLength(4000)
  })

  it('gives an empty section one empty page rather than none', () => {
    expect(paginateBlocks([])).toEqual([[]])
  })
})
