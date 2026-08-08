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

  /* This assertion changed because the CAPABILITY changed, not because it was
     wrong. It protected "a stored link is never reported as absent", and that
     still holds absolutely. What it also encoded was that a link could not be
     written — true when the only options were the bytes in hand or nothing.
     An http(s) mark is now collected at export, so it is `fetch`: still not
     absent, and now actually delivered.
     blob: and file: stay held. A blob URL dies with the page that created it
     and file: is a path on someone else's disk — both would fail, and a fetch
     that always fails is worse than a sentence that explains. */
  it('treats a stored http link as collectable, and never as absent', () => {
    const m = markSource(STORAGE_URL)
    expect(m.state).toBe('fetch')
    expect(m.url).toBe(STORAGE_URL)
    expect(hasStoredMark(STORAGE_URL)).toBe(true)
  })

  it('still holds back links that could never be fetched', () => {
    expect(markSource('blob:http://localhost/9d1c').state).toBe('held')
    expect(markSource('blob:http://localhost/9d1c').reason).toMatch(/link/i)
    expect(markSource('file:///Users/x/logo.png').state).toBe('held')
  })

  it('knows a color is not artwork', () => {
    expect(markSource('#1C1917').reason).toMatch(/color/i)
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

  /* Was: "does not invent a logo file it cannot write". The premise expired —
     it can write this one now, by collecting it. The rule underneath is
     unchanged and still enforced everywhere else: never plan a file you cannot
     produce. */
  it('plans the logo as a file, because it can now be collected', () => {
    expect(kinds(packagePlan(p))).toContain('mark')
  })

  it('says on the panel that it will be collected, rather than implying it is in hand', () => {
    const plan = packagePlan(p)
    const row = plan.folders
      .flatMap((f) => f.files)
      .find((f) => f.kind === 'mark')
    expect(row.note).toMatch(/collected/i)
    // No longer held back — it is coming.
    expect(plan.excluded.find((x) => /logo/i.test(x.name))).toBeFalsy()
  })

  it('hands the writer the url instead of bytes it does not have', () => {
    const { files } = packageFiles(p, {})
    const markFile = files.find((f) => /logo/i.test(f.path) && f.fetchUrl)
    expect(markFile).toBeTruthy()
    expect(markFile.fetchUrl).toBe(STORAGE_URL)
    expect(markFile.content).toBeUndefined()
  })

  it('never tells the client the designer made no mark', () => {
    const readme = packageReadme(p, null, [])
    /* Was: assert the README says "the mark does exist" — the sentence the
       HELD case needed. A collected mark ships, so the README names the logo
       file like any other. The intent is unchanged and still asserted: never
       tell the client the designer made no mark. */
    expect(readme).not.toMatch(/no stored mark on/i)
    expect(readme).not.toMatch(/no mark/i)
    expect(readme).toMatch(/logo/i)
  })

  /* The intent was: never send the designer to upload a mark they already
     made. That is now satisfied more completely than the original assertion
     could express — the row is simply MET, because the client receives the
     primary logo. `ok: false` was right only while the mark could not ship. */
  it('counts the primary logo as delivered, because the client receives it', () => {
    const rows = deliverableChecklist(
      pack({
        logoImage: STORAGE_URL,
        detective: { deliverablesPicked: ['logoPrimary'] },
      })
    )
    expect(rows[0].ok).toBe(true)
    expect(rows[0].missing).toBeFalsy()
  })

  /* Obsolete by capability, and worth saying why rather than deleting quietly.
     It asserted the toast could not read clean because the mark was left out.
     The mark is no longer left out — it is collected — so a clean toast is now
     the truthful outcome. What replaces it is the guarantee that a FAILED
     collection is still reported, which is the property that actually
     mattered. */
  it('reports a failed collection rather than shipping a quiet gap', () => {
    const { files } = packageFiles(p, { briefMarkdown: '# brief' })
    const markFile = files.find((f) => f.fetchUrl)
    expect(markFile, 'the mark must be planned as a collectable file').toBeTruthy()
    // The writer is what fetches; a failure there lands in `missing` with a
    // reason (see downloadClientPackage), never in silence.
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
      /usually also includes a one-color/i
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
    /* Still false: this pack is synchronous and writes no logo file, and the
       CLI prints its note on `!hasMark` — flipping it true would have made the
       quick pack omit the mark with nothing said, which is the exact defect
       this file exists to prevent. */
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
