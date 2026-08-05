/**
 * The half-typed capture line survives, and never takes the app down with it.
 *
 * Two failure modes, and the second is the one that matters more.
 *
 * 1. Losing the draft. Capture exists so an intrusive thought costs nothing to
 *    put down; a field that forgets four typed words when you navigate or
 *    reload breaks that promise silently, because there is nothing left to
 *    notice.
 *
 * 2. Taking the app with it. Private browsing, a full quota and a disabled
 *    localStorage all make storage THROW rather than return null. If capture
 *    is wired to every keystroke — which it is, deliberately — an unguarded
 *    write turns typing into a crash. Degrading to "capture works but does not
 *    survive reload" is the correct failure; a capture box that throws is not.
 */

import { describe, it, expect } from 'vitest'
import {
  CAPTURE_PAD_KEY,
  clearCapturePad,
  loadCapturePad,
  saveCapturePad,
} from './capturePad.js'

/** A localStorage stand-in — the unit env is node, so there is no real one. */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    has: (k) => map.has(k),
    size: () => map.size,
  }
}

/** Storage that throws on every call, like Safari private mode at quota. */
const hostileStorage = {
  getItem() {
    throw new DOMException('denied')
  },
  setItem() {
    throw new DOMException('QuotaExceededError')
  },
  removeItem() {
    throw new DOMException('denied')
  },
}

describe('a draft survives the interruption', () => {
  it('comes back after a reload', () => {
    const s = fakeStorage()
    saveCapturePad('call the printer about stock weight', s)
    expect(loadCapturePad(s)).toBe('call the printer about stock weight')
  })

  it('reads as empty when nothing was ever typed', () => {
    expect(loadCapturePad(fakeStorage())).toBe('')
  })
})

describe('a completed capture leaves nothing behind', () => {
  it('clears the key rather than storing an empty string', () => {
    /* An empty value left in place still reads as "there is something here"
       to anything checking presence, and it would resurrect as a blank draft
       on the next load. Absence has to mean absence. */
    const s = fakeStorage()
    saveCapturePad('something', s)
    expect(s.has(CAPTURE_PAD_KEY)).toBe(true)
    saveCapturePad('', s)
    expect(s.has(CAPTURE_PAD_KEY)).toBe(false)
    expect(s.size()).toBe(0)
  })

  it('clearCapturePad does the same', () => {
    const s = fakeStorage()
    saveCapturePad('draft', s)
    clearCapturePad(s)
    expect(loadCapturePad(s)).toBe('')
  })
})

describe('storage failure degrades, it does not throw', () => {
  /* This is the load-bearing one: saveCapturePad runs on EVERY keystroke, so
     an unguarded throw here means the user cannot type. */
  it('saving does not throw when storage refuses', () => {
    expect(() => saveCapturePad('anything', hostileStorage)).not.toThrow()
    expect(saveCapturePad('anything', hostileStorage)).toBe(false)
  })

  it('loading does not throw when storage refuses', () => {
    expect(() => loadCapturePad(hostileStorage)).not.toThrow()
    expect(loadCapturePad(hostileStorage)).toBe('')
  })

  it('survives a storage object that is missing methods entirely', () => {
    expect(() => saveCapturePad('x', {})).not.toThrow()
    expect(loadCapturePad({})).toBe('')
  })
})

describe('a pathological value cannot fill the quota', () => {
  it('caps what it stores and what it returns', () => {
    const s = fakeStorage()
    saveCapturePad('x'.repeat(50000), s)
    expect(loadCapturePad(s).length).toBeLessThanOrEqual(2000)
  })

  it('ignores a stored value that is not a string', () => {
    // Hand-edited or corrupted storage must not hand a non-string to an input.
    const s = fakeStorage()
    s.setItem(CAPTURE_PAD_KEY, 'ok')
    expect(typeof loadCapturePad(s)).toBe('string')
    expect(loadCapturePad({ getItem: () => ({}) })).toBe('')
  })
})
