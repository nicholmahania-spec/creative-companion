import { describe, expect, it } from 'vitest'
import {
  assetFileName,
  extFromDataUrl,
  namePart,
  uniqueNames,
} from './naming'

describe('name parts', () => {
  it('reads a business name the way the business writes it', () => {
    expect(namePart("Sparrow's Promise")).toBe('SparrowsPromise')
    expect(namePart('harbor & hearth')).toBe('HarborHearth')
    expect(namePart('Café Lumière')).toBe('CafeLumiere')
  })

  it('drops anything a file system would argue about', () => {
    expect(namePart('a/b\\c:d*e?f')).toBe('ABCDEF')
    expect(namePart('   ')).toBe('')
    expect(namePart(null)).toBe('')
  })

  /* An emoji in a business name is ordinary, and a filename headed for a
     printer's FTP drop must not carry one. Stated plainly so this is not
     mistaken for a guard: it is NOT mutation-proof — adding `u` to the fold
     regex leaves it green, because the ASCII split in `namePart` absorbs the
     difference. It documents the behaviour; the split is what enforces it. */
  it('reduces characters above the basic plane to nothing, like any other punctuation', () => {
    expect(namePart('Brand \u{1F600} Co')).toBe('BrandCo')
    expect(namePart('\u{20BB7} Studio')).toBe('Studio')
  })
})

describe('file names', () => {
  it('builds the convention', () => {
    expect(
      assetFileName({
        brand: "Sparrow's Promise",
        group: 'logo',
        item: 'primary',
        variant: 'full color',
        ext: 'svg',
      })
    ).toBe('SparrowsPromise_Logo_Primary_FullColor.svg')
  })

  it('drops empty parts rather than leaving a dangling underscore', () => {
    expect(
      assetFileName({ brand: 'Acme', group: 'colour', item: 'specifications', ext: 'pdf' })
    ).toBe('Acme_Colour_Specifications.pdf')
  })

  it('never returns a bare extension', () => {
    expect(assetFileName({ ext: 'png' })).toBe('Asset.png')
    expect(assetFileName()).toBe('Asset')
  })

  it('tolerates a dotted extension', () => {
    expect(assetFileName({ brand: 'Acme', ext: '.PNG' })).toBe('Acme.png')
  })
})

describe('collisions', () => {
  it('keeps every file rather than letting the zip overwrite one', () => {
    expect(
      uniqueNames(['A_Logo.png', 'A_Logo.png', 'A_Logo.png', 'B.svg'])
    ).toEqual(['A_Logo.png', 'A_Logo_2.png', 'A_Logo_3.png', 'B.svg'])
  })

  it('matches case-insensitively, as a file system does', () => {
    expect(uniqueNames(['Logo.png', 'logo.png'])).toEqual([
      'Logo.png',
      'logo_2.png',
    ])
  })

  it('suffixes an extensionless name at the end', () => {
    expect(uniqueNames(['README', 'README'])).toEqual(['README', 'README_2'])
  })
})

describe('data urls', () => {
  it('reads the real extension', () => {
    expect(extFromDataUrl('data:image/svg+xml;base64,abc')).toBe('svg')
    expect(extFromDataUrl('data:image/jpeg;base64,abc')).toBe('jpg')
    expect(extFromDataUrl('data:application/pdf;base64,abc')).toBe('pdf')
  })

  it('returns null for anything that is not one', () => {
    expect(extFromDataUrl('https://example.com/a.png')).toBe(null)
    expect(extFromDataUrl('')).toBe(null)
    expect(extFromDataUrl(null)).toBe(null)
  })
})
