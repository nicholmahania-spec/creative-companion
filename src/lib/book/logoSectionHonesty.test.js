import { describe, expect, it } from 'vitest'
import { buildBrandPackSnapshot, downloadBrandPackVectorPdf } from './exportFiles'

/**
 * The book must not measure a mark that does not exist.
 *
 * With no artwork stored, `drawMark` falls through to a monogram built from
 * the project name. A real export therefore printed, for a project with no
 * logo: four lockups, a clearspace diagram with four X modules, a four-step
 * minimum-size ladder, "Never below: 24px digital · 0.5in print", and four
 * misuse panels — an entire page of specification for artwork nobody had made.
 *
 * That is not a cosmetic problem. A wide horizontal lockup and a compact icon
 * do not share a minimum size, so a rule derived from a stand-in cannot be
 * correct, and the client reads it as a promise they will later be told was
 * wrong. `journey.js` has declared the bar for this stop all along — "a mark
 * or wordmark, plus words or colour that feel real" — and nothing at export
 * ever read it.
 *
 * The lockups stay. A wordmark set in type is a real thing to show. The
 * geometry does not.
 */
/* Read back through pdf.js, not the raw bytes: jsPDF compresses its content
   streams, so a byte scan finds nothing and would pass whatever we drew. */
const pdfText = async (pack) => {
  const r = await downloadBrandPackVectorPdf(pack, null, { returnBlobOnly: true })
  expect(r?.blob, 'no PDF was produced').toBeTruthy()
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(await r.blob.arrayBuffer())
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  let out = ''
  for (let i = 1; i <= doc.numPages; i += 1) {
    const tc = await (await doc.getPage(i)).getTextContent()
    out += `${tc.items.map((x) => x.str).join(' ')}\n`
  }
  return out.replace(/\s+/g, ' ')
}

const project = (over = {}) => ({
  name: 'My project',
  palette: ['#1C1917', '#F3EBDD'],
  typeHeading: 'Archivo Bold',
  typeBody: 'Lora Regular',
  detective: {},
  ...over,
})

// A 1x1 PNG — enough to be real artwork.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('the logo section only specifies a mark that exists', () => {
  it('drops the geometry and says why when there is no artwork', async () => {
    const pack = buildBrandPackSnapshot({ project: project() })
    const text = await pdfText(pack)

    expect(text).toContain('The mark is not in the system yet')
    // The three blocks that measure the mark must be absent.
    expect(text).not.toContain('MINIMUM SIZE')
    expect(text).not.toContain('Never below')
    expect(text).not.toContain('Never stretch or squash')
  }, 60_000)

  it('keeps every one of them once artwork is stored', async () => {
    const pack = buildBrandPackSnapshot({ project: project({ logoImage: PNG }) })
    const text = await pdfText(pack)

    expect(text).toContain('MINIMUM SIZE')
    expect(text).toContain('Never below')
    expect(text).toContain('Never stretch or squash')
    expect(text).not.toContain('The mark is not in the system yet')
  }, 60_000)

  it('says on the cover what the book is, and only when it is not finished', async () => {
    const thin = await pdfText(buildBrandPackSnapshot({ project: project() }))
    expect(thin).toContain('Working document')

    const real = await pdfText(
      buildBrandPackSnapshot({ project: project({ logoImage: PNG }) })
    )
    expect(real).not.toContain('Working document')
  }, 60_000)
})
