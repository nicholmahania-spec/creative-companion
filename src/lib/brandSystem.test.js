import { describe, it, expect } from 'vitest'
import {
  hexToCmyk,
  colorSpec,
  buildColorSystem,
  buildCssTokens,
  buildJsonTokens,
  logoDontsList,
  appendSystemMarkdown,
  DEFAULT_LOGO_DONTS,
} from './brandSystem'

describe('hexToCmyk / colorSpec', () => {
  it('converts pure black and white', () => {
    expect(hexToCmyk('#000000').k).toBe(100)
    expect(hexToCmyk('#FFFFFF').k).toBe(0)
  })

  it('builds full color spec', () => {
    const s = colorSpec('#0F766E', { role: 'accent' })
    expect(s.hex).toBe('#0F766E')
    expect(s.rgb).toMatch(/rgb\(/)
    expect(s.cmyk).toMatch(/^C\d+/)
    expect(s.job).toMatch(/CTA|accent/i)
  })
})

describe('buildColorSystem', () => {
  it('maps roles and AA pairs', () => {
    const sys = buildColorSystem(['#0C0A09', '#FAFAF9', '#0F766E'])
    expect(sys.roleRows.length).toBe(4)
    expect(sys.passPairs.length).toBeGreaterThan(0)
    expect(sys.roleRows[0].cmyk).toBeTruthy()
  })
})

describe('tokens', () => {
  it('emits CSS custom properties', () => {
    const css = buildCssTokens({
      projectName: 'Soft Signal',
      palette: ['#111111', '#FAFAF9', '#0F766E'],
      typeHeading: 'Plus Jakarta Sans Bold',
      typeBody: 'Plus Jakarta Sans Regular',
    })
    expect(css).toMatch(/--brand-cover/)
    expect(css).toMatch(/Soft Signal/)
  })

  it('emits JSON tokens with scale', () => {
    const j = buildJsonTokens({
      projectName: 'X',
      palette: ['#111', '#FFF'],
      messagingPromise: 'Calm clinic care',
    })
    expect(j.messaging.promise).toMatch(/Calm/)
    expect(j.typography.scale.length).toBeGreaterThan(2)
  })
})

describe('logoDontsList / appendSystemMarkdown', () => {
  it('defaults when empty', () => {
    expect(logoDontsList({})).toEqual(DEFAULT_LOGO_DONTS)
  })

  it('parses custom lines', () => {
    expect(
      logoDontsList({ logoDonts: 'No stretch\nNo neon' })
    ).toEqual(['No stretch', 'No neon'])
  })

  it('appends system sections to markdown', () => {
    const lines = appendSystemMarkdown(['# Brand', ''], {
      palette: ['#0C0A09', '#FAFAF9'],
      typeHeading: 'A',
      typeBody: 'B',
      messagingPromise: 'We deliver calm',
      imageryStyle: 'Soft light',
    })
    const md = lines.join('\n')
    expect(md).toMatch(/Color system/)
    expect(md).toMatch(/Messaging pillars/)
    expect(md).toMatch(/Type scale/)
    expect(md).toMatch(/Imagery guidelines/)
    expect(md).toMatch(/Logo don'ts|Logo don’ts|Logo/i)
  })
})
