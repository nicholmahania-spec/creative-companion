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
      assets: [{ id: 7, name: 'shop sign', dataUrl: 'https://example.com/x.png' }],
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
