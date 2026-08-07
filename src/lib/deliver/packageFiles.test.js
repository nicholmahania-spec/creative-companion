import { describe, expect, it } from 'vitest'
import { colourSpecText, logoUsageText, packageFiles } from './packageFiles'

const PNG = 'data:image/png;base64,QUJD'

const pack = (over = {}) => ({
  projectName: "Sparrow's Promise",
  palette: ['#1C1917', '#FAFAF9'],
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
  detective: {},
  ...over,
})

const paths = (r) => r.files.map((f) => f.path)

describe('every planned file gets contents', () => {
  it('writes into the numbered folders', () => {
    const r = packageFiles(pack({ logoImage: PNG }), { briefMarkdown: '# brief' })
    expect(paths(r)).toContain('02_LOGO/SparrowsPromise_Logo_Primary_FullColor.png')
    expect(paths(r)).toContain('04_TYPE/SparrowsPromise_Typography_Information.txt')
    expect(paths(r)).toContain('06_PROJECT/README.txt')
  })

  it('carries the mark as base64, not as a data URL', () => {
    const r = packageFiles(pack({ logoImage: PNG }))
    const mark = r.files.find((f) => f.path.includes('Logo_Primary'))
    expect(mark.base64).toBe(true)
    expect(mark.content).toBe('QUJD')
  })

  it('leaves the book to the writer rather than faking a PDF', () => {
    const r = packageFiles(pack())
    const book = r.files.find((f) => f.pdf)
    expect(book.path).toMatch(/^01_BRAND_GUIDE\//)
    expect(book.content).toBeUndefined()
  })

  it('reports a file it cannot fill instead of shipping it empty', () => {
    const r = packageFiles(pack(), { briefMarkdown: '' })
    expect(r.missing.map((m) => m.path).join()).toMatch(/Brief_Agreed\.md/)
  })

  it('names the asset it could not reach, with what to do about it', () => {
    const r = packageFiles(pack(), {
      assets: [
        {
          id: 7,
          name: 'shop sign',
          dataUrl: 'https://example.com/x.png',
          rights: 'clientOwned',
        },
      ],
    })
    expect(r.missing[0].reason).toMatch(/outside the app/)
  })

  it('holds nothing back silently — a restricted asset is in the plan’s excluded list', () => {
    const r = packageFiles(pack(), {
      assets: [{ id: 1, name: 'stock shot', dataUrl: PNG, rights: 'thirdParty' }],
    })
    expect(paths(r).join()).not.toMatch(/StockShot/)
    expect(r.plan.excluded).toHaveLength(1)
  })
})

describe('the written sheets', () => {
  it('falls back to the default logo rules rather than printing a blank', () => {
    const t = logoUsageText(pack())
    expect(t).toMatch(/Clearspace:/)
    expect(t).toMatch(/Minimum size:/)
    expect(t).toMatch(/Please do not:/)
  })

  it('prefers the rules the designer actually wrote', () => {
    const t = logoUsageText(pack({ logoClearspace: 'one x-height all round' }))
    expect(t).toMatch(/one x-height all round/)
  })

  it('gives print the codes it asks for', () => {
    const t = colourSpecText(pack())
    expect(t).toMatch(/HEX #/)
    expect(t).toMatch(/rgb\(/)
    expect(t).toMatch(/C\d+ M\d+ Y\d+ K\d+/)
  })

  it('carries the reason a colour has its job, when there is one', () => {
    const t = colourSpecText(
      pack({ colorRoles: { cover: '#1C1917' }, colorRoleWhy: { cover: 'grounded, not black' } })
    )
    expect(t).toMatch(/Why: grounded, not black/)
  })

  it('says so when no pair reaches AA, rather than printing an empty heading', () => {
    const t = colourSpecText(pack({ palette: ['#777777', '#7A7A7A'] }))
    expect(t).toMatch(/No pair in this palette reaches AA/)
  })
})

describe('robustness', () => {
  it('does not throw on an empty pack', () => {
    expect(() => packageFiles()).not.toThrow()
    expect(packageFiles().files.length).toBeGreaterThan(0)
  })
})

/**
 * Four things a real client package got wrong, each pinned here.
 *
 * The package documented Text #737373 and Background #FFB8B8 as its two
 * working roles, listed one unrelated passing pair under "Text pairs that pass
 * AA", and never said that Text on Background is 2.89:1 — unreadable for body
 * copy and below the floor for large text too. It also stated built-in logo
 * defaults in the designer's voice, named a font source that was blank, and
 * shipped a logo folder with no logo while its own contents list said nothing
 * about the absence.
 */
describe('the package tells the client the bad news too', () => {
  const drifted = {
    projectName: 'My project',
    palette: ['#1C1917', '#FFB8B8'],
    colorRoles: { text: '#737373', accent: '#97908C' },
    typeHeading: 'Plus Jakarta Sans Bold',
    typeBody: 'Plus Jakarta Sans Regular',
    detective: {},
  }

  it('states the failing role pairings, not only the passing palette pairs', () => {
    const txt = colourSpecText(drifted)
    expect(txt).toMatch(/FAIL Body text on background .*2\.89:1 \(needs 4\.5:1\)/)
    expect(txt).toMatch(/FAIL Accent on background .*1\.92:1 \(needs 3:1\)/)
    expect(txt).toContain('below the readable minimum')
  })

  it('names role colours that are in no palette slot', () => {
    const txt = colourSpecText(drifted)
    expect(txt).toContain('Assigned to a job but not in the palette above')
    expect(txt).toContain('#97908C')
    expect(txt).toContain('#737373')
  })

  it('says nothing about failures when every pairing is readable', () => {
    const clean = colourSpecText({
      ...drifted,
      palette: ['#111111', '#FFFFFF'],
      colorRoles: { text: '#111111', quiet: '#FFFFFF', accent: '#111111', cover: '#111111' },
    })
    expect(clean).not.toContain('below the readable minimum')
    expect(clean).not.toContain('FAIL')
  })

  it('marks the logo rules nobody chose, and stays quiet once they are set', () => {
    expect(logoUsageText(drifted)).toContain('not yet set for this brand')
    expect(
      logoUsageText({
        ...drifted,
        logoClearspace: 'Half the mark height',
        logoMinSize: '24px',
        logoDonts: 'Do not rotate',
      })
    ).not.toContain('not yet set for this brand')
  })

  /* Same correction as in packagePlan.test.js: the fixture's faces are in the
     catalog, so the app knows their source and licence and saying otherwise
     was the bug. The sentence must still never point at a blank — that is the
     part being protected, and it is asserted both ways below. */
  it('never points at a source it does not have', () => {
    const unknown = packageFiles(
      { ...drifted, typeHeading: 'Gotham Bold', typeBody: 'Gotham Book' },
      {}
    )
    const fonts = unknown.files.find((f) => f.path.includes('Typography')).content
    expect(fonts).not.toContain('from the source above')
    expect(fonts).toContain('No source was recorded')
  })

  it('points at the source when the app knows one', () => {
    const { files } = packageFiles(drifted, {})
    const fonts = files.find((f) => f.path.includes('Typography')).content
    expect(fonts).toContain('from the source above')
    expect(fonts).not.toContain('No source was recorded')
  })

  it('says in the README that no logo file is included', () => {
    const { files } = packageFiles(drifted, {})
    const readme = files.find((f) => f.path.includes('README')).content
    expect(readme).toContain('No logo file is included in this package')
    // ...and does not imply a primary was supplied.
    expect(readme).not.toContain('one-colour and a reverse')
  })

  it('marks a planned file that did not ship, where its name is read', () => {
    const { files, missing } = packageFiles(drifted, { briefMarkdown: '' })
    expect(missing.some((m) => /Brief_Agreed/.test(m.path))).toBe(true)
    const readme = files.find((f) => f.path.includes('README')).content
    expect(readme).toMatch(/Brief_Agreed\.md — NOT INCLUDED/)
  })

  it('keeps the usual-extras note when a mark really did ship', () => {
    const { files } = packageFiles({ ...drifted, logoImage: PNG }, {})
    const readme = files.find((f) => f.path.includes('README')).content
    expect(readme).toContain('one-colour and a reverse')
    expect(readme).not.toContain('No logo file is included')
  })
})

/**
 * A file over 4MB used to be dropped at the door — `continue` plus a toast the
 * user's own `toastMode: 'quiet'` is entitled to swallow. It was never added,
 * so it could not appear in the panel, the plan, `missing`, the README or the
 * zip. Deliverables out of Illustrator and InDesign are routinely over 4MB, so
 * that was the common path, not the edge.
 */
describe('a file too large to store is named, not forgotten', () => {
  const base = {
    projectName: 'My project',
    palette: ['#1C1917', '#FAFAF9'],
    detective: {},
  }
  const oversize = {
    id: 'big', name: 'Press ready card', dataUrl: '',
    heldBack: 'tooLarge', sizeBytes: 6.2 * 1024 * 1024, rights: 'clientOwned',
  }

  it('holds it back with the size, rather than shipping a broken entry', () => {
    const { plan, files } = packageFiles(base, { assets: [oversize] })
    const row = plan.excluded.find((x) => x.name === 'Press ready card')
    expect(row).toBeTruthy()
    expect(row.reason).toMatch(/Too large to store in the app \(6\.2MB\)/)
    // ...and no file is planned for it at all.
    expect(files.some((f) => /PressReadyCard/i.test(f.path))).toBe(false)
  })

  it('says so in the README the client reads', () => {
    const { files } = packageFiles(base, { assets: [oversize] })
    const readme = files.find((f) => f.path.includes('README')).content
    expect(readme).toContain('Not included:')
    expect(readme).toContain('Press ready card')
    expect(readme).toMatch(/Too large to store/)
  })

  it('still ships an asset that is merely large but stored', () => {
    const ok = { id: 'ok', name: 'Card', dataUrl: PNG, rights: 'clientOwned' }
    const { plan, files } = packageFiles(base, { assets: [ok] })
    expect(plan.excluded).toHaveLength(0)
    expect(files.some((f) => /Card/i.test(f.path))).toBe(true)
  })
})
