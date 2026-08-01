import { describe, expect, it } from 'vitest'
import { isLogoOnlyScope } from './detectiveBrief'
import { markPackFiles } from './exportFiles'

/**
 * A logo-only job must be finishable in-app with the right artifact.
 *
 * The cold-start tester delivered a logo and the only export was a 21-page
 * brand book — a book about a brand that does not exist. The finish button
 * produced the wrong thing, so the project could not actually close inside the
 * tool; the user had to leave and assemble files by hand. An unfinishable last
 * step is where a time-blind, initiation-challenged user stalls hardest.
 *
 * These pin the two pure pieces: the scope decision that routes to a mark pack,
 * and the pack's contents — which must be honest, shipping only what genuinely
 * exists and naming what it doesn't rather than fabricating files.
 */
describe('isLogoOnlyScope', () => {
  it('is true only for a pure-mark brief', () => {
    expect(isLogoOnlyScope(['logoPrimary'])).toBe(true)
    expect(isLogoOnlyScope(['logoPrimary', 'logoVariations'])).toBe(true)
  })

  it('is false the moment anything needing the book is added', () => {
    expect(isLogoOnlyScope(['logoPrimary', 'colourPalette'])).toBe(false)
    expect(isLogoOnlyScope(['guidelines'])).toBe(false)
    expect(isLogoOnlyScope(['logoPrimary', 'website'])).toBe(false)
  })

  it('is false for an empty brief (unchanged default = the book)', () => {
    expect(isLogoOnlyScope([])).toBe(false)
    expect(isLogoOnlyScope(undefined)).toBe(false)
  })
})

describe('markPackFiles', () => {
  it('ships the real uploaded mark, in its actual format', () => {
    const png = markPackFiles({
      projectName: 'Backline',
      logoImage: 'data:image/png;base64,AAAA',
    })
    expect(png.hasMark).toBe(true)
    const logo = png.files.find((f) => f.name.startsWith('logo.'))
    expect(logo.name).toBe('logo.png')
    expect(logo.base64).toBe(true)
    expect(logo.content).toBe('AAAA')

    const svg = markPackFiles({
      projectName: 'Backline',
      logoImage: 'data:image/svg+xml;base64,BBBB',
    })
    expect(svg.files.find((f) => f.name.startsWith('logo.')).name).toBe('logo.svg')
  })

  it('always includes a README', () => {
    const r = markPackFiles({ projectName: 'X', logoImage: 'data:image/png;base64,AA' })
    expect(r.files.some((f) => f.name === 'README.txt')).toBe(true)
  })

  it('is honest when no mark exists yet — no logo file, README says so', () => {
    const r = markPackFiles({ projectName: 'X' })
    expect(r.hasMark).toBe(false)
    expect(r.files.some((f) => f.name.startsWith('logo.'))).toBe(false)
    const readme = r.files.find((f) => f.name === 'README.txt')
    expect(readme.content).toMatch(/no mark/i)
  })

  it('tells the recipient when the mark is raster, not vector', () => {
    const readme = markPackFiles({
      projectName: 'X',
      logoImage: 'data:image/png;base64,AA',
    }).files.find((f) => f.name === 'README.txt')
    expect(readme.content).toMatch(/raster/i)
  })

  /* The build rule: name what isn't in the pack, never fabricate it. The
     mono/reverse previews are real on screen but are NOT shipped as files, so
     the README must say they're available on request rather than implying the
     pack contains them. */
  it('does not fabricate mono/reverse files', () => {
    const r = markPackFiles({
      projectName: 'X',
      logoImage: 'data:image/png;base64,AA',
    })
    const names = r.files.map((f) => f.name)
    expect(names.some((n) => /mono|reverse/i.test(n))).toBe(false)
    const readme = r.files.find((f) => f.name === 'README.txt')
    expect(readme.content).toMatch(/one-colour|reverse/i)
  })
})
