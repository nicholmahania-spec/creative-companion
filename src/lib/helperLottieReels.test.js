import { describe, expect, it } from 'vitest'
import {
  HELPER_BODY_ASSET,
  HELPER_BODY_REELS,
  reelForMood,
} from './helperLottieReels'

describe('helperLottieReels (photoreal full-body)', () => {
  it('exports four body reels with image asset', () => {
    for (const key of ['idle', 'happy', 'think', 'rest']) {
      const reel = HELPER_BODY_REELS[key]
      expect(reel).toBeTruthy()
      expect(reel.assets?.[0]?.p).toBe('helper-body.png')
      expect(reel.assets?.[0]?.id).toBe(HELPER_BODY_ASSET.id)
      expect(reel.layers?.[0]?.ty).toBe(2) // image layer
      expect(reel.layers?.[0]?.refId).toBe(HELPER_BODY_ASSET.id)
      expect(reel.w).toBeGreaterThan(0)
      expect(reel.h).toBeGreaterThan(0)
    }
  })

  it('maps mood aliases to reels', () => {
    expect(reelForMood('idle').nm).toContain('idle')
    expect(reelForMood('win').nm).toContain('happy')
    expect(reelForMood('celebrate').nm).toContain('happy')
    expect(reelForMood('coach').nm).toContain('think')
    expect(reelForMood('hyper').nm).toContain('think')
    expect(reelForMood('break').nm).toContain('rest')
    expect(reelForMood('unknown').nm).toContain('idle')
  })

  it('happy reel has animated position', () => {
    const happy = reelForMood('happy')
    expect(happy.layers[0].ks.p.a).toBe(1)
    expect(happy.layers[0].ks.p.k.length).toBeGreaterThan(1)
  })
})
