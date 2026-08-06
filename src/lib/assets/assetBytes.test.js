import { describe, expect, it, vi } from 'vitest'
import {
  BYTE_STATES,
  DB_NAME,
  STORE_NAME,
  assetByteState,
  deleteAssetBytes,
  getAssetBytes,
  loadAssetBytes,
  openAssetCache,
  putAssetBytes,
  requestPersistence,
} from './assetBytes.js'

/**
 * A minimal in-memory IndexedDB, written here rather than pulled in as a
 * dependency.
 *
 * fake-indexeddb would be more faithful, and it is a new production-adjacent
 * dependency for four methods on one object store. What these tests actually
 * need to check is this module's DECISIONS — cache-before-network, silent
 * failure, states — not IndexedDB's conformance, which is not ours to test.
 * The failure modes below are modelled explicitly because they are the ones
 * that matter: a store that throws must look identical to a cache miss.
 */
function fakeIdb({ failOn = null } = {}) {
  const data = new Map()
  const store = {
    get: (k) => req(() => data.get(k)),
    put: (v, k) => req(() => void data.set(k, v)),
    delete: (k) => req(() => void data.delete(k)),
  }
  function req(run) {
    const r = {}
    queueMicrotask(() => {
      try {
        r.result = run()
        r.onsuccess?.()
      } catch (err) {
        r.error = err
        r.onerror?.()
      }
    })
    return r
  }
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: vi.fn(),
    transaction: (name, mode) => {
      if (failOn === mode || failOn === 'all') throw new Error('store unavailable')
      return { objectStore: () => store }
    },
  }
  return { db, data }
}

describe('what a card says about its own bytes', () => {
  it('renders from cache with nothing to say', () => {
    const s = assetByteState({ storagePath: 'o/p/a.png', cached: true })
    expect(s.state).toBe(BYTE_STATES.ready)
    expect(s.label).toBeNull()
  })

  it('prefers the local copy over any server-side problem', () => {
    // A cached asset must render even if the row lost its path and the device
    // is offline. Checking those first is how a working local copy gets
    // hidden behind a problem that does not affect it.
    const s = assetByteState({ storagePath: null, cached: true, online: false })
    expect(s.state).toBe(BYTE_STATES.ready)
  })

  it('separates "never uploaded" from "not downloaded"', () => {
    // The two look identical as a blank rectangle and need opposite actions:
    // one needs a re-push, the other needs a connection.
    const never = assetByteState({ storagePath: null, cached: false })
    const notYet = assetByteState({ storagePath: 'o/p/a.png', cached: false })
    expect(never.state).toBe(BYTE_STATES.missing)
    expect(notYet.state).toBe(BYTE_STATES.remote)
    expect(never.label).not.toBe(notYet.label)
  })

  it('does not offer a retry that cannot work', () => {
    // A control that looks live but does nothing invites the second and third
    // press — the same defect Phase 0 found in the primary button.
    const offline = assetByteState({ storagePath: 'o/p/a.png', cached: false, online: false })
    expect(offline.canRetry).toBe(false)
    expect(offline.label).toMatch(/back online/)

    const online = assetByteState({ storagePath: 'o/p/a.png', cached: false, online: true })
    expect(online.canRetry).toBe(true)
  })

  it('keeps every label non-punitive', () => {
    /* AGENTS.md and the Phase 5 non-punitive work: no alarm words, no blame,
       no elapsed counts. "Failed" is an accusation; "did not finish" is a
       fact. This audience reads an error badge as evidence about themselves. */
    const labels = [
      assetByteState({ storagePath: null, cached: false }),
      assetByteState({ storagePath: 'x', cached: false, online: true }),
      assetByteState({ storagePath: 'x', cached: false, online: false }),
      assetByteState({ storagePath: 'x', cached: false, loading: true }),
    ]
      .map((s) => s.label)
      .filter(Boolean)

    expect(labels.length).toBe(4)
    for (const label of labels) {
      expect(label).not.toMatch(/fail|error|invalid|unable|denied|forbidden|!/i)
      expect(label).not.toMatch(/\bago\b|overdue|still waiting|\d+\s*(day|hour|minute)/i)
    }
  })

  it('handles being called with nothing', () => {
    expect(assetByteState().state).toBe(BYTE_STATES.missing)
    expect(assetByteState({}).state).toBe(BYTE_STATES.missing)
  })
})

describe('the cache', () => {
  it('round-trips bytes under the object path', async () => {
    const { db, data } = fakeIdb()
    expect(await putAssetBytes(db, 'own/proj/a.pdf', 'BYTES')).toBe(true)
    expect(data.get('own/proj/a.pdf')).toBe('BYTES')
    expect(await getAssetBytes(db, 'own/proj/a.pdf')).toBe('BYTES')
  })

  it('deletes', async () => {
    const { db, data } = fakeIdb()
    await putAssetBytes(db, 'k', 'v')
    expect(await deleteAssetBytes(db, 'k')).toBe(true)
    expect(data.has('k')).toBe(false)
  })

  it('reports a miss and a broken store identically', async () => {
    // Both mean "go to the network", and a cache that can throw is a cache
    // that can take the asset panel down with it.
    const working = fakeIdb()
    const broken = fakeIdb({ failOn: 'all' })
    expect(await getAssetBytes(working.db, 'absent')).toBeNull()
    expect(await getAssetBytes(broken.db, 'anything')).toBeNull()
    expect(await getAssetBytes(null, 'k')).toBeNull()
  })

  it('swallows a write failure instead of surfacing it', async () => {
    /* Quota exceeded lands here. The asset is safe in the bucket and the
       fallback already works, so a storage warning would spend the designer's
       attention on something they cannot act on. */
    const { db } = fakeIdb({ failOn: 'readwrite' })
    expect(await putAssetBytes(db, 'k', 'v')).toBe(false)
    expect(await deleteAssetBytes(db, 'k')).toBe(false)
  })

  it('ignores empty arguments rather than writing junk keys', async () => {
    const { db, data } = fakeIdb()
    expect(await putAssetBytes(db, '', 'v')).toBe(false)
    expect(await putAssetBytes(db, 'k', null)).toBe(false)
    expect(data.size).toBe(0)
  })
})

describe('opening the store', () => {
  it('returns null instead of throwing when IndexedDB is unavailable', async () => {
    // Firefox private browsing throws synchronously from open(); Node has no
    // indexedDB at all. Neither may take down a render.
    expect(await openAssetCache(null)).toBeNull()
    const thrower = { open: () => { throw new Error('nope') } }
    expect(await openAssetCache(thrower)).toBeNull()
  })

  it('resolves null on an async open error, and does not hang on blocked', async () => {
    const erroring = {
      open: () => {
        const r = {}
        queueMicrotask(() => r.onerror?.())
        return r
      },
    }
    expect(await openAssetCache(erroring)).toBeNull()

    const blocked = {
      open: () => {
        const r = {}
        queueMicrotask(() => r.onblocked?.())
        return r
      },
    }
    expect(await openAssetCache(blocked)).toBeNull()
  })

  it('creates the store on upgrade, under the documented names', async () => {
    const created = []
    const factory = {
      open: (name, version) => {
        expect(name).toBe(DB_NAME)
        expect(version).toBe(1)
        const db = {
          objectStoreNames: { contains: () => false },
          createObjectStore: (n) => created.push(n),
        }
        const r = { result: db }
        queueMicrotask(() => {
          r.onupgradeneeded?.()
          r.onsuccess?.()
        })
        return r
      },
    }
    expect(await openAssetCache(factory)).toBeTruthy()
    expect(created).toEqual([STORE_NAME])
  })
})

describe('the read path', () => {
  it('serves from cache without touching the network', async () => {
    const { db } = fakeIdb()
    await putAssetBytes(db, 'k', 'CACHED')
    const fetchBytes = vi.fn()

    const out = await loadAssetBytes({ db, key: 'k', fetchBytes, online: true })
    expect(out).toEqual({ blob: 'CACHED', fromCache: true })
    expect(fetchBytes).not.toHaveBeenCalled()
  })

  it('fetches on a miss and caches what comes back', async () => {
    const { db, data } = fakeIdb()
    const fetchBytes = vi.fn().mockResolvedValue('FETCHED')

    const out = await loadAssetBytes({ db, key: 'k', fetchBytes, online: true })
    expect(out).toEqual({ blob: 'FETCHED', fromCache: false })
    expect(data.get('k')).toBe('FETCHED')

    // Second read is local.
    const again = await loadAssetBytes({ db, key: 'k', fetchBytes, online: true })
    expect(again.fromCache).toBe(true)
    expect(fetchBytes).toHaveBeenCalledTimes(1)
  })

  it('does not attempt a fetch it knows cannot succeed', async () => {
    // The signed-URL mint would fail slowly and leave the card in `loading`
    // until it timed out.
    const { db } = fakeIdb()
    const fetchBytes = vi.fn()
    const out = await loadAssetBytes({ db, key: 'k', fetchBytes, online: false })
    expect(out.blob).toBeNull()
    expect(fetchBytes).not.toHaveBeenCalled()
  })

  it('still serves a cached asset while offline — the whole point', async () => {
    // PHASES.md Phase 1b: "The app must still open, read and write projects
    // with no network and no sign-in."
    const { db } = fakeIdb()
    await putAssetBytes(db, 'k', 'CACHED')
    const out = await loadAssetBytes({ db, key: 'k', fetchBytes: null, online: false })
    expect(out).toEqual({ blob: 'CACHED', fromCache: true })
  })

  it('treats a thrown fetch as a miss, not a crash', async () => {
    const { db } = fakeIdb()
    const fetchBytes = vi.fn().mockRejectedValue(new Error('403'))
    const out = await loadAssetBytes({ db, key: 'k', fetchBytes, online: true })
    expect(out).toEqual({ blob: null, fromCache: false })
  })

  it('works with no cache at all', async () => {
    // openAssetCache() returns null on unsupported browsers; the read path
    // must degrade to plain network rather than break.
    const fetchBytes = vi.fn().mockResolvedValue('FETCHED')
    const out = await loadAssetBytes({ db: null, key: 'k', fetchBytes, online: true })
    expect(out.blob).toBe('FETCHED')
  })

  it('returns a miss for an empty key rather than caching under one', async () => {
    const fetchBytes = vi.fn()
    const out = await loadAssetBytes({ db: null, key: '', fetchBytes })
    expect(out).toEqual({ blob: null, fromCache: false })
    expect(fetchBytes).not.toHaveBeenCalled()
  })
})

describe('persistence', () => {
  it('asks, and treats refusal as unremarkable', async () => {
    // The durable copy was never here, so a refusal changes nothing.
    expect(await requestPersistence({ persist: async () => true })).toBe(true)
    expect(await requestPersistence({ persist: async () => false })).toBe(false)
    expect(await requestPersistence({})).toBe(false)
    expect(await requestPersistence(null)).toBe(false)
    expect(
      await requestPersistence({ persist: async () => { throw new Error('x') } })
    ).toBe(false)
  })
})
