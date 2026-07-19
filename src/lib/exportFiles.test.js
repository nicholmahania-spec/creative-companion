import { describe, expect, it } from 'vitest'
import {
  buildBrandPackSnapshot,
  brandPackToMarkdown,
  brandPackToHtml,
  buildDirectionSheetMarkup,
  slugifyFilename,
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

describe('vector pack snapshot fields', () => {
  it('includes colorRoles and logoImage for the vector PDF engine', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Vector Pack Co',
        tagline: 'Sharp type',
        palette: ['#1C1917', '#0F766E'],
        colorRoles: { cover: '#1C1917', accent: '#0F766E' },
        logoImage: 'data:image/png;base64,abc',
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
    expect(pack.pins[0].packHero).toBe(true)
  })
})
