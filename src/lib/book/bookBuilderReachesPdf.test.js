/**
 * The Builder's controls must reach the exported PDF.
 *
 * Page background was fixed once, and the same defect was left standing in
 * four more control groups: type size, type colour, grid guides and running
 * elements all repainted the book on screen and were dropped on export. The
 * panel looked like it styled the deliverable and did not — a control whose
 * effect you cannot see in the file the client receives is UI in front of
 * nothing, however real the preview looks.
 *
 * These read the generated PDF back rather than asserting on the settings
 * object, because "the pack carries it" is exactly the step that was true
 * before and still produced a file that ignored it.
 *
 * Font family and weight are deliberately not tested here: the Builder's
 * pickers write through to `project.typeHeading` / `typeBody`, which the
 * book prints on its Type page, so they were wired before any of this.
 */
import { describe, it, expect, vi } from 'vitest'

const written = []
vi.mock('./exportFiles', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    downloadBlob: (blob, filename) => {
      written.push({ blob, filename })
      return { ok: true, filename }
    },
  }
})

const { downloadBrandPackVectorPdf } = await import('./brandBookPdf')
const {
  resolvedGrid,
  resolvedRunning,
  resolvedTypeColors,
  resolvedTypeScale,
  BOOK_TYPE_BASE,
} = await import('./bookBuilder')

const PROJECT = {
  name: 'Northwind Coffee',
  palette: ['#1B3A2F', '#C9A227', '#FAFAF9', '#8A8A8A'],
  paletteTokens: [
    { id: 't1', name: 'Primary' },
    { id: 't2', name: 'Accent' },
    { id: 't3', name: 'Paper' },
    { id: 't4', name: 'Ink' },
  ],
  tagline: 'Slow mornings.',
  voice: 'Warm, unhurried, specific.',
  brief: 'A neighbourhood roaster that opens before dawn.',
}

function packFor(project) {
  return {
    projectName: project.name,
    palette: project.palette,
    tagline: project.tagline,
    voice: project.voice,
    brief: project.brief,
    exportedAt: '2026-07-31T09:00:00.000Z',
    bookTypeScale: resolvedTypeScale(project),
    bookTypeColor: resolvedTypeColors(project),
    bookGrid: resolvedGrid(project),
    bookRunning: resolvedRunning(project),
  }
}

async function renderText(project) {
  written.length = 0
  const res = await downloadBrandPackVectorPdf(packFor(project), null, {
    returnBlobOnly: true,
  })
  const blob = res?.blob || written[0]?.blob
  expect(blob, 'no PDF was produced').toBeTruthy()
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
  }).promise
  let out = ''
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    out += content.items.map((it) => it.str).join(' ') + '\n'
  }
  return out
}

describe('resolvers hand the generator finished answers', () => {
  it('type size arrives as a ratio, not an absolute', () => {
    const doubled = resolvedTypeScale({
      bookBuilder: { type: { headlineSize: BOOK_TYPE_BASE.headline * 2 } },
    })
    expect(doubled.headline).toBe(2)
    // Clamped — past double the layout stops holding its own line breaks.
    const absurd = resolvedTypeScale({
      bookBuilder: { type: { headlineSize: 400 } },
    })
    expect(absurd.headline).toBe(2)
    // Untouched settings resolve to 1, so the design renders as drawn.
    expect(resolvedTypeScale({}).headline).toBe(1)
  })

  it('"auto" type colour stays null so the book keeps deriving it', () => {
    const colors = resolvedTypeColors({
      ...PROJECT,
      bookBuilder: { typeColor: { headline: 't2', subhead: 'auto' } },
    })
    expect(colors.headline).toBe('#C9A227')
    // null, not a frozen hex: auto must survive to the generator or a dark
    // page repaints and leaves unreadable type behind.
    expect(colors.subhead).toBeNull()
  })

  it('running text falls back to the project name, as the hint promises', () => {
    expect(resolvedRunning({ name: 'Northwind Coffee' }).text).toBe(
      'Northwind Coffee'
    )
    expect(
      resolvedRunning({ name: 'Northwind Coffee', bookBuilder: { running: { text: 'Brand Guide' } } }).text
    ).toBe('Brand Guide')
  })

  it('grid values are clamped to something drawable', () => {
    const g = resolvedGrid({
      bookBuilder: { grid: { columns: 999, rows: -4, gutter: 80, margin: 90 } },
    })
    expect(g.columns).toBeLessThanOrEqual(24)
    expect(g.rows).toBeGreaterThanOrEqual(1)
    expect(g.gutter).toBeLessThanOrEqual(20)
    expect(g.margin).toBeLessThanOrEqual(30)
  })
})

describe('the exported PDF honours running elements', () => {
  it('prints the running header when it is on', async () => {
    const text = await renderText({
      ...PROJECT,
      bookBuilder: { running: { show: true, text: 'BRAND GUIDE 2026' } },
    })
    expect(text).toContain('BRAND GUIDE 2026')
  })

  it('omits the header entirely when it is off', async () => {
    const text = await renderText({
      ...PROJECT,
      bookBuilder: { running: { show: false, text: 'BRAND GUIDE 2026' } },
    })
    expect(text).not.toContain('BRAND GUIDE 2026')
  })

  it('drops page numbers when they are switched off', async () => {
    /* Zero-padded "NN / NN" with single spaces — the footer's exact shape.
       A looser pattern also matches the cover's date (7/31/2026) and the
       divider numerals ("02 /  Logo System"), which would make this pass
       whether or not the control worked. */
    const FOOTER_NUMBERS = /\b\d{2} \/ \d{2}\b/

    const on = await renderText({
      ...PROJECT,
      bookBuilder: { running: { showPageNumbers: true } },
    })
    expect(on).toMatch(FOOTER_NUMBERS)

    const off = await renderText({
      ...PROJECT,
      bookBuilder: { running: { showPageNumbers: false } },
    })
    expect(off).not.toMatch(FOOTER_NUMBERS)
  })

  it('uses the Builder footer text when one is given', async () => {
    const text = await renderText({
      ...PROJECT,
      bookBuilder: {
        running: { showFooter: true, footerText: 'Confidential draft' },
      },
    })
    expect(text).toContain('Confidential draft')
  })
})
