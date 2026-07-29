import { describe, expect, it } from 'vitest'
import {
  buildBrandPackSnapshot,
  downloadBrandPackVectorPdf,
} from './exportFiles'

/**
 * The brand book must never silently drop something the user typed.
 *
 * Story, Imagery, Usage and Handoff all used to write straight down the page
 * with no room check, so a long answer ran off the bottom edge and simply
 * never appeared in the file the client was sent. Nothing on screen said so,
 * and the PDF looked finished — the failure was invisible from both ends.
 *
 * Each case below ends its answer with a unique sentinel word. If the section
 * paginates correctly the sentinel survives into the text layer; if the fix
 * regresses, the tail is cut and the sentinel is gone. Asserting on the LAST
 * words rather than the first is the whole point — the beginning of an
 * overflowing answer always renders.
 */

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

/** Long enough to overrun a page several times over, ending in `sentinel`. */
function longText(sentinel, sentences = 90) {
  const body = Array.from(
    { length: sentences },
    (_, i) =>
      `Rule ${i + 1}: keep the mark clear of competing artwork and never redraw it by hand.`
  ).join(' ')
  return `${body} ${sentinel}`
}

async function textFor(project) {
  const pack = buildBrandPackSnapshot({ project, tasks: [], moodItems: [] })
  const res = await downloadBrandPackVectorPdf(pack, null, {
    returnBlobOnly: true,
  })
  expect(res.ok).toBe(true)
  return { text: await brandBookText(res.blob), pages: res.pages }
}

describe('brand book keeps long answers instead of dropping them', () => {
  it('keeps the end of a long Story answer', async () => {
    const { text } = await textFor({
      name: 'Overflow Co.',
      detective: { story: longText('ENDOFSTORY') },
    })
    expect(text).toContain('ENDOFSTORY')
  }, 30000)

  it('keeps the end of long Imagery rules', async () => {
    const { text } = await textFor({
      name: 'Overflow Co.',
      imageryStyle: longText('ENDOFIMAGERY'),
    })
    expect(text).toContain('ENDOFIMAGERY')
  }, 30000)

  it('keeps the end of long Usage DO and DONT rules', async () => {
    const { text } = await textFor({
      name: 'Overflow Co.',
      doUse: longText('ENDOFDO'),
      dontUse: longText('ENDOFDONT'),
    })
    expect(text).toContain('ENDOFDO')
    expect(text).toContain('ENDOFDONT')
  }, 30000)

  it('keeps the end of a long Handoff constraint and note', async () => {
    const { text } = await textFor({
      name: 'Overflow Co.',
      handoffNote: longText('ENDOFNOTE'),
      detective: { technical: longText('ENDOFTECHNICAL') },
    })
    expect(text).toContain('ENDOFTECHNICAL')
    expect(text).toContain('ENDOFNOTE')
  }, 30000)

  it('grows the page count instead of truncating', async () => {
    const short = await textFor({ name: 'Overflow Co.', doUse: 'Keep it calm.' })
    const long = await textFor({
      name: 'Overflow Co.',
      doUse: longText('ENDOFDO'),
    })
    expect(long.pages).toBeGreaterThan(short.pages)
  }, 45000)
})
