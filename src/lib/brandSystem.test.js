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

describe('every assigned colour job reaches the client', () => {
  /* The gap this pins. `roleRows` feeds tokens.css, tokens.json, brand.md and
     the brand book's swatch labels — it is the entire route by which a colour's
     JOB (not just its hex) reaches the client. It was a hardcoded list of the
     original four, so when the vocabulary grew to nine, a designer could assign
     a Secondary or a Neutral and the client would never learn which hex it was.
     The colour still shipped, anonymously, as a numbered swatch.

     Nothing caught it: 999 tests were green, and the test above still passes
     honestly because its fixture assigns no roles at all, so `mapPaletteRoles`
     supplies exactly the legacy four. */
  it('carries Secondary and Neutrals through, not just the original four', async () => {
    const { buildColorSystem } = await import('./brandSystem.js')
    const sys = buildColorSystem(
      ['#1C1917', '#0F766E', '#A8A29E', '#FAFAF9', '#7C3AED'],
      {
        cover: '#1C1917',
        secondary: '#7C3AED',
        accent: '#0F766E',
        neutral: '#A8A29E',
        text: '#1C1917',
        quiet: '#FAFAF9',
      }
    )
    const roles = sys.roleRows.map((r) => r.role)
    expect(roles).toContain('secondary')
    expect(roles).toContain('neutral')
  })

  it('skips a job nobody assigned rather than emitting it blank', () => {
    /* An unanswered job is not an answer. Printing `accent3: ""` into a
       client's token file would be worse than omitting it — the same rule
       `brandRoles.test.js` pins for the UI. */
    const sys = buildColorSystem(['#0C0A09', '#FAFAF9', '#0F766E'])
    expect(sys.roleRows.every((r) => r.hex)).toBe(true)
    expect(sys.roleRows.map((r) => r.role)).not.toContain('accent3')
  })

  it('labels jobs the way the designer was shown them', () => {
    /* The client's brand.md said "cover" and "quiet" — the app's own internal
       storage keys — where the designer had been shown "Primary" and
       "Background". */
    const sys = buildColorSystem(['#0C0A09', '#FAFAF9', '#0F766E'])
    const cover = sys.roleRows.find((r) => r.role === 'cover')
    expect(cover.label).toBe('Primary')
    const quiet = sys.roleRows.find((r) => r.role === 'quiet')
    expect(quiet?.label).toBe('Background')
  })

  it('describes what every job is for', () => {
    // A job with no description reaches the client as a bare hex with a name
    // and no guidance — which is what a brand book exists to prevent.
    const sys = buildColorSystem(
      ['#1C1917', '#0F766E', '#A8A29E', '#FAFAF9', '#7C3AED'],
      { secondary: '#7C3AED', neutral: '#A8A29E' }
    )
    for (const r of sys.roleRows) expect(r.job, r.role).toBeTruthy()
  })
})
