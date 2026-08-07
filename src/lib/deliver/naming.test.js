import { describe, expect, it } from 'vitest'
import {
  assetFileName,
  extFromBytes,
  extFromDataUrl,
  markFileName,
  namePart,
  shortItem,
  uniqueNames,
} from './naming'

describe('the item slot, from a filename off the designer‘s desk', () => {
  /* The name a real package shipped. Thirty-eight characters, of which
     `Vector` and `2generation` describe the designer's export and not the
     thing the client is looking at. */
  it('drops the words that describe the file rather than the work', () => {
    const r = shortItem('Rectangle_Vector_FullColor_2generation_Logo')
    expect(r.item).toBe('RectangleFullColorLogo')
    expect(r.shortened).toBe(true)
  })

  it('leaves a name that was already short alone, and says it did', () => {
    expect(shortItem('Business Card')).toEqual({
      item: 'BusinessCard',
      shortened: false,
    })
  })

  it('caps a long name rather than running it together', () => {
    const r = shortItem('spring campaign launch poster east region')
    expect(r.item).toBe('SpringCampaignLaunchPoster')
    expect(r.shortened).toBe(true)
  })

  /* Four digits is a year and belongs to the client; one to three is the
     designer counting revisions and does not. */
  it('keeps a year and drops a revision counter', () => {
    expect(shortItem('Poster 2024').item).toBe('Poster2024')
    expect(shortItem('Poster v3 copy').item).toBe('Poster')
    expect(shortItem('Logo 2').item).toBe('Logo')
  })

  /* A designer who names everything in noise still gets a file name — an
     empty item would collapse to `Harbor_Application.pdf` for every one of
     them, and `uniqueNames` would number files nobody can tell apart. */
  it('keeps the words when every word is noise', () => {
    expect(shortItem('final copy v2').item).toBe('FinalCopyV2')
  })
})

describe('the mark is named by one rule, wherever it came from', () => {
  it('drops the colour variant for a vector and keeps it for a raster', () => {
    expect(markFileName({ brand: 'Harbor & Hearth', ext: 'svg' })).toBe(
      'HarborHearth_Logo_Primary.svg'
    )
    expect(markFileName({ brand: 'Harbor & Hearth', ext: 'png' })).toBe(
      'HarborHearth_Logo_Primary_FullColor.png'
    )
  })
})

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

/**
 * A real package shipped two files named `.png` whose first four bytes were
 * `%PDF`. The mime in the data URL was unrecognised, so the extension fell
 * through to a hardcoded `'png'` — a guess, asserted to the client, that their
 * machine then acts on.
 */
describe('extFromBytes reads the bytes, not the label', () => {
  const b64 = (s) => Buffer.from(s, 'binary').toString('base64')

  it('calls a PDF a PDF however the data URL is labelled', () => {
    const pdf = b64('%PDF-1.6\r%\xe2\xe3\xcf\xd3\r\n1 0 obj')
    expect(extFromBytes(pdf)).toBe('pdf')
    expect(extFromBytes(`data:image/png;base64,${pdf}`)).toBe('pdf')
    // The mime alone — the old path — gets it wrong.
    expect(extFromDataUrl(`data:image/png;base64,${pdf}`)).toBe('png')
  })

  it('recognises the raster formats by signature', () => {
    expect(extFromBytes(b64('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'))).toBe('png')
    expect(extFromBytes(b64('\xff\xd8\xff\xe0\x00\x10JFIF'))).toBe('jpg')
    expect(extFromBytes(b64('GIF89a.......'))).toBe('gif')
  })

  it('only claims webp when the RIFF container actually says WEBP', () => {
    expect(extFromBytes(b64('RIFF\x24\x00\x00\x00WEBPVP8 '))).toBe('webp')
    expect(extFromBytes(b64('RIFF\x24\x00\x00\x00WAVEfmt '))).toBe(null)
  })

  it('finds SVG past a declaration or leading space', () => {
    expect(extFromBytes(b64('<svg xmlns="x"></svg>'))).toBe('svg')
    expect(extFromBytes(b64('<?xml version="1.0"?><svg/>'))).toBe('svg')
    expect(extFromBytes(b64('   <svg/>'))).toBe('svg')
  })

  it('says nothing rather than guessing', () => {
    expect(extFromBytes(b64('hello world, not a known format'))).toBe(null)
    expect(extFromBytes('')).toBe(null)
    expect(extFromBytes(null)).toBe(null)
  })
})
