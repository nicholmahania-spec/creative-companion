import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import {
  bookPageRatio,
  composeSectionOpenPage,
  createBrowserMeasureContext,
} from './bookPageDriver'
import PositionedPageView from '../../../components/book/PositionedPageView'

/**
 * PHASE 10B — ONE COMPOSITOR, TWO RENDERERS.
 *
 * The PDF has composed its pages through this boundary since 10A. These tests
 * are the other half: that a second surface can compose the same page from the
 * same templates with the same ruler, and that the thing which draws it cannot
 * make a layout decision of its own.
 */

const PACK = {
  projectName: 'Northwind Coffee',
  palette: ['#1C1917', '#0F766E', '#A8A29E', '#F5F5F4'],
  colorRoles: { text: '#1C1917', accent: '#0F766E', quiet: '#F5F5F4' },
}
const SECTION = { id: 'color', num: '03', divider: ['Color', 'Palette'], page: 'Roles & Usage' }
const LETTER = { pageSize: 'letter', edgeSpace: 'standard', printShop: false }
const A4 = { pageSize: 'a4', edgeSpace: 'standard', printShop: false }

const ctx = (setup = LETTER) => createBrowserMeasureContext(PACK, setup)

describe('the driver composes a real page', () => {
  it('returns a PositionedPage the renderer can consume', async () => {
    const page = composeSectionOpenPage(PACK, SECTION, await ctx())
    expect(page.pageId).toBe('section-open:color')
    expect(page.regions).toHaveLength(1)
    expect(page.size).toEqual({ w: 612, h: 792 })
    expect(page.boxes.length).toBeGreaterThan(0)
    /* Flattened draw list matches the regions it came from — a renderer that
       reads only `boxes` sees the same page as one that walks regions. */
    expect(page.boxes).toHaveLength(page.regions[0].boxes.length)
  })

  it('composes through the canonical section-open template', async () => {
    const page = composeSectionOpenPage(PACK, SECTION, await ctx())
    /* These ids come from `sectionOpen` and `headingBlock`. If the driver ever
       grew its own layout, this ordering is what would change first. */
    expect(page.boxes.map((b) => b.id)).toEqual([
      'band', 'sectionNumber', 'sectionTitle', 'pageTitle', 'rule',
    ])
    expect(page.boxes.find((b) => b.id === 'sectionNumber').lines).toEqual(['03 /'])
    expect(page.boxes.find((b) => b.id === 'sectionTitle').lines).toEqual(['Color Palette'])
    expect(page.boxes.find((b) => b.id === 'pageTitle').lines).toEqual(['Roles & Usage'])
  })

  it('hands on a cursor for the content beneath it', async () => {
    const page = composeSectionOpenPage(PACK, SECTION, await ctx())
    const band = page.boxes.find((b) => b.id === 'band')
    /* The same number the PDF adopts after drawing this band. The Builder
       reads it rather than guessing where the page's own content begins. */
    expect(page.regions[0].advanceTo).toBeGreaterThan(band.rect.h)
  })

  it('takes its page size from the book setup, not a fixed sheet', async () => {
    const letter = composeSectionOpenPage(PACK, SECTION, await ctx(LETTER))
    const a4 = composeSectionOpenPage(PACK, SECTION, await ctx(A4))
    expect(letter.size).toEqual({ w: 612, h: 792 })
    expect(a4.size.w).toBeCloseTo(595.28, 2)
    expect(a4.size.h).toBeCloseTo(841.89, 2)
    expect(bookPageRatio(LETTER)).toBeCloseTo(612 / 792, 6)
    expect(bookPageRatio(A4)).toBeCloseTo(595.28 / 841.89, 6)
    /* The two really are different shapes — the Builder hardcoded A4 for both
       before this, so a Letter project previewed at the wrong proportions. */
    expect(bookPageRatio(LETTER)).not.toBeCloseTo(bookPageRatio(A4), 3)
  })

  it('recomposes when the project content changes', async () => {
    /* The rail-edit path in miniature: the pack is what a rail edit changes,
       and the composed page follows it. The band takes the project's accent,
       so a different palette is a different page. */
    const base = composeSectionOpenPage(PACK, SECTION, await ctx())
    const repainted = composeSectionOpenPage(
      { ...PACK, colorRoles: { ...PACK.colorRoles, accent: '#B91C1C' } },
      SECTION,
      await ctx()
    )
    const fill = (p) => p.boxes.find((b) => b.id === 'band').style.fill
    expect(fill(repainted)).not.toEqual(fill(base))
  })

  it('measures with the shared ruler, so a blurb wraps into real lines', async () => {
    const withSub = composeSectionOpenPage(
      PACK,
      { ...SECTION, sub: 'Proof of system — the places you said this brand has to live and work, shown at the size and in the setting a reader will actually meet them in.' },
      await ctx()
    )
    const sub = withSub.boxes.find((b) => b.id === 'sub')
    expect(sub.lines.length).toBeGreaterThan(1)
    expect(sub.lines.join(' ')).toContain('Proof of system')
  })
})

describe('the renderer draws positioned data and nothing else', () => {
  const render = (page, props = {}) =>
    renderToStaticMarkup(React.createElement(PositionedPageView, { page, ...props }))

  it('renders the page at its composed size and real proportions', async () => {
    const page = composeSectionOpenPage(PACK, SECTION, await ctx())
    const html = render(page)
    expect(html).toContain('viewBox="0 0 612 792"')
    expect(html).toContain('aspect-ratio:612 / 792')
  })

  it('draws every composed box, rects and text alike', async () => {
    const page = composeSectionOpenPage(PACK, SECTION, await ctx())
    const html = render(page)
    for (const id of ['band', 'sectionNumber', 'sectionTitle', 'pageTitle', 'rule']) {
      expect(html, `missing ${id}`).toContain(`data-box="${id}"`)
    }
    expect(html).toContain('Color Palette')
    expect(html).toContain('Roles &amp; Usage')
  })

  it('honours supplied coordinates rather than deriving any', async () => {
    const page = composeSectionOpenPage(PACK, SECTION, await ctx())
    const title = page.boxes.find((b) => b.id === 'pageTitle')
    const html = render(page)
    /* SVG's text `y` IS a baseline, which is what the compositor produces —
       so the number in the markup is the number the compositor decided. */
    expect(html).toContain(`y="${title.origin.y}"`)
    expect(html).toContain(`font-size="${title.style.size}"`)
  })

  it('renders tracking as the design asks for it, uncapped', () => {
    const page = {
      pageId: 'p', index: 0, size: { w: 100, h: 100 }, background: null, regions: [],
      boxes: [{
        id: 'k', type: 'text', lines: ['EYEBROW'], origin: { x: 1, y: 2 },
        rect: { x: 1, y: 0, w: 10, h: 4 }, z: 1,
        style: { face: 'label', size: 8, color: [0, 0, 0], tracking: 0.16 },
      }],
      continues: false,
    }
    expect(render(page)).toContain('letter-spacing="0.16em"')
  })

  it('draws boxes in z-order', () => {
    const box = (id, z) => ({
      id, type: 'rect', rect: { x: 0, y: 0, w: 1, h: 1 }, z, style: { fill: [1, 2, 3] },
    })
    const page = {
      pageId: 'p', index: 0, size: { w: 10, h: 10 }, background: null, regions: [],
      boxes: [box('late', 5), box('early', 0)], continues: false,
    }
    const html = render(page)
    expect(html.indexOf('data-box="early"')).toBeLessThan(html.indexOf('data-box="late"'))
  })

  it('throws on a box it cannot draw rather than dropping it', () => {
    const page = {
      pageId: 'p', index: 0, size: { w: 10, h: 10 }, background: null, regions: [],
      boxes: [{ id: 'x', type: 'hologram', rect: { x: 0, y: 0, w: 1, h: 1 }, z: 0, style: {} }],
      continues: false,
    }
    expect(() => render(page)).toThrow(/cannot draw box type "hologram"/)
  })

  it('renders nothing at all without a page, rather than an empty sheet', () => {
    expect(render(null)).toBe('')
  })
})
