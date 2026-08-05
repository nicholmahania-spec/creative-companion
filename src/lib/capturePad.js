/**
 * The half-typed thought, kept.
 *
 * Quick capture exists so an intrusive idea can be put down without derailing
 * what you are doing. That promise breaks at the last step: the capture field
 * was ordinary React state, so typing four words and then navigating, closing
 * the tab, or being interrupted lost them with no trace. An object-permanence
 * failure inside the one feature built for object permanence — and the user
 * has no way to know it happened, because there is nothing left to notice.
 *
 * WHY NOT `PERSISTED_KEYS`. That list is the workspace payload: it feeds cloud
 * sync and every JSON backup. A draft line is device-local by nature — you are
 * typing it on this machine, right now, and it is finished within seconds.
 * Syncing it would put an unfinished fragment into conflict resolution
 * (Phase 1b) for no benefit, and put it in the client's backup file for less.
 * So it lives beside the workspace, not inside it.
 *
 * Deliberately forgiving: every function here swallows storage errors. Private
 * browsing, a full quota or a disabled localStorage must degrade to "capture
 * works but does not survive reload", never to a capture box that throws.
 */

const KEY = 'cc.capturePad.v1'

/** Longer than any real capture line; stops a pathological paste filling quota. */
const MAX = 2000

/** The draft left over from last time, or '' if there is none. */
export function loadCapturePad(storage) {
  const s = storage ?? safeStorage()
  if (!s) return ''
  try {
    const raw = s.getItem(KEY)
    return typeof raw === 'string' ? raw.slice(0, MAX) : ''
  } catch {
    return ''
  }
}

/**
 * Remember the draft. Empty clears it rather than storing '' — an empty key
 * left behind would survive a successful capture and read as "there is
 * something here" to anything that checks for presence.
 */
export function saveCapturePad(text, storage) {
  const s = storage ?? safeStorage()
  if (!s) return false
  try {
    if (!text) s.removeItem(KEY)
    else s.setItem(KEY, String(text).slice(0, MAX))
    return true
  } catch {
    return false
  }
}

export function clearCapturePad(storage) {
  return saveCapturePad('', storage)
}

function safeStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export const CAPTURE_PAD_KEY = KEY
