import { describe, expect, it } from 'vitest'
import {
  canDistribute,
  deliverableChecklist,
  fontInformation,
  packagePlan,
  packageReadme,
  rightsFor,
  USAGE_RIGHTS,
} from './packagePlan'

const pack = (over = {}) => ({
  projectName: "Sparrow's Promise",
  palette: ['#1C1917', '#0F766E'],
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
  detective: {},
  ...over,
})

const PNG = 'data:image/png;base64,AAAA'
const SVG = 'data:image/svg+xml;base64,AAAA'

const fileNames = (plan) => plan.folders.flatMap((f) => f.files.map((x) => x.name))
const kinds = (plan) => plan.folders.flatMap((f) => f.files.map((x) => x.kind))

describe('the folder structure', () => {
  it('numbers the folders in reading order', () => {
    const plan = packagePlan(pack({ logoImage: SVG }))
    expect(plan.folders.map((f) => f.name)).toEqual([
      '01_BRAND_GUIDE',
      '02_LOGO',
      '03_COLOR',
      '04_TYPE',
      '06_PROJECT',
    ])
  })

  it('ships no empty folder — colour goes when there is no palette', () => {
    const plan = packagePlan(pack({ palette: [] }))
    expect(plan.folders.map((f) => f.id)).not.toContain('colour')
  })

  it('names every file to the convention', () => {
    const plan = packagePlan(pack({ logoImage: SVG }))
    expect(fileNames(plan)).toContain('SparrowsPromise_Logo_Primary.svg')
    expect(fileNames(plan)).toContain('SparrowsPromise_Colour_Specifications.txt')
    expect(plan.folders.map((f) => f.name)).toContain('02_LOGO')
  })

  it('says a raster mark is raster rather than implying vector', () => {
    const plan = packagePlan(pack({ logoImage: PNG }))
    const mark = plan.folders
      .flatMap((f) => f.files)
      .find((x) => x.kind === 'mark')
    expect(mark.name).toBe('SparrowsPromise_Logo_Primary_FullColor.png')
    expect(mark.note).toMatch(/not vector/i)
  })

  it('invents no mark when none was uploaded', () => {
    expect(kinds(packagePlan(pack()))).not.toContain('mark')
  })

  it('counts what it is actually shipping', () => {
    const plan = packagePlan(pack({ logoImage: SVG }))
    expect(plan.fileCount).toBe(fileNames(plan).length)
  })
})

describe('usage rights', () => {
  it('defaults an unmarked asset to the client’s', () => {
    expect(rightsFor(undefined).id).toBe('clientOwned')
    expect(rightsFor('nonsense').id).toBe('clientOwned')
    expect(canDistribute({})).toBe(true)
  })

  it('holds back everything that is not the client’s to hold', () => {
    const held = USAGE_RIGHTS.filter((r) => !r.ship).map((r) => r.id)
    expect(held).toEqual(['designerOwned', 'thirdParty', 'doNotDistribute'])
    for (const id of held) expect(canDistribute({ rights: id })).toBe(false)
  })

  it('excludes a restricted asset AND says why', () => {
    const plan = packagePlan(pack(), {
      assets: [
        { id: 1, name: 'hero mockup', dataUrl: PNG, rights: 'thirdParty' },
        { id: 2, name: 'business card', dataUrl: PNG },
      ],
    })
    expect(fileNames(plan)).toContain('SparrowsPromise_Application_BusinessCard.png')
    expect(plan.excluded).toEqual([
      { name: 'hero mockup', reason: expect.stringMatching(/licence is yours/i) },
    ])
  })

  it('puts what it held back in the README', () => {
    const p = pack()
    const plan = packagePlan(p, {
      assets: [{ id: 1, name: 'stock photo', dataUrl: PNG, rights: 'doNotDistribute' }],
    })
    expect(packageReadme(p, plan)).toMatch(/Not included:[\s\S]*stock photo/)
  })
})

describe('fonts are documented, not redistributed', () => {
  it('says plainly that the files are not included', () => {
    const info = fontInformation(pack())
    expect(info.filesIncluded).toBe(false)
    expect(info.text).toMatch(/NOT included/)
    expect(info.text).toMatch(/Plus Jakarta Sans Bold/)
  })

  it('includes them only when the designer says the licence allows it', () => {
    const info = fontInformation(pack({ fontFilesLicensed: true }))
    expect(info.filesIncluded).toBe(true)
    expect(info.text).not.toMatch(/NOT included/)
  })

  it('admits when the licence and source were never recorded', () => {
    expect(fontInformation(pack()).text).toMatch(/not recorded/)
  })

  it('warns in the README when fonts are documentation only', () => {
    const p = pack()
    expect(packageReadme(p)).toMatch(/Font files are not included/)
    expect(packageReadme(pack({ fontFilesLicensed: true }))).not.toMatch(
      /Font files are not included/
    )
  })
})

describe('the deliverable checklist', () => {
  it('lists only what the brief bought', () => {
    const rows = deliverableChecklist(
      pack({ detective: { deliverablesPicked: ['logoPrimary'] } })
    )
    expect(rows.map((r) => r.id)).toEqual(['logoPrimary'])
  })

  it('is empty when the brief picked nothing, rather than inventing a list', () => {
    expect(deliverableChecklist(pack())).toEqual([])
  })

  it('fails a bought deliverable the package cannot satisfy', () => {
    const rows = deliverableChecklist(
      pack({ palette: [], detective: { deliverablesPicked: ['colourPalette'] } })
    )
    expect(rows[0].ok).toBe(false)
    expect(rows[0].missing).toMatch(/palette/i)
  })

  it('ticks one it can', () => {
    const rows = deliverableChecklist(
      pack({ logoImage: SVG, detective: { deliverablesPicked: ['logoPrimary'] } })
    )
    expect(rows[0].ok).toBe(true)
    expect(rows[0].missing).toBe('')
  })

  it('asks for a file for anything the app cannot make itself', () => {
    const rows = deliverableChecklist(
      pack({ detective: { deliverablesPicked: ['packaging'] } })
    )
    expect(rows[0].ok).toBe(false)
    expect(rows[0].missing).toMatch(/attach/i)
  })

  it('ignores a deliverable id it does not recognise', () => {
    const rows = deliverableChecklist(
      pack({ detective: { deliverablesPicked: ['notAThing'] } })
    )
    expect(rows).toEqual([])
  })
})

describe('robustness', () => {
  it('plans something for an empty pack rather than throwing', () => {
    expect(() => packagePlan()).not.toThrow()
    expect(packagePlan().fileCount).toBeGreaterThan(0)
    expect(packagePlan().brand).toBe('Brand')
  })

  it('ignores a null asset in the list', () => {
    expect(() => packagePlan(pack(), { assets: [null, undefined] })).not.toThrow()
  })
})
