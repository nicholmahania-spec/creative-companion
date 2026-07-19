import { describe, expect, it } from 'vitest'
import { BRAND_KITS, getBrandKit } from './brandKits'

describe('brandKits', () => {
  it('exports four stone-first kits', () => {
    expect(BRAND_KITS.length).toBe(4)
    for (const k of BRAND_KITS) {
      expect(k.palette.length).toBeGreaterThanOrEqual(3)
      expect(k.palette.join(' ').toUpperCase()).not.toMatch(/#4F46E5/)
      expect(k.voice.length).toBeGreaterThan(10)
    }
  })

  it('resolves kit by id', () => {
    expect(getBrandKit('stone-calm')?.name).toBe('Stone calm')
    expect(getBrandKit('nope')).toBeNull()
  })
})
