import { describe, expect, it } from 'vitest'
import {
  buildBrandPackSnapshot,
  downloadBrandPackVectorPdf,
} from './exportFiles'
import { resolveBrandFace, characterSetRows } from './brandFonts'

/**
 * The brand book shows the client's REAL letterforms — or says it isn't.
 *
 * The type page used to set every specimen in the book's own Archivo and Lora
 * and merely name the project's faces. The reasoning was that "the book cannot
 * embed a typeface it was never given", and half of it was right: sixty glyphs
 * of Archivo under the client's font name would be a lie in the one document
 * that has to be trusted about type.
 *
 * The other half was an inherited assumption. Every face the app can resolve
 * comes from a closed OFL registry, and the book now embeds those. So there are
 * two behaviours to protect, and the second one is the one that can rot
 * silently:
 *
 *   1. A face the book HOLDS must print in itself. If this regresses the book
 *      still exports, still looks designed, and quietly shows the wrong
 *      alphabet under the right name — the exact failure the old code was
 *      written to avoid.
 *   2. A face the book does NOT hold must get no character set and an explicit
 *      note. Now that some books show the real thing, an unmarked specimen in
 *      the book's own face reads as the real thing too.
 */

const PROJECT = {
  name: 'Harbor & Hearth Co.',
  tagline: 'Brew slow. Bring home.',
  palette: ['#1B3A2F', '#C4A574', '#E8DCC8', '#F7F3EC'],
  colorRoles: { cover: '#1B3A2F', text: '#1B3A2F', accent: '#C4A574', quiet: '#F7F3EC' },
  messagingPromise: 'Something that belongs in your kitchen.',
  detective: { clientName: 'Harbor & Hearth Co.', story: 'A weekend market table.' },
}

async function book(project) {
  const pack = buildBrandPackSnapshot({
    project: { ...PROJECT, ...project },
    tasks: [],
    moodItems: [],
  })
  const res = await downloadBrandPackVectorPdf(pack, null, { returnBlobOnly: true })
  expect(res.ok).toBe(true)
  const bytes = new Uint8Array(await res.blob.arrayBuffer())

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise
  let text = ''
  const runs = []
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    /* Populates commonObjs, which is the only place the REAL font name for a
       text run survives. pdf.js normalises every embedded family down to
       "sans-serif" in the text layer's styles, so without this a test cannot
       tell Plus Jakarta Sans from Archivo — and telling those apart is the
       entire point of this file. */
    await page.getOperatorList()
    const items = (await page.getTextContent()).items
    text += `${items.map((t) => t.str).join(' ')}\n`
    for (const it of items) {
      if (!it.str.trim()) continue
      let font = it.fontName
      try {
        font = page.commonObjs.get(it.fontName)?.name || it.fontName
      } catch {
        /* Unresolvable id: keep the raw name so the assertion fails loudly
           rather than matching nothing. */
      }
      runs.push({ str: it.str, font })
    }
  }
  return {
    bytes,
    runs,
    text: text.replace(/\s+/g, ' '),
    raw: Buffer.from(bytes).toString('latin1'),
    /** The font the run containing `needle` was actually drawn in. */
    fontOf: (needle) => runs.find((r) => r.str.includes(needle))?.font,
  }
}

/**
 * The advance widths the PDF actually carries for one embedded face.
 *
 * Read off the font dictionary rather than the text layer, because pdf.js
 * normalises every embedded family down to "sans-serif" when it extracts text —
 * the text layer genuinely cannot tell Plus Jakarta Sans from Helvetica. The
 * metrics can, and metrics are what prove a real typeface travelled rather than
 * a name.
 */
async function widthsFor(bytes, baseFont) {
  const { PDFDocument, PDFName, PDFArray, PDFNumber, PDFDict } = await import('pdf-lib')
  const doc = await PDFDocument.load(bytes)
  const num = (v) => (v instanceof PDFNumber ? v.asNumber() : null)
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue
    if (String(obj.get(PDFName.of('BaseFont'))) !== `/${baseFont}`) continue
    /* jsPDF embeds a TrueType face as a CID font, so the advances live in the
       descendant's `/W` rather than a flat `/Widths`. `/W` alternates two
       shapes — `c [w …]` for consecutive CIDs and `cFirst cLast w` for a run —
       and both have to be read or a monospaced face collapses to one entry and
       the assertion below passes for the wrong reason. */
    const w = doc.context.lookup(obj.get(PDFName.of('W')))
    if (!(w instanceof PDFArray)) continue
    const items = w.asArray()
    const out = []
    for (let i = 0; i < items.length; ) {
      const next = doc.context.lookup(items[i + 1])
      if (next instanceof PDFArray) {
        next.asArray().forEach((n) => out.push(num(doc.context.lookup(n))))
        i += 2
      } else {
        const first = num(doc.context.lookup(items[i]))
        const last = num(doc.context.lookup(items[i + 1]))
        const width = num(doc.context.lookup(items[i + 2]))
        for (let c = first; c <= last; c += 1) out.push(width)
        i += 3
      }
    }
    return out.filter((n) => typeof n === 'number')
  }
  return null
}

describe('a face the book holds prints in itself', () => {
  it('draws the specimen line with the project typeface, not the book one', async () => {
    const { text, raw, fontOf } = await book({
      typeHeading: 'Plus Jakarta Sans Bold',
      typeBody: 'Plus Jakarta Sans Regular',
    })

    /* THE assertion in this file. Not "the font is somewhere in the document"
       — the specific run of text the client reads as the heading specimen was
       drawn with the specific face the line above it names, at the weight it
       names. Everything else here can pass while the specimen quietly renders
       in Archivo; this cannot. */
    expect(fontOf('The quick brown fox')).toBe('Brandjakarta700')
    expect(fontOf('Body copy should stay calm')).toBe('Brandjakarta400')

    /* And the book's own voice stays the book's own voice. The note is the
       book talking about the typeface, so it must NOT be set in it — a note
       claiming "shown in X itself" that is itself set in X is a page with no
       control sample on it. */
    expect(fontOf('Shown in Plus Jakarta Sans Bold itself')).toMatch(/^Lora/)
    expect(fontOf('Type Family & Scale')).toMatch(/^Archivo/)

    // A name in the font table proves nothing without the outlines behind it.
    expect(raw).toContain('FontFile2')
    expect(text).toContain('Shown in Plus Jakarta Sans Bold itself')
    expect(text).toContain('Shown in Plus Jakarta Sans Regular itself')
    expect(text).not.toMatch(/Shown in this book's own typeface/)
  }, 60000)

  it('prints the full character set in that face, as selectable text', async () => {
    const { text, fontOf } = await book({
      typeHeading: 'Plus Jakarta Sans Bold',
      typeBody: 'Plus Jakarta Sans Regular',
    })
    expect(text).toContain('Character Set')
    for (const row of characterSetRows()) {
      /* Two separate claims per row: the glyphs came out of the client's own
         typeface, and the row survives as text. A character set a client
         cannot select, search or have read aloud is a picture of an alphabet. */
      expect(text).toContain(row)
      expect(fontOf(row)).toBe('Brandjakarta700')
    }
    expect(text).toContain('SIL Open Font License 1.1')
  }, 60000)

  it('carries the real metrics — a monospaced choice embeds equal advance widths', async () => {
    /* The sharpest available proof that the embedded outlines are the typeface
       the page names, and not our own faces wearing its name. Every advance in
       IBM Plex Mono is identical and no other family in the catalog is
       monospaced, so this is a property of the real font rather than a
       restatement of what the build produced. */
    const mono = await book({
      typeHeading: 'IBM Plex Mono Bold',
      typeBody: 'IBM Plex Mono Regular',
    })
    const monoWidths = await widthsFor(mono.bytes, 'Brandplexmono400')
    expect(monoWidths?.length).toBeGreaterThan(20)
    expect(new Set(monoWidths)).toHaveProperty('size', 1)

    // The same measurement on a proportional family must NOT come out flat,
    // or the assertion above would pass on any font at all.
    const prop = await book({
      typeHeading: 'Plus Jakarta Sans Bold',
      typeBody: 'Plus Jakarta Sans Regular',
    })
    const propWidths = await widthsFor(prop.bytes, 'Brandjakarta400')
    expect(propWidths?.length).toBeGreaterThan(20)
    expect(new Set(propWidths).size).toBeGreaterThan(5)

    /* Every printable-ASCII glyph reached the file, in both faces — that is
       what the character set page is, measured rather than assumed. 95 is the
       whole U+0020-U+007E range the build subsets to.
       Comparing the arrays element-wise would prove nothing: jsPDF re-subsets
       per font, so two fonts differ in CID order for reasons that have nothing
       to do with weight. Total advance does carry the weight — Bold is wider
       across the same 95 glyphs — so this catches one weight embedded twice
       under two names, which every other assertion here would let through. */
    const boldWidths = await widthsFor(prop.bytes, 'Brandjakarta700')
    const sum = (a) => a.reduce((n, w) => n + w, 0)
    expect(propWidths).toHaveLength(95)
    expect(boldWidths).toHaveLength(95)
    expect(sum(boldWidths)).toBeGreaterThan(sum(propWidths))
  }, 90000)
})

describe('a face the book cannot hold is never faked', () => {
  it('draws no character set for a typeface it has no file for, and says why', async () => {
    const { text, raw, runs, fontOf } = await book({
      typeHeading: 'Gotham Bold',
      typeBody: 'Gotham Book',
    })
    /* The specimen fell back to the book's own face — which is correct — and
       nothing anywhere in the document was drawn in a brand face, so no glyph
       in this book is claiming to be Gotham. */
    expect(fontOf('The quick brown fox')).toMatch(/^Archivo/)
    expect(runs.filter((r) => /^Brand/.test(r.font))).toHaveLength(0)
    expect(raw).not.toMatch(/\/BaseFont \/Brandgotham/)
    // ...no alphabet was printed in a face that is not Gotham...
    expect(text).not.toContain('Character Set')
    expect(text).not.toContain('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    // ...and the page says which typeface the reader is actually looking at.
    expect(text).toContain("Shown in this book's own typeface, not in Gotham Bold")
    expect(text).toContain('not one the book can carry a license to embed')
  }, 60000)

  it('declines a weight the family does not publish rather than substituting one', async () => {
    /* Instrument Serif ships Regular only. Printing its Regular on a page
       headed "Instrument Serif Bold" is the same lie in miniature, and it is
       the one a lenient label parser makes by accident. */
    const bold = await book({ typeHeading: 'Instrument Serif Bold', typeBody: 'Lato Regular' })
    expect(bold.raw).not.toMatch(/\/BaseFont \/Brandinstrumentserif/)
    expect(bold.text).toContain('Instrument Serif is not published at Bold')

    // The weight it does publish still works, so this is a real distinction
    // and not the family being rejected outright.
    const reg = await book({ typeHeading: 'Instrument Serif Regular', typeBody: 'Lato Regular' })
    expect(reg.raw).toContain('/BaseFont /Brandinstrumentserif400')
    expect(reg.text).toContain('Shown in Instrument Serif Regular itself')
  }, 90000)

  it('shows one alphabet when a single face does both jobs', async () => {
    const { text } = await book({
      typeHeading: 'Fraunces SemiBold',
      typeBody: 'Fraunces SemiBold',
    })
    // Kickers are uppercased and pdfSafeText folds the em dash to a hyphen.
    expect(text).toContain('HEADING & BODY - FRAUNCES SEMIBOLD')
    expect(text.match(/ABCDEFGHIJKLMNOPQRSTUVWXYZ/g)).toHaveLength(1)
  }, 60000)

  it('shows a real specimen for a project that never picked a typeface', async () => {
    /* `buildBrandPackSnapshot` fills Plus Jakarta Sans when the project left
       type blank, so the default is what most books actually print. If that
       default ever moved to a face outside the catalog, every untouched project
       would silently drop back to the book's own letterforms — this is what
       would notice. */
    const { text, raw } = await book({ typeHeading: '', typeBody: '' })
    expect(text).toContain('Type Family & Scale')
    expect(raw).toMatch(/\/BaseFont \/Brand/)
    expect(text).not.toMatch(/Shown in this book's own typeface/)
  }, 60000)
})

describe('resolveBrandFace refuses everything it cannot prove', () => {
  const HELD = { fraunces: [400, 500, 600, 700], 'instrument-serif': [400] }

  it('matches an exact family and weight', () => {
    const r = resolveBrandFace('Fraunces SemiBold', HELD)
    expect(r).toMatchObject({ ok: true, id: 'fraunces', weight: 600, weightLabel: 'SemiBold' })
  })

  it('reads a bare family name as Regular', () => {
    expect(resolveBrandFace('Fraunces', HELD)).toMatchObject({ ok: true, weight: 400 })
  })

  it.each([
    ['Fraunces Black', /Black weight/],
    ['Fraunces Italic', /Italic weight/],
    ['Fraunces ExtraLight', /ExtraLight weight/],
  ])('refuses %s rather than falling back to Regular', (label, reason) => {
    /* `parseLabel` in the catalog maps every unknown suffix to 400, which is
       right for a CSS font-family string and wrong here: it would print
       Fraunces Regular on a page headed "Fraunces Black". */
    const r = resolveBrandFace(label, HELD)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(reason)
  })

  it('refuses a family outside the catalog', () => {
    const r = resolveBrandFace('Gotham Bold', HELD)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/license to embed/)
  })

  it('refuses a weight the family does not publish', () => {
    const r = resolveBrandFace('Instrument Serif Bold', HELD)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/not published at Bold/)
  })

  it('refuses a system font, which has no file to carry', () => {
    const r = resolveBrandFace('System UI Regular', HELD)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/system font/)
  })

  it('blames the build, not the typeface, when no specimen data was generated', () => {
    /* A checkout without src/lib/book/brandFontData/ still exports a book —
       verified by running it — but it used to explain itself by calling Plus
       Jakarta Sans a system font, which is simply false. A wrong reason in the
       document that has to be trusted about type is the same defect as a wrong
       glyph, just cheaper to miss. */
    const r = resolveBrandFace('Plus Jakarta Sans Bold', {})
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/carries no typeface specimens/)
    expect(r.reason).not.toMatch(/system font/)
  })

  it('refuses an empty label', () => {
    expect(resolveBrandFace('', HELD)).toMatchObject({ ok: false })
    expect(resolveBrandFace(null, HELD)).toMatchObject({ ok: false })
    expect(resolveBrandFace('   ', HELD)).toMatchObject({ ok: false })
  })

  it('never returns a face without the pdf family the page would draw with', () => {
    /* A truthy `ok` with no `pdfFamily` would make the page call setFont with
       undefined, and jsPDF resolves an unknown family to its nearest match
       instead of throwing — wrong glyphs, no error, which is this repo's
       signature failure. */
    for (const label of ['Fraunces Bold', 'Fraunces', 'Instrument Serif Regular']) {
      const r = resolveBrandFace(label, HELD)
      expect(r.ok).toBe(true)
      expect(r.pdfFamily).toMatch(/^Brand[A-Za-z0-9]+\d{3}$/)
    }
  })
})

describe('the character set stays inside what the build subsets', () => {
  it('asks for no glyph outside printable ASCII', () => {
    /* The build subsets to U+0020-U+007E. A row reaching past that would print
       a blank box in a client's book — and the page would still look designed.
       These two facts live in different files, so this is what ties them. */
    for (const row of characterSetRows()) {
      for (const ch of row) {
        expect(ch.codePointAt(0)).toBeGreaterThanOrEqual(0x20)
        expect(ch.codePointAt(0)).toBeLessThanOrEqual(0x7e)
      }
    }
    const all = characterSetRows().join('')
    expect(all).toMatch(/ABCDEFGHIJKLMNOPQRSTUVWXYZ/)
    expect(all).toMatch(/abcdefghijklmnopqrstuvwxyz/)
    expect(all).toMatch(/0123456789/)
    expect(new Set(all).size).toBe(all.length) // no glyph shown twice
  })
})
