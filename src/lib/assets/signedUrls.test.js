import { describe, expect, it } from 'vitest'
import {
  createSignedUrlCache,
  REFRESH_SKEW_MS,
  SIGNED_TTL_SECONDS,
} from './signedUrls.js'

/** A clock we drive by hand — no timers, no flake. */
function harness({ fail = false } = {}) {
  let t = 1_000_000
  let calls = 0
  const cache = createSignedUrlCache({
    now: () => t,
    sign: async (path) => {
      calls += 1
      return fail ? null : `https://cdn.test/${path}?token=${calls}`
    },
  })
  return {
    cache,
    advance: (ms) => {
      t += ms
    },
    calls: () => calls,
  }
}

describe('signed URLs are memoised per path', () => {
  it('signs once for repeated reads of the same path', async () => {
    const h = harness()
    const a = await h.cache.get('o/p/1.png')
    const b = await h.cache.get('o/p/1.png')
    expect(a).toBe(b)
    expect(h.calls()).toBe(1)
  })

  it('collapses a grid of simultaneous readers onto one signing', async () => {
    /* The case the debt names: 40 cards mount at once and each asks for the
       same object. Without the in-flight map that is 40 requests, and 40
       distinct URLs, and therefore 40 guaranteed CDN misses. */
    const h = harness()
    const urls = await Promise.all(
      Array.from({ length: 40 }, () => h.cache.get('o/p/1.png'))
    )
    expect(h.calls()).toBe(1)
    expect(new Set(urls).size).toBe(1)
  })

  it('keeps different paths apart', async () => {
    const h = harness()
    const a = await h.cache.get('o/p/1.png')
    const b = await h.cache.get('o/p/2.png')
    expect(a).not.toBe(b)
    expect(h.calls()).toBe(2)
  })
})

describe('a URL is replaced before it can expire mid-render', () => {
  it('re-signs inside the skew window, not at the moment of expiry', async () => {
    const h = harness()
    const first = await h.cache.get('o/p/1.png')

    /* Just inside the safe window — still the same URL. */
    h.advance(SIGNED_TTL_SECONDS * 1000 - REFRESH_SKEW_MS - 1000)
    expect(await h.cache.get('o/p/1.png')).toBe(first)
    expect(h.calls()).toBe(1)

    /* Now within the skew of expiry. The URL is still technically valid, and
       that is exactly when it must be replaced: handed to an <img> now, it
       could die before the request goes out, and an expired src renders
       nothing at all rather than reporting an error. */
    h.advance(2000)
    const second = await h.cache.get('o/p/1.png')
    expect(second).not.toBe(first)
    expect(h.calls()).toBe(2)
  })

  it('does not serve a URL that is already dead', async () => {
    const h = harness()
    const first = await h.cache.get('o/p/1.png')
    h.advance(SIGNED_TTL_SECONDS * 1000 + 60_000)
    expect(await h.cache.get('o/p/1.png')).not.toBe(first)
  })
})

describe('failures are not cached', () => {
  it('retries on the next read rather than blanking the card forever', async () => {
    /* Caching a null would turn one expired session into a permanently empty
       grid for the life of the page, with no route back short of a reload. */
    const h = harness({ fail: true })
    expect(await h.cache.get('o/p/1.png')).toBeNull()
    expect(await h.cache.get('o/p/1.png')).toBeNull()
    expect(h.calls()).toBe(2)
    expect(h.cache.size()).toBe(0)
  })

  it('clears the in-flight slot so a failure does not wedge the path', async () => {
    const h = harness({ fail: true })
    await Promise.all([h.cache.get('o/p/1.png'), h.cache.get('o/p/1.png')])
    /* Both collapsed onto one attempt; the next read is free to try again. */
    expect(await h.cache.get('o/p/1.png')).toBeNull()
    expect(h.calls()).toBe(2)
  })
})

describe('invalidation', () => {
  it('forgets one path after its bytes are replaced', async () => {
    const h = harness()
    const first = await h.cache.get('o/p/1.png')
    h.cache.forget('o/p/1.png')
    expect(await h.cache.get('o/p/1.png')).not.toBe(first)
  })

  it('clears everything on sign-out', async () => {
    const h = harness()
    await h.cache.get('o/p/1.png')
    await h.cache.get('o/p/2.png')
    expect(h.cache.size()).toBe(2)
    h.cache.clear()
    expect(h.cache.size()).toBe(0)
  })

  it('returns null for an empty path without signing', async () => {
    const h = harness()
    expect(await h.cache.get('')).toBeNull()
    expect(await h.cache.get(undefined)).toBeNull()
    expect(h.calls()).toBe(0)
  })
})
