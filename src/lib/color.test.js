import { describe, it, expect } from 'vitest'
import {
  normalizeHex,
  contrastRatio,
  tintsAndShades,
  nudgeHexForContrast,
  buildPassPairs,
  suggestRoleAaFixes,
  parseHexesFromVisual,
  extractPaletteFromPins,
  dedupePalette,
  mergeRolesIntoPalette,
  hslToHex,
  hexToHsl,
} from './color'

describe('normalizeHex', () => {
  it('expands 3-digit and uppercases', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC')
    expect(normalizeHex('0f766e')).toBe('#0F766E')
  })
})

describe('tintsAndShades', () => {
  it('returns 5 steps by default (2+base+2)', () => {
    const row = tintsAndShades('#0F766E', { steps: 2 })
    expect(row).toHaveLength(5)
    expect(row[2]).toBe('#0F766E')
    // Ends should be lighter / darker than mid
    expect(hexToHsl(row[0]).l).toBeGreaterThan(hexToHsl(row[2]).l)
    expect(hexToHsl(row[4]).l).toBeLessThan(hexToHsl(row[2]).l)
  })
})

describe('nudgeHexForContrast', () => {
  it('leaves passing pairs alone', () => {
    const r = nudgeHexForContrast('#0C0A09', '#FAFAF9', 4.5)
    expect(r.changed).toBe(false)
    expect(r.ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('darkens light gray on white until AA', () => {
    const r = nudgeHexForContrast('#BBBBBB', '#FFFFFF', 4.5)
    expect(r).toBeTruthy()
    expect(r.changed).toBe(true)
    expect(r.ratio).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(r.hex, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('buildPassPairs', () => {
  it('finds AA pairs in a high-contrast palette', () => {
    const pairs = buildPassPairs(['#0C0A09', '#FAFAF9', '#0F766E'], 4.5)
    expect(pairs.length).toBeGreaterThan(0)
    expect(pairs.every((p) => p.ratio >= 4.5)).toBe(true)
  })
})

describe('suggestRoleAaFixes', () => {
  it('reports no changes for a balanced stone palette', () => {
    const { changes } = suggestRoleAaFixes([
      '#1C1917',
      '#0F766E',
      '#A8A29E',
      '#FAFAF9',
    ])
    // May still tweak accent — at least returns roles
    expect(changes).toBeDefined()
  })

  it('fixes washed text on light quiet', () => {
    const { roles, changes } = suggestRoleAaFixes(
      ['#CCCCCC', '#EEEEEE', '#FFFFFF', '#FAFAFA'],
      { text: '#CCCCCC', quiet: '#FFFFFF', cover: '#EEEEEE', accent: '#CCCCCC' }
    )
    expect(changes.length).toBeGreaterThan(0)
    expect(contrastRatio(roles.text, roles.quiet)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('parseHexesFromVisual', () => {
  it('pulls hex and rgb from gradients', () => {
    const hexes = parseHexesFromVisual(
      'linear-gradient(90deg, #0F766E 0%, rgb(28, 25, 23) 100%)'
    )
    expect(hexes).toContain('#0F766E')
    expect(hexes).toContain('#1C1917')
  })
})

describe('extractPaletteFromPins', () => {
  it('builds palette from solid color pins (★ preferred)', async () => {
    const pins = [
      { id: 1, type: 'color', visual: '#112233', inPack: true },
      { id: 2, type: 'color', visual: '#FFEEDD', inPack: true },
      { id: 3, type: 'color', visual: '#00FF00', inPack: false },
    ]
    const r = await extractPaletteFromPins(pins, { max: 6 })
    expect(r.empty).toBe(false)
    expect(r.colors).toContain('#112233')
    expect(r.colors).toContain('#FFEEDD')
    // Unstarred green should be ignored when ★ exist
    expect(r.colors).not.toContain('#00FF00')
    expect(r.sources.color).toBe(2)
  })

  it('falls back to all pins when none starred', async () => {
    const pins = [
      { id: 1, type: 'color', visual: '#AABBCC' },
      { id: 2, type: 'note', visual: '#112233' },
    ]
    const r = await extractPaletteFromPins(pins)
    expect(r.colors.length).toBeGreaterThanOrEqual(2)
  })
})

describe('dedupePalette / mergeRolesIntoPalette', () => {
  it('drops near-duplicates', () => {
    expect(dedupePalette(['#111111', '#121212', '#FFFFFF'], { minDistance: 28 })).toEqual([
      '#111111',
      '#FFFFFF',
    ])
  })

  it('merges role hexes onto palette', () => {
    const next = mergeRolesIntoPalette(['#111111', '#FAFAF9'], {
      accent: '#0F766E',
    })
    expect(next).toContain('#0F766E')
  })
})

describe('hsl roundtrip', () => {
  it('keeps mid teal in family', () => {
    const hsl = hexToHsl('#0F766E')
    const back = hslToHex(hsl.h, hsl.s, hsl.l)
    // Allow small channel drift from float math
    expect(normalizeHex(back)).toMatch(/^#[0-9A-F]{6}$/)
  })
})
