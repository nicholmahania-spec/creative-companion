import { describe, expect, it } from 'vitest'
import {
  buildBrandPackSnapshot,
  packReadiness,
  brandPackToMarkdown,
  brandPackToHtml,
  buildDirectionSheetMarkup,
  packBriefMarkdown,
  slugifyFilename,
  downloadBrandPackVectorPdf,
  downloadProjectOverviewPdf,
} from './exportFiles'

describe('slugifyFilename', () => {
  it('slugifies project names', () => {
    expect(slugifyFilename('Soft Signal Covers!')).toBe('soft-signal-covers')
  })
  it('falls back when empty', () => {
    expect(slugifyFilename('')).toBe('creative-companion')
    expect(slugifyFilename('???', 'pack')).toBe('pack')
  })
})

describe('buildBrandPackSnapshot', () => {
  it('builds a real empty-friendly pack from blank project pieces', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Test Pack',
        brief: 'Who: founders. Outcome: trust.',
        tagline: 'Quiet focus',
        voice: 'Calm direct',
        palette: ['#4F46E5', '#0D9488'],
      },
      tasks: [
        { id: 1, title: 'Write tagline', completed: false },
        { id: 2, title: 'Pick type pair', completed: true },
      ],
      moodItems: [
        {
          id: 9,
          type: 'color',
          note: 'Indigo calm',
          visual: '#4F46E5',
          inPack: true,
        },
      ],
    })

    expect(pack.projectName).toBe('Test Pack')
    expect(pack.tagline).toBe('Quiet focus')
    expect(pack.openTasks).toHaveLength(1)
    expect(pack.openTasks[0].title).toBe('Write tagline')
    expect(pack.doneCount).toBe(1)
    expect(pack.totalCount).toBe(2)
    expect(pack.progressPercent).toBe(50)
    expect(pack.palette).toEqual(['#4F46E5', '#0D9488'])
    // empty concept package omitted
    expect(pack.conceptPackage).toBeNull()
    expect(pack.pins[0].note).toBe('Indigo calm')
    expect(pack.app).toBe('Creative Companion')
    expect(pack.exportedAt).toMatch(/^\d{4}-/)
  })

  it('does not invent fake client names when empty', () => {
    const pack = buildBrandPackSnapshot({})
    expect(pack.projectName).toBe('Untitled project')
    expect(pack.brief).toBe('')
    expect(pack.openTasks).toEqual([])
    expect(pack.pins).toEqual([])
  })

  it('includes only starred pack pins (no fallback)', () => {
    const pack = buildBrandPackSnapshot({
      moodItems: [
        { id: 1, type: 'image', note: 'A', visual: '#111', inPack: false },
        { id: 2, type: 'image', note: 'B', visual: '#222', inPack: true },
      ],
    })
    expect(pack.pins).toHaveLength(1)
    expect(pack.pins[0].note).toBe('B')
    expect(pack.pinsStarredCount).toBe(1)
    expect(pack.pinsUsedFallback).toBe(false)
  })
})

describe('brandPackToMarkdown / brandPackToHtml', () => {
  const pack = buildBrandPackSnapshot({
    project: {
      name: 'Atlas',
      tagline: 'Maps for calm',
      brief: 'Design system for a focus app.',
      doUse: 'Soft contrast',
      dontUse: 'Neon chaos',
      typeHeading: 'Display Bold',
      typeBody: 'Body Regular',
      palette: ['#112233'],
    },
    tasks: [{ id: 1, title: 'Lock type pair', completed: false }],
  })

  it('renders markdown with core sections', () => {
    const md = brandPackToMarkdown(pack)
    expect(md).toContain('# Atlas')
    expect(md).toContain('Maps for calm')
    expect(md).toContain('## Palette')
    expect(md).toContain('#112233')
    expect(md).toContain('Lock type pair')
    expect(md).toContain("## Don't")
  })

  it('renders standalone HTML offline pack', () => {
    const html = brandPackToHtml(pack)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Atlas')
    expect(html).toContain('Direction sheet')
    expect(html).toContain('#112233')
    expect(html).toContain('window.print')
  })
})

describe('buildDirectionSheetMarkup (preview-faithful PDF source)', () => {
  it('mirrors Export pack preview structure and classes', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Soft Signal',
        tagline: 'Quiet focus',
        brief: 'ADHD-friendly desk',
        doUse: 'Soft contrast',
        dontUse: 'Neon',
        typeHeading: 'Display Bold',
        typeBody: 'Body Regular',
        palette: ['#4F46E5', '#0D9488'],
      },
      tasks: [{ id: 1, title: 'Lock type', completed: false }],
      moodItems: [
        {
          id: 2,
          type: 'color',
          note: 'Indigo',
          visual: '#4F46E5',
          inPack: true,
        },
      ],
    })
    const html = buildDirectionSheetMarkup(pack)
    expect(html).toContain('direction-sheet')
    expect(html).toContain('export-identity-cover')
    expect(html).toContain('Direction sheet')
    expect(html).toContain('Soft Signal')
    expect(html).toContain('Quiet focus')
    expect(html).toContain('direction-palette')
    expect(html).toContain('export-do-dont')
    expect(html).toContain('direction-pins')
    expect(html).toContain('direction-tasks')
    expect(html).toContain('Lock type')
    expect(html).toContain('Mood direction')
    expect(html).toContain('Open work')
  })
})

describe('designVersion bump helper is store-level', () => {
  it('snapshot includes designVersion and detective', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Ver',
        designVersion: 'v3',
        detective: { goal: 'G', audience: 'A' },
      },
    })
    expect(pack.designVersion).toBe('v3')
    expect(pack.detective?.goal).toBe('G')
  })
})

describe('packReadiness detective + handoff', () => {
  it('accepts detective goal as positioning signal', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Demo',
        brief: '',
        detective: { goal: 'Help families feel safe', audience: 'Parents' },
        palette: ['#111', '#222'],
        tagline: 'Safe',
        voice: 'Warm',
      },
      moodItems: [
        { id: 1, type: 'color', note: 'x', visual: '#111', inPack: true },
      ],
    })
    const r = packReadiness(pack)
    expect(r.checks.find((c) => c.id === 'detective')?.ok).toBe(true)
    expect(r.checks.find((c) => c.id === 'brief')?.ok).toBe(true)
    expect(r.checks.find((c) => c.id === 'handoff')?.ok).toBe(false)
    expect(r.thin).toBe(false)
  })
})

describe('vector pack snapshot fields', () => {
  it('includes colorRoles, logo lockup fields, and directions for brand book PDF', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Vector Pack Co',
        tagline: 'Sharp type',
        palette: ['#1C1917', '#0F766E'],
        colorRoles: { cover: '#1C1917', accent: '#0F766E' },
        logoImage: 'data:image/png;base64,abc',
        logoWordmark: 'Vector Co',
        logoClearspace: '½ mark height',
        logoDirection: 'Monoline mark',
        directions: [
          { id: 'a', label: 'A', title: 'Quiet', note: 'Soft', chosen: true },
        ],
      },
      moodItems: [
        {
          id: 1,
          type: 'color',
          note: 'Ink',
          visual: '#1C1917',
          inPack: true,
          packHero: true,
        },
      ],
    })
    expect(pack.colorRoles?.cover).toBe('#1C1917')
    expect(pack.logoImage).toContain('data:image')
    expect(pack.logoWordmark).toBe('Vector Co')
    expect(pack.logoClearspace).toMatch(/mark/)
    expect(pack.logoDirection).toMatch(/Monoline/)
    expect(pack.directions[0].chosen).toBe(true)
    expect(pack.pins[0].packHero).toBe(true)
  })

  it('includes messaging, imagery, and decision log in snapshot', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Full Kit Co',
        messagingPromise: 'Calm care',
        messagingProof: '10 years',
        messagingPersonality: 'Warm expert',
        imageryStyle: 'Soft light',
        imageryDo: 'Real hands',
        imageryDont: 'Stock handshakes',
        logoMinSize: '24px',
        logoDonts: 'No stretch',
        decisionLog: [
          { kind: 'direction', label: 'B', title: 'Quiet teal', why: 'calm' },
        ],
      },
      palette: ['#111111', '#FAFAF9'],
    })
    expect(pack.messagingPromise).toMatch(/Calm/)
    expect(pack.imageryStyle).toMatch(/Soft/)
    expect(pack.logoMinSize).toBe('24px')
    expect(pack.decisionLog[0].label).toBe('B')
    const md = brandPackToMarkdown(pack)
    expect(md).toMatch(/Messaging pillars|Promise/)
    expect(md).toMatch(/Color system|CMYK|rgb/i)
    expect(md).toMatch(/Type scale/)
    expect(md).toMatch(/Imagery/)
  })
})

describe('downloadProjectOverviewPdf quality', () => {
  it('filled mode omits empty fields and blank mode includes AcroForm pages', async () => {
    const sparse = {
      name: 'My project',
      detective: {
        engagementType: 'extend',
      },
    }
    const filled = await downloadProjectOverviewPdf(sparse, {
      returnBlobOnly: true,
      blank: false,
    })
    expect(filled.ok).toBe(true)
    expect(filled.mode).toBe('filled')
    // One answered field → single short page, not a 2-page dash graveyard
    expect(filled.pages).toBe(1)

    const blank = await downloadProjectOverviewPdf(sparse, {
      returnBlobOnly: true,
      blank: true,
    })
    expect(blank.ok).toBe(true)
    expect(blank.mode).toBe('blank')
    expect(blank.pages).toBeGreaterThanOrEqual(2)
    expect(blank.pages).toBeLessThanOrEqual(3)
  })

  it('filled mode with no answers is a one-page note, not empty dashes', async () => {
    const empty = await downloadProjectOverviewPdf(
      { name: 'Empty Co', detective: {} },
      { returnBlobOnly: true, blank: false }
    )
    expect(empty.ok).toBe(true)
    expect(empty.pages).toBe(1)
  })
})

describe('downloadBrandPackVectorPdf quality', () => {
  it('skips empty chapters, avoids fake contact, and keeps WinAnsi-safe text', async () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'My project',
        tagline: '',
        palette: ['#1C1917', '#0F766E', '#A8A29E', '#FAFAF9'],
        colorRoles: {
          cover: '#1C1917',
          text: '#FFFFFF',
          accent: '#A8A29E',
          quiet: '#FAFAF9',
        },
        typeHeading: 'Plus Jakarta Sans Bold',
        typeBody: 'Plus Jakarta Sans Regular',
        designVersion: 'v1',
        orgEmail: '',
        orgWebsite: '',
      },
      tasks: [],
      moodItems: [],
    })

    const result = await downloadBrandPackVectorPdf(pack, null, {
      returnBlobOnly: true,
    })
    expect(result.ok).toBe(true)
    // Thin pack: cover + positioning (+ optional brief) + color + type + logo + card
    // (no empty overview / previous / usage / imagery filler pages)
    expect(result.pages).toBeGreaterThanOrEqual(6)
    expect(result.pages).toBeLessThanOrEqual(8)

    const buf = Buffer.from(await result.blob.arrayBuffer())
    const text = buf.toString('latin1')
    // Never invent placeholder contact on the business-card specimen
    expect(text).not.toMatch(/hello@brand\.example/)
    expect(text).not.toMatch(/you@example\.com/)
  })
})

describe('packBriefMarkdown', () => {
  it('builds a short client brief', () => {
    const md = packBriefMarkdown({
      projectName: 'Soft Signal',
      tagline: 'Calm covers',
      brief: 'For designers who scatter.',
      palette: ['#1C1917', '#0F766E'],
      pins: [{ note: 'Mood A' }],
    })
    expect(md).toMatch(/Soft Signal/)
    expect(md).toMatch(/Calm covers/)
    expect(md).toMatch(/#1C1917/)
    expect(md).toMatch(/Mood A/)
    expect(md.length).toBeLessThan(800)
  })
})
