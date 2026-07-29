import { describe, expect, it } from 'vitest'
import { bookContentPages, paginateBlocks, BOOK_SECTIONS } from './bookContent'

/**
 * The book's length is derived from what the project holds. These tests are
 * the guard on the repo's first build rule: a page must never appear with
 * invented content, and a page whose answers exist must never be dropped.
 */

const ids = (r) => r.pages.map((p) => p.id)
const textOf = (page) =>
  page.blocks
    .flatMap((b) => (b.kind === 'group' ? b.rows.map((r) => r.text) : b.kind === 'list' ? b.items : [b.text]))
    .join(' ')

describe('bookContentPages', () => {
  it('returns no pages at all for an empty project', () => {
    /* The failure this guards is the Promise/Proof bug: pages rendering from
       fields nothing ever wrote. An empty project earns an empty book. */
    const r = bookContentPages({})
    expect(r.pages).toEqual([])
    expect(r.omitted).toHaveLength(BOOK_SECTIONS.length)
  })

  it('survives a null project', () => {
    expect(bookContentPages(null).pages).toEqual([])
  })

  it('every section is either included or accounted for, never lost', () => {
    const r = bookContentPages({ voice: 'Warm', doUse: 'Keep it short' })
    expect(r.pages.length + r.omitted.length).toBe(BOOK_SECTIONS.length)
    const seen = [...ids(r), ...r.omitted.map((o) => o.id)].sort()
    expect(seen).toEqual(BOOK_SECTIONS.map((s) => s.id).sort())
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
    expect(ids(r)).toEqual(['story', 'brief'])
    expect(textOf(r.pages[0])).toContain('Born in a shed.')
  })

  it('falls back to the brief for Story, the way the PDF does', () => {
    const r = bookContentPages({ brief: 'An older project wrote it here.' })
    expect(ids(r)).toContain('story')
    expect(textOf(r.pages.find((p) => p.id === 'story'))).toContain('older project')
  })

  it('treats whitespace-only answers as absent', () => {
    // "   " is not an answer; a page of one blank line is still a fake page.
    const r = bookContentPages({ voice: '   ', doUse: '\n\t ' })
    expect(r.pages).toEqual([])
  })

  it('shows the chosen direction, and the routes on the table before one is', () => {
    const two = [
      { id: 'a', label: 'A', title: 'Quiet', note: 'Lots of air' },
      { id: 'b', label: 'B', title: 'Loud', note: 'High contrast' },
    ]
    expect(textOf(bookContentPages({ directions: two }).pages[0])).toContain('High contrast')
    const picked = bookContentPages({
      directions: [two[0], { ...two[1], chosen: true }],
    })
    const t = textOf(picked.pages[0])
    expect(t).toContain('High contrast')
    expect(t).not.toContain('Lots of air')
  })

  it('drops direction rows that are entirely blank', () => {
    const r = bookContentPages({ directions: [{ id: 'a', label: 'A' }] })
    expect(ids(r)).not.toContain('direction')
  })

  it('lists only the surfaces actually picked', () => {
    const r = bookContentPages({ detective: { brandSurfaces: ['Website', '', '  ', 'Packaging'] } })
    const page = r.pages.find((p) => p.id === 'applications')
    expect(page.blocks[0].items).toEqual(['Website', 'Packaging'])
  })

  it('carries the brief through as filled chapters only', () => {
    const r = bookContentPages({ detective: { clientName: 'Sparrow & Co.' } })
    const page = r.pages.find((p) => p.id === 'brief')
    expect(page).toBeTruthy()
    expect(page.blocks.every((b) => b.kind === 'group' && b.rows.length > 0)).toBe(true)
    expect(textOf(page)).toContain('Sparrow & Co.')
  })

  it('keeps the PDF section order', () => {
    /* Same order as brandBookPdf.js, so the book on screen and the exported
       PDF cannot drift into two different documents. */
    expect(BOOK_SECTIONS.map((s) => s.id)).toEqual([
      'story', 'direction', 'brief', 'logo', 'writing', 'applications', 'usage', 'handoff',
    ])
  })

  it('puts each field on the page that owns it', () => {
    const r = bookContentPages({
      logoDirection: 'A monogram',
      doUse: 'Give it room',
      dontUse: 'Never stretch it',
      handoffNote: 'Figma file shared',
      detective: { toneOfVoice: 'Plain and warm', technical: 'CMYK for print' },
    })
    expect(textOf(r.pages.find((p) => p.id === 'logo'))).toContain('A monogram')
    expect(textOf(r.pages.find((p) => p.id === 'writing'))).toContain('Plain and warm')
    const usage = textOf(r.pages.find((p) => p.id === 'usage'))
    expect(usage).toContain('Give it room')
    expect(usage).toContain('Never stretch it')
    const handoff = textOf(r.pages.find((p) => p.id === 'handoff'))
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
