import { describe, expect, it } from 'vitest'
import {
  buildBrandPackSnapshot,
  downloadBrandPackVectorPdf,
} from './exportFiles'

/**
 * Two ways the book's typography can break without looking broken.
 *
 * Both are the failure mode this repo keeps naming: the PDF still generates,
 * the preview still renders something, and nothing anywhere says the
 * deliverable is wrong.
 */

const PROJECT = {
  name: 'Harbor & Hearth Co.',
  tagline: 'Brew slow. Bring home.',
  palette: ['#1B3A2F', '#C4A574', '#E8DCC8', '#F7F3EC'],
  colorRoles: {
    cover: '#1B3A2F',
    text: '#1B3A2F',
    accent: '#C4A574',
    quiet: '#F7F3EC',
  },
  messagingPromise: 'Something that belongs in your kitchen.',
  detective: {
    clientName: 'Harbor & Hearth Co.',
    story: 'It started as a weekend market table.',
    brandSurfaces: ['print', 'packaging'],
  },
}

async function book() {
  const pack = buildBrandPackSnapshot({
    project: PROJECT,
    tasks: [],
    moodItems: [],
  })
  const res = await downloadBrandPackVectorPdf(pack, null, {
    returnBlobOnly: true,
  })
  expect(res.ok).toBe(true)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(await res.blob.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const pages = []
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    pages.push(await page.getTextContent())
  }
  return pages
}

describe('the brand book is actually set in its own typefaces', () => {
  it('embeds Archivo and Lora rather than falling back to the base-14', async () => {
    /* `registerBookFonts` swallows a failed import on purpose — a book that
       refuses to export because a chunk didn't fetch is worse than one that
       exports in Helvetica. The cost of that choice is that the fallback is
       silent, so this is the only thing standing between a broken font chunk
       and every client getting a book in the wrong face.
       Asserted on the file's own font dictionaries: pdf.js normalises every
       embedded family down to "sans-serif" in its text layer, so the text
       layer cannot tell Archivo from Helvetica. */
    const pack = buildBrandPackSnapshot({
      project: PROJECT,
      tasks: [],
      moodItems: [],
    })
    const res = await downloadBrandPackVectorPdf(pack, null, {
      returnBlobOnly: true,
    })
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.load(await res.blob.arrayBuffer())
    const src = doc.context
      .enumerateIndirectObjects()
      .map(([, obj]) => String(obj))
      .join('\n')

    for (const face of [
      'ArchivoBold',
      'ArchivoExtraBold',
      'ArchivoBlack',
      'LoraRegular',
      'LoraSemiBold',
      'LoraItalic',
    ]) {
      expect(src, `${face} missing from the file's fonts`).toContain(face)
    }
    // A name in the font table proves nothing on its own — the outlines have
    // to have travelled with it.
    expect(src).toContain('FontFile2')
  }, 60000)

  it('keeps letter-spaced labels readable as words in the text layer', async () => {
    /* The design tracks its kickers at .16em. Past about .102em a PDF reader
       can no longer tell tracking from a space, so "BUSINESS CARD" extracts
       as "B U S I N E S S  C A R D" — the page looks right and the document
       is unsearchable, uncopyable, and read out letter by letter by a screen
       reader. Tracking is capped just under that threshold; this is what says
       so if it ever creeps back up. */
    const text = (await book())
      .map((c) => c.items.map((i) => i.str).join(' '))
      .join('\n')

    // Kickers, a divider, and a page-head — the four places tracking is used.
    expect(text).toMatch(/VISUAL IDENTITY SYSTEM|Visual Identity System/)
    expect(text).toMatch(/FOUNDATIONS/)
    expect(text).toMatch(/BUSINESS CARD/)
    // The giveaway: a single-letter run with spaces between every character.
    expect(text).not.toMatch(/\b[A-Z](?: [A-Z]){4,}\b/)
  }, 60000)
})

/**
 * The pairing rationale (typeWhy) must reach the type page it explains.
 *
 * It was a write-only field for its whole life — an editor on the Identity
 * page whose value reached no artifact of any kind, the canonical "UI in front
 * of nothing" the build rule bans. Resolved 2026-08-01 by printing it. This is
 * the observed proof, not the source-grep: the book is generated and the
 * reason is read back out of its text layer, and — the half that actually
 * mattered — a blank one leaves nothing behind, so an unused note never prints
 * an empty "Why these faces" heading into a client's deliverable.
 */
async function bookText(project) {
  const pack = buildBrandPackSnapshot({ project, tasks: [], moodItems: [] })
  const res = await downloadBrandPackVectorPdf(pack, null, {
    returnBlobOnly: true,
  })
  expect(res.ok).toBe(true)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(await res.blob.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    text += `${(await page.getTextContent()).items.map((it) => it.str).join(' ')}\n`
  }
  return text.replace(/\s+/g, ' ')
}

describe('the type-pairing rationale reaches the book', () => {
  const RATIONALE =
    'Grotesque headline for authority; humanist body to keep it warm.'

  it('prints the reason on the type page when one was given', async () => {
    const text = await bookText({ ...PROJECT, typeWhy: RATIONALE })
    expect(text).toMatch(/Why these faces/i)
    expect(text).toContain(RATIONALE)
  }, 60000)

  it('omits it entirely when blank — no empty heading in the deliverable', async () => {
    const text = await bookText({ ...PROJECT, typeWhy: '' })
    expect(text).not.toMatch(/Why these faces/i)
  }, 60000)
})
