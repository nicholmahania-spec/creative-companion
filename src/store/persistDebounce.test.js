/**
 * Persisted writes are debounced (issue #6).
 *
 * The workspace persists as one blob and brief fields write on every
 * keystroke. A synchronous JSON.stringify + localStorage.setItem per character
 * is visible typing lag once the store holds real projects/images. The custom
 * storage must coalesce rapid writes into one trailing write, flush on demand
 * (tab-hide/unload), and never let a stale pending write survive a clear.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import useAppStore, { flushPersist } from './useAppStore'

describe('persisted write debounce', () => {
  let ls
  let setSpy

  beforeEach(() => {
    vi.useFakeTimers()
    // Minimal localStorage the store's global `localStorage` reference resolves
    // to (this suite runs in the node env, which has none).
    const mem = new Map()
    ls = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, v) },
      removeItem: (k) => { mem.delete(k) },
      clear: () => mem.clear(),
    }
    globalThis.localStorage = ls
    flushPersist() // drain anything scheduled before the spy is attached
    setSpy = vi.spyOn(ls, 'setItem')
  })

  afterEach(() => {
    setSpy.mockRestore()
    vi.useRealTimers()
    delete globalThis.localStorage
  })

  it('does not write synchronously on a state change', () => {
    useAppStore.setState({ sparksTried: 1 })
    expect(setSpy).not.toHaveBeenCalled()
  })

  it('writes once after the debounce window, coalescing rapid changes', () => {
    useAppStore.setState({ sparksTried: 2 })
    useAppStore.setState({ sparksTried: 3 })
    useAppStore.setState({ sparksTried: 4 })
    expect(setSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(400)
    expect(setSpy).toHaveBeenCalledTimes(1)

    // The single write reflects the latest value.
    const written = JSON.parse(setSpy.mock.calls[0][1])
    expect(written.state.sparksTried).toBe(4)
  })

  it('flushPersist writes the pending value immediately', () => {
    useAppStore.setState({ sparksTried: 7 })
    expect(setSpy).not.toHaveBeenCalled()

    flushPersist()
    expect(setSpy).toHaveBeenCalledTimes(1)

    // Nothing left to flush.
    setSpy.mockClear()
    vi.advanceTimersByTime(400)
    expect(setSpy).not.toHaveBeenCalled()
  })

  it('clearing storage cancels a pending debounced write', () => {
    useAppStore.setState({ sparksTried: 9 })
    useAppStore.persist.clearStorage() // routes through storage.removeItem
    setSpy.mockClear()

    vi.advanceTimersByTime(400)
    expect(setSpy).not.toHaveBeenCalled()
  })
})
