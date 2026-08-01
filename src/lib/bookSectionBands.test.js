import { describe, expect, it } from 'vitest'
import {
  buildBrandPackSnapshot,
  downloadBrandPackVectorPdf,
} from './exportFiles'

/**
 * Numbered sections open with a header BAND on their content page, not a
 * separate full-bleed divider PAGE.
 *
 * The divider spread was mostly empty and every section spent a whole page on
 * one, so a short book carried five near-blank pages before any content — and
 * length is the first thing a client feels about a brand book. The band keeps
 * the two things the divider was actually for (the ink/gold alternation and
 * the "NN / Section" landmark) and drops the empty page under it.
 *
 * The regression this guards: a divider drifting back into its own page. If a
 * section's identity band and that section's content title stop sharing a
 * sheet, the band has become a page again.
 */
async function pagesText(project) {
  const pack = buildBrandPackSnapshot({ project, tasks: [], moodItems: [] })
  const res = await downloadBrandPackVectorPdf(pack, null, {
    returnBlobOnly: true,
  })
  expect(res.ok).toBe(true)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await res.blob.arrayBuffer()),
  }).promise
  const pages = []
  for (let i = 1; i <= doc.numPages; i += 1) {
    const c = await (await doc.getPage(i)).getTextContent()
    pages.push(c.items.map((it) => it.str).join(' ').replace(/\s+/g, ' '))
  }
  return { pages, count: res.pages }
}

const PROJECT = {
  name: 'Backline Trade',
  palette: ['#1B3A2F', '#C4A574', '#E8DCC8', '#F7F3EC'],
  colorRoles: {
    cover: '#1B3A2F',
    text: '#1B3A2F',
    accent: '#C4A574',
    quiet: '#F7F3EC',
  },
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
}

describe('section openers are bands, not pages', () => {
  it('the section identity and its content share one page', async () => {
    const { pages } = await pagesText(PROJECT)
    // The Colour section's band identity and its content title (roles & usage)
    // must land on the same sheet. A divider page would split them in two.
    const bandPage = pages.findIndex((t) => /Color\s+Palette/i.test(t))
    expect(bandPage, 'the colour section identity should appear').toBeGreaterThan(-1)
    expect(
      pages[bandPage],
      'the band and the section content must be on the same page'
    ).toMatch(/Roles\s*&?\s*Usage|Roles/i)
  }, 60000)

  it('no page is just a section divider (identity with no content)', async () => {
    const { pages } = await pagesText(PROJECT)
    // The type section always has a scale; its identity band must not sit on a
    // page by itself.
    const typePage = pages.find((t) => /Typograph/i.test(t))
    expect(typePage).toBeTruthy()
    // The type page carries the family names / specimen — never the band alone.
    expect(typePage).toMatch(/Heading|Body|Type Family|Scale/i)
  }, 60000)
})
