import { describe, expect, it } from 'vitest'
import {
  BOOK_PAGE_SIZES,
  BOOK_EDGE_SPACE,
  DEFAULT_BOOK_SETUP,
  BLEED_PT,
  resolveBookSetup,
  bookSetupSummary,
} from './brandBookSetup'
import {
  buildBrandPackSnapshot,
  downloadBrandPackVectorPdf,
} from './exportFiles'

/**
 * Every one of the three page-setup controls must actually move the output.
 *
 * A control that renders but changes nothing is the failure mode this repo
 * calls out by name — the brand book showed Promise/Proof tiles for months
 * reading a field nothing ever wrote. So each of these asserts on the real
 * generated PDF's geometry, not on the settings object.
 */

async function pageBoxes(setup) {
  const pack = buildBrandPackSnapshot({
    project: { name: 'Setup Co.', tagline: 'A tagline.' },
    tasks: [],
    moodItems: [],
  })
  const res = await downloadBrandPackVectorPdf(pack, null, {
    returnBlobOnly: true,
    book: setup,
  })
  expect(res.ok).toBe(true)
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.load(await res.blob.arrayBuffer())
  return doc.getPages().map((p) => p.getSize())
}

describe('resolveBookSetup', () => {
  it('defaults to the geometry the book has always used', () => {
    const r = resolveBookSetup(DEFAULT_BOOK_SETUP)
    expect(r.pageW).toBe(612)
    expect(r.pageH).toBe(792)
    expect(r.margin).toBe(40)
    expect(r.bleed).toBe(0)
    expect(r.cropMarks).toBe(false)
  })

  it('falls back to the default for an unknown id rather than throwing', () => {
    const r = resolveBookSetup({ pageSize: 'tabloid', edgeSpace: 'huge' })
    expect(r.pageW).toBe(612)
    expect(r.margin).toBe(40)
  })

  it('keeps edge space measured from the trim line when bleeding', () => {
    const plain = resolveBookSetup({ edgeSpace: 'standard' })
    const bled = resolveBookSetup({ edgeSpace: 'standard', printShop: true })
    // Content stays the same distance from the trim edge, not the sheet edge.
    expect(bled.margin - bled.bleed).toBe(plain.margin)
    expect(bled.pageW).toBe(plain.pageW + BLEED_PT * 2)
  })

  it('summarises the setup as readable state', () => {
    expect(bookSetupSummary(DEFAULT_BOOK_SETUP)).toBe('Letter · standard edges')
    expect(bookSetupSummary({ pageSize: 'a4', printShop: true })).toContain(
      'A4'
    )
    expect(bookSetupSummary({ printShop: true })).toContain('crop marks')
  })
})

describe('each control changes the generated PDF', () => {
  it('page size changes the real page dimensions', async () => {
    const [letter] = await pageBoxes({ pageSize: 'letter' })
    const [a4] = await pageBoxes({ pageSize: 'a4' })
    expect(Math.round(letter.width)).toBe(612)
    expect(Math.round(a4.width)).toBe(595)
    expect(Math.round(a4.height)).toBe(842)
  }, 60000)

  it('the print-shop toggle enlarges the sheet by the bleed on all sides', async () => {
    const [plain] = await pageBoxes({ pageSize: 'letter' })
    const [bled] = await pageBoxes({ pageSize: 'letter', printShop: true })
    expect(bled.width - plain.width).toBe(BLEED_PT * 2)
    expect(bled.height - plain.height).toBe(BLEED_PT * 2)
  }, 60000)

  it('edge space moves where text actually sits on the page', async () => {
    /* Asserted on the rendered text's own x-coordinate, not on page count.
       Page count is a weak proxy — all three settings happen to produce the
       same number of pages for typical content, so a count assertion passes
       whether or not the setting ever reached the layout. Reading the
       coordinate back out of the PDF is the only proof that the control is
       real rather than decorative. */
    const leftEdge = async (book) => {
      const pack = buildBrandPackSnapshot({
        project: { name: 'Setup Co.', tagline: 'A tagline.' },
        tasks: [],
        moodItems: [],
      })
      const res = await downloadBrandPackVectorPdf(pack, null, {
        returnBlobOnly: true,
        book,
      })
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(await res.blob.arrayBuffer()),
      }).promise
      const content = await (await doc.getPage(2)).getTextContent()
      const xs = content.items
        .map((i) => i.transform[4])
        .filter((n) => Number.isFinite(n))
      return Math.round(Math.min(...xs))
    }

    expect(await leftEdge({ edgeSpace: 'roomy' })).toBe(56)
    expect(await leftEdge({ edgeSpace: 'standard' })).toBe(40)
    expect(await leftEdge({ edgeSpace: 'tight' })).toBe(28)
    // With bleed the sheet grows, so content sits 40pt from the trim line —
    // which is BLEED_PT further in from the sheet edge, not 40 from the sheet.
    expect(await leftEdge({ edgeSpace: 'standard', printShop: true })).toBe(
      40 + BLEED_PT
    )
  }, 90000)

  it('reports a page list that matches the file, page for page', async () => {
    /* The preview labels each page from this list. It must come back from the
       generator rather than being written out in the component: which pages
       exist depends on what the client filled in — a thin pack is 7 pages, a
       full one 16+ — so a hand-written list would be wrong for nearly every
       project, and wrong without saying so. */
    const thin = buildBrandPackSnapshot({
      project: { name: 'Setup Co.' },
      tasks: [],
      moodItems: [],
    })
    const rich = buildBrandPackSnapshot({
      project: {
        name: 'Setup Co.',
        tagline: 'A tagline.',
        doUse: 'Keep it calm.',
        dontUse: 'No stretching.',
        imageryStyle: 'Warm, unposed.',
        detective: { story: 'It started in a kitchen.', goal: 'Grow' },
      },
      tasks: [],
      moodItems: [],
    })

    for (const pack of [thin, rich]) {
      const res = await downloadBrandPackVectorPdf(pack, null, {
        returnBlobOnly: true,
      })
      expect(res.pageTitles).toHaveLength(res.pages)
      expect(res.pageTitles[0]).toBe('Cover')
      expect(res.pageTitles.every((t) => typeof t === 'string' && t)).toBe(true)
    }

    // The richer pack genuinely adds sections, so the two lists differ —
    // proving the list tracks content rather than being a fixed sequence.
    const a = await downloadBrandPackVectorPdf(thin, null, {
      returnBlobOnly: true,
    })
    const b = await downloadBrandPackVectorPdf(rich, null, {
      returnBlobOnly: true,
    })
    expect(b.pageTitles.length).toBeGreaterThan(a.pageTitles.length)
    expect(b.pageTitles).toContain('Story')
    expect(b.pageTitles).toContain('Usage')
    expect(a.pageTitles).not.toContain('Story')
  }, 90000)

  it('declares every option the UI offers', () => {
    // The picker renders straight from these lists; an id here that the
    // resolver cannot map would be a control offering an impossible choice.
    BOOK_PAGE_SIZES.forEach((s) => {
      expect(resolveBookSetup({ pageSize: s.id }).size.id).toBe(s.id)
    })
    BOOK_EDGE_SPACE.forEach((e) => {
      expect(resolveBookSetup({ edgeSpace: e.id }).edge.id).toBe(e.id)
    })
  })
})
