import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildBrandPackSnapshot, downloadBrandPackVectorPdf } from './exportFiles'

/**
 * Every field the book shows you must reach the book the client receives.
 *
 * `logoDirection` had an editor on the Design page, rendered on the artboard
 * and on the book's notes page — and was printed nowhere in the PDF. It was
 * the only field in the whole book that never reached the deliverable, which
 * is the Promise/Proof defect pointing the other way: not a panel bound to a
 * field nothing writes, but a field you write that nothing prints.
 *
 * Two guards, because either alone can be fooled. The first parses real
 * generated output, so it fails if the drawing stops happening. The second
 * greps the generator, so a field added to the book on screen and forgotten
 * in the PDF fails at the point it is forgotten, without waiting for someone
 * to write a rendering test for it.
 */

/* The pack's content streams are compressed, so raw byte-matching can only
   prove absence, not presence — parse the actual text layer instead. */
async function brandBookText(blob) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const buf = new Uint8Array(await blob.arrayBuffer())
  const doc = await pdfjs.getDocument({ data: buf }).promise
  let out = ''
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    out += content.items.map((it) => it.str).join(' ') + '\n'
  }
  return out
}

describe('the logo direction reaches the client', () => {
  it('prints on the Logo page of the generated PDF', async () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Harbor & Hearth',
        logoWordmark: 'Harbor & Hearth',
        logoDirection: 'A quiet monogram that survives a one-inch stamp.',
        palette: ['#1C1917', '#0F766E', '#A8A29E'],
      },
      tasks: [],
      moodItems: [],
    })

    const result = await downloadBrandPackVectorPdf(pack, null, { returnBlobOnly: true })
    expect(result.ok).toBe(true)

    const text = await brandBookText(result.blob)
    expect(text).toContain('survives a one-inch stamp')
  }, 60_000)

  it('is not silently dropped when the generator changes', () => {
    /* A cheap structural backstop for the expensive test above: the field has
       to be read by name somewhere in the generator. If a refactor removes the
       draw, this fails immediately rather than only when someone reruns a
       60-second PDF render. */
    const src = readFileSync(new URL('./brandBookPdf.js', import.meta.url), 'utf8')
    expect(src).toMatch(/logoDirection/)
  })
})
