import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertBox, BOX_TYPES, makePage, makeRegion } from './positioned'
import { composePage, composeRegion } from './compose'
import { composeSectionOpen } from './templates/sectionOpen'
import { bookCompositionOf } from '../bookBuilder'
import { buildDocumentVersionData, ensureBookDocumentData } from '../../documents/documentModel'

/**
 * PHASE 10A — THE COMPOSITION BOUNDARY.
 *
 * The book is drawn twice: React in the Builder, jsPDF in the file. They share
 * the page spine and nothing else, and they have already drifted — the Voice
 * page prints a different set of fields in each, and the section-opening band
 * the PDF draws has no equivalent on screen at all.
 *
 * This file holds the boundary that stops that: one compositor decides what
 * appears and where, and a renderer only draws what it is handed. Every test
 * below is one of the ways that boundary could quietly stop being true —
 * a template reaching for project state, a renderer recomputing a position,
 * a box type disappearing instead of failing.
 */

const ROOT = new URL('../../../..', import.meta.url).pathname
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const codeOnly = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const px = (n) => n * 0.75
const GEOMETRY = { pageW: 612, pageH: 792, margin: 48, bleed: 9, contentW: 516, startY: 0, px }
const STYLE = {
  band: { bg: [27, 58, 47], fg: [247, 243, 236], accent: [196, 165, 116] },
  title: { color: [27, 58, 47] },
  rule: { fill: [196, 165, 116] },
  sub: { color: [90, 90, 90] },
  hasRunningHeader: false,
}
const SPEC = { num: '02', titleLines: ['Logo', 'System'], title: 'Lockups & Construction' }
/* One line per 40 characters — a stand-in for the platform's real measurement,
   which is the point: the template must work off whatever it is handed. */
const measure = (text, { width }) => {
  const per = Math.max(1, Math.floor(width / 6))
  const out = []
  for (let i = 0; i < text.length; i += per) out.push(text.slice(i, i + per))
  return out.length ? out : ['']
}
const compose = (content = {}, style = STYLE, geometry = GEOMETRY, m = measure) =>
  composeRegion(composeSectionOpen, SPEC, content, style, geometry, m)

describe('the section-open template describes the region', () => {
  it('produces the band, the number, the title, the heading and the rule', () => {
    const region = compose()
    expect(region.id).toBe('section-open')
    expect(region.boxes.map((b) => b.id)).toEqual([
      'band',
      'sectionNumber',
      'sectionTitle',
      'pageTitle',
      'rule',
    ])
    const band = region.boxes.find((b) => b.id === 'band')
    /* Full-bleed: the band starts at the sheet's edge, not the margin, and
       covers the bleed area so a trimmed page has no white hairline. */
    expect(band.rect.x).toBe(0)
    expect(band.rect.y).toBe(0)
    expect(band.rect.w).toBe(GEOMETRY.pageW)
    expect(band.rect.h).toBe(px(104) + GEOMETRY.bleed)
  })

  it('prints the section number and title it was given, and invents nothing', () => {
    const region = compose()
    const num = region.boxes.find((b) => b.id === 'sectionNumber')
    const title = region.boxes.find((b) => b.id === 'sectionTitle')
    expect(num.lines).toEqual(['02 /'])
    expect(title.lines).toEqual(['Logo System'])
    expect(region.boxes.find((b) => b.id === 'pageTitle').lines).toEqual([
      'Lockups & Construction',
    ])
  })

  it('adds the blurb only when there is one, and advances further for it', () => {
    const without = compose()
    const withSub = compose({ sub: 'Proof of system.' })
    expect(without.boxes.some((b) => b.id === 'sub')).toBe(false)
    expect(withSub.boxes.some((b) => b.id === 'sub')).toBe(true)
    expect(withSub.advanceTo).toBeGreaterThan(without.advanceTo)
  })

  it('drops the number lower when a running header shares the band', () => {
    const plain = compose().boxes.find((b) => b.id === 'sectionNumber')
    const withHeader = compose({}, { ...STYLE, hasRunningHeader: true }).boxes.find(
      (b) => b.id === 'sectionNumber'
    )
    /* The header lands flush left inside the band. Without this the two
       overprinted each other on every section page. */
    expect(withHeader.origin.y).toBeGreaterThan(plain.origin.y)
  })
})

describe('composed geometry is decided once and does not drift', () => {
  it('is deterministic — same inputs, same region', () => {
    expect(JSON.stringify(compose({ sub: 'A blurb.' }))).toBe(
      JSON.stringify(compose({ sub: 'A blurb.' }))
    )
  })

  it('moves with the page it is composed for rather than assuming Letter', () => {
    const a4 = compose({}, STYLE, { ...GEOMETRY, pageW: 595.28, contentW: 499.28 })
    expect(a4.boxes.find((b) => b.id === 'band').rect.w).toBe(595.28)
  })

  it('starts where it is told to start', () => {
    /* The compositor takes the cursor as an input and returns where it ends.
       It never reads the renderer's cursor — that is the separation. */
    const moved = compose({}, STYLE, { ...GEOMETRY, startY: 100 })
    expect(moved.boxes.find((b) => b.id === 'band').rect.y).toBe(100)
    expect(moved.advanceTo).toBe(compose().advanceTo + 100)
  })
})

describe('measurement is injected, never reached for', () => {
  it('breaks the blurb with the measure it is handed', () => {
    const calls = []
    const spy = (text, opts) => {
      calls.push({ text, opts })
      return ['one', 'two', 'three']
    }
    const region = compose({ sub: 'Proof of system.' }, STYLE, GEOMETRY, spy)
    expect(calls).toHaveLength(1)
    expect(calls[0].text).toBe('Proof of system.')
    expect(calls[0].opts.face).toBe('body')
    expect(calls[0].opts.width).toBeCloseTo(GEOMETRY.contentW * 0.72, 6)
    expect(region.boxes.find((b) => b.id === 'sub').lines).toEqual(['one', 'two', 'three'])
  })

  it('reserves height for every line the measurement returned', () => {
    const one = compose({ sub: 'x' }, STYLE, GEOMETRY, () => ['a'])
    const four = compose({ sub: 'x' }, STYLE, GEOMETRY, () => ['a', 'b', 'c', 'd'])
    expect(four.advanceTo - one.advanceTo).toBeCloseTo(3 * px(15) * 1.5, 6)
  })

  it('refuses to compose without a measurement function', () => {
    expect(() => composeSectionOpen(SPEC, {}, STYLE, GEOMETRY, null)).toThrow(/measure/)
  })

  it('never imports a renderer to do its own wrapping', () => {
    const src = codeOnly(read('src/lib/book/layout/templates/sectionOpen.js'))
    expect(src).not.toMatch(/jspdf|splitTextToSize|canvas|measureText|document\./i)
  })
})

describe('a renderer cannot be handed something it will silently drop', () => {
  it('rejects an unknown box type instead of skipping it', () => {
    expect(() =>
      assertBox({ id: 'x', type: 'hologram', rect: { x: 0, y: 0, w: 1, h: 1 }, z: 0 })
    ).toThrow(/unknown box type "hologram"/)
  })

  it('names the known types so a renderer and the contract cannot disagree', () => {
    expect([...BOX_TYPES]).toEqual(['rect', 'text'])
  })

  it('rejects a text box with no resolved origin', () => {
    expect(() =>
      assertBox({ id: 't', type: 'text', lines: ['a'], rect: { x: 0, y: 0, w: 1, h: 1 }, z: 0 })
    ).toThrow(/resolved origin/)
  })

  it('rejects a region with no cursor to hand on', () => {
    expect(() => makeRegion({ id: 'r', boxes: [] })).toThrow(/advanceTo/)
  })

  it('fails at the boundary, naming the template, when one returns nothing', () => {
    expect(() => composeRegion(function brokenTemplate() {}, {})).toThrow(
      /brokenTemplate.*returned nothing/
    )
  })

  it('assembles regions into a page whose draw list is every box in order', () => {
    const page = composePage({
      pageId: 'logo',
      index: 4,
      size: { w: 612, h: 792 },
      background: { role: 'pageType' },
      regions: [compose({ sub: 'Proof.' })],
    })
    expect(page.boxes).toHaveLength(6)
    expect(page.regions).toHaveLength(1)
    expect(page.continues).toBe(false)
    expect(() => makePage({ pageId: 'x', index: 0, size: { w: 1 } })).toThrow(/size/)
  })
})

describe('resolved points never become stored layout', () => {
  it('the persisted composition row carries no coordinates', () => {
    const base = {
      id: 'p1',
      name: 'X',
      bookBuilder: { pageOrder: ['logo', 'color'], pageLocking: { lockedPages: ['logo'] } },
    }
    const project = { ...base, document: ensureBookDocumentData(base) }
    const rows = bookCompositionOf(project)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['itemId', 'locked', 'pageId'])
    }
  })

  it('a frozen Version carries no coordinates either', () => {
    const base = { id: 'p1', name: 'X', bookBuilder: { pageOrder: ['logo'] } }
    const project = { ...base, document: ensureBookDocumentData(base) }
    const built = buildDocumentVersionData(project, {
      identitySnapshotId: 'snap_1',
      freezeEvent: 'sent',
    })
    expect(built.ok).toBe(true)
    const blob = JSON.stringify(built.version)
    /* Resolved geometry belongs to the render, not the record. If x/y ever
       reaches a Version, page size stops being a thing anyone can change. */
    expect(blob).not.toMatch(/"(x|y|w|h)":/)
    expect(blob).not.toMatch(/"rect"|"origin"|"advanceTo"|"boxes"/)
  })

  it('no layout module writes to project state', () => {
    for (const f of [
      'src/lib/book/layout/compose.js',
      'src/lib/book/layout/positioned.js',
      'src/lib/book/layout/templates/sectionOpen.js',
    ]) {
      const src = codeOnly(read(f))
      expect(src, `${f} reaches the store`).not.toMatch(/useAppStore|zustand|localStorage/)
      expect(src, `${f} reads the content model`).not.toMatch(
        /bookContent|PAGE_FIELDS|readField|detective/
      )
      expect(src, `${f} names a colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })
})

describe('the PDF renderer draws the region rather than deciding it', () => {
  const pdfSrc = codeOnly(read('src/lib/book/brandBookPdf.js'))

  it('composes the section opening instead of positioning it', () => {
    expect(pdfSrc).toMatch(/composeRegion\(\s*composeSectionOpen/)
    expect(pdfSrc).toMatch(/y = region\.advanceTo/)
  })

  it('no longer holds the band geometry it used to compute', () => {
    /* These were the literals `sectionOpen` positioned the band with. If any
       comes back here, the geometry is being decided in two places again. */
    const openBody = pdfSrc.slice(
      pdfSrc.indexOf('const sectionOpen ='),
      pdfSrc.indexOf('const footerAll =')
    )
    expect(openBody).not.toMatch(/px\(104\)|px\(46\)|px\(34\)|px\(56\)|0\.78|0\.82/)
  })

  it('throws on a box type it cannot draw', () => {
    const draw = pdfSrc.slice(pdfSrc.indexOf('const drawRegion ='))
    expect(draw).toMatch(/throw new Error/)
  })
})
