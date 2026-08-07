/**
 * A mark that exists must never be reported as absent.
 *
 * These start from a real artefact: a client package whose `02_LOGO/` held a
 * usage sheet and no logo, exported from a project that had the artwork. The
 * brand book PDF in the same zip carried the mark — its RGB and alpha planes
 * decode byte-for-byte identical to the project's PNG — so the mark was there
 * and the packager could not see it. Nothing anywhere said so; the README told
 * the client there was "no stored mark on the project yet".
 *
 * The store really does hold non-data URLs in `logoImage`: a cloud push
 * offloads images to Storage and writes the URL back (`applyImageUrlReplacements`).
 * So "the string is not a data URL" is a normal state, not a corrupt one.
 */
import { describe, expect, it } from 'vitest'
import { markSource, hasStoredMark } from './markSource'
import {
  packagePlan,
  packageReadme,
  deliverableChecklist,
} from './packagePlan'
import { packageFiles } from './packageFiles'
import { markPackFiles } from '../book/exportFiles'

/* A real 1x1 PNG, so the byte sniff has something true to read. */
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='
/* What a cloud push leaves behind. This is the one that shipped the empty
   logo folder. */
const STORAGE_URL =
  'https://abcdefgh.supabase.co/storage/v1/object/public/workspace/logo/9101.png'

const pack = (over = {}) => ({
  projectName: 'Harbor & Hearth',
  palette: ['#1C1917', '#0F766E'],
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
  detective: {},
  ...over,
})

const kinds = (plan) => plan.folders.flatMap((f) => f.files.map((x) => x.kind))

describe('markSource — the one decision', () => {
  it('reads nothing as nothing', () => {
    expect(markSource('').state).toBe('none')
    expect(markSource(null).state).toBe('none')
    expect(markSource('   ').state).toBe('none')
    expect(hasStoredMark('')).toBe(false)
  })

  it('hands a writer the bytes and the extension', () => {
    const m = markSource(PNG)
    expect(m.state).toBe('ready')
    expect(m.ext).toBe('png')
    expect(m.base64).toBe(PNG.split(',')[1])
    expect(markSource(SVG).ext).toBe('svg')
  })

  it('calls a stored link held, not absent', () => {
    const m = markSource(STORAGE_URL)
    expect(m.state).toBe('held')
    expect(hasStoredMark(STORAGE_URL)).toBe(true)
    expect(m.reason).toMatch(/link/i)
    expect(markSource('blob:http://localhost/9d1c').state).toBe('held')
  })

  it('knows a colour is not artwork', () => {
    expect(markSource('#1C1917').reason).toMatch(/colour/i)
    expect(markSource('linear-gradient(135deg, #000, #fff)').state).toBe('held')
  })

  it('does not guess an extension when neither the bytes nor the mime say', () => {
    /* A file input that hands back `application/octet-stream`, which is
       routine. The bytes are read first and say nothing either, so this is the
       one honest answer: something is stored and this writer cannot name it. */
    const m = markSource('data:application/octet-stream;base64,AAAAAAAA')
    expect(m.state).toBe('held')
    expect(m.reason).toMatch(/could not be read/i)
  })

  it('recovers a data URL that picked up whitespace, instead of losing it', () => {
    /* The book rasteriser trims before loading, so this rendered in the PDF
       and vanished from the package — the same disagreement in miniature. */
    const m = markSource(`\n  ${PNG}  \n`)
    expect(m.state).toBe('ready')
    expect(m.base64).toBe(PNG.split(',')[1])
  })
})

describe('the client package, when the mark is stored as a link', () => {
  const p = pack({ logoImage: STORAGE_URL })

  it('does not invent a logo file it cannot write', () => {
    expect(kinds(packagePlan(p))).not.toContain('mark')
  })

  it('names the gap instead of passing over it', () => {
    const plan = packagePlan(p)
    const held = plan.excluded.find((x) => /logo/i.test(x.name))
    expect(held).toBeTruthy()
    expect(held.reason).toMatch(/link/i)
  })

  it('never tells the client the designer made no mark', () => {
    const readme = packageReadme(p, null, [])
    expect(readme).not.toMatch(/no stored mark on/i)
    expect(readme).toMatch(/the mark does exist/i)
    /* And it must not imply a primary was supplied. */
    expect(readme).not.toMatch(/usually also includes a one-colour/i)
  })

  it('tells the designer which problem it is, not to go and upload again', () => {
    const rows = deliverableChecklist(
      pack({
        logoImage: STORAGE_URL,
        detective: { deliverablesPicked: ['logoPrimary'] },
      })
    )
    expect(rows[0].ok).toBe(false)
    expect(rows[0].missing).not.toMatch(/no mark uploaded/i)
    expect(rows[0].missing).toMatch(/on the project/i)
  })

  it('counts as something left out, so the export toast cannot read clean', () => {
    const r = packageFiles(p, { briefMarkdown: '# brief' })
    const left = r.plan.excluded.length + r.missing.length
    expect(left).toBeGreaterThan(0)
  })
})

describe('the honest cases still read honestly', () => {
  it('a project with no mark at all is still described that way', () => {
    const plan = packagePlan(pack())
    expect(plan.excluded.some((x) => /logo/i.test(x.name))).toBe(false)
    expect(packageReadme(pack(), plan, [])).toMatch(/no stored mark on/i)
  })

  it('a real mark still ships, and the README still offers the extras', () => {
    const r = packageFiles(pack({ logoImage: PNG }), { briefMarkdown: '# b' })
    const mark = r.files.find((f) => /02_LOGO\/.*\.png$/.test(f.path))
    expect(mark).toBeTruthy()
    expect(mark.content).toBe(PNG.split(',')[1])
    expect(r.missing).toEqual([])
    expect(packageReadme(pack({ logoImage: PNG }), r.plan, r.missing)).toMatch(
      /usually also includes a one-colour/i
    )
  })

  it('a whitespace-padded mark reaches the folder rather than disappearing', () => {
    const r = packageFiles(pack({ logoImage: `  ${PNG}\n` }), {})
    const mark = r.files.find((f) => /02_LOGO\/.*\.png$/.test(f.path))
    expect(mark).toBeTruthy()
    expect(mark.content).toBe(PNG.split(',')[1])
  })
})

describe('the logo-only pack', () => {
  it('says the mark exists when it does', () => {
    const { files, hasMark } = markPackFiles({
      projectName: 'Harbor & Hearth',
      logoImage: STORAGE_URL,
    })
    expect(hasMark).toBe(false)
    const readme = files.find((f) => f.name === 'README.txt').content
    expect(readme).not.toMatch(/no mark has been uploaded/i)
    expect(readme).toMatch(/link/i)
  })

  it('still says so plainly when there really is none', () => {
    const { files } = markPackFiles({ projectName: 'X' })
    const readme = files.find((f) => f.name === 'README.txt').content
    expect(readme).toMatch(/no mark has been uploaded/i)
  })
})
