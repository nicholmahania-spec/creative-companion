/**
 * Client-side access gate for a public static site.
 *
 * Honest limits:
 * - This is NOT cloud login / multi-user accounts.
 * - Password hash lives in this browser’s localStorage.
 * - Project data is separate (Zustand key creative-companion-storage).
 * - A determined visitor can still inspect/bypass client-side gates.
 * - Good for casual privacy on a public URL; not bank-level security.
 */

const ACCESS_KEY = 'cc-access-v1'
const SESSION_KEY = 'cc-session-v1'
const PIN_FAILURE_KEY = 'cc-pin-failures-v1'

function bytesToHex(buf) {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashPassword(password, salt) {
  const enc = new TextEncoder()
  const data = enc.encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(digest)
}

export function getAccessRecord() {
  try {
    const raw = localStorage.getItem(ACCESS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.salt || !parsed?.hash) return null
    return parsed
  } catch {
    return null
  }
}

export function hasAccessSetup() {
  return !!getAccessRecord()
}

export async function setupAccess({ name, password }) {
  const cleanName = String(name || '').trim() || 'You'
  const pass = String(password || '')
  if (pass.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' }
  }
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
  const hash = await hashPassword(pass, salt)
  const record = {
    name: cleanName,
    salt,
    hash,
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(ACCESS_KEY, JSON.stringify(record))
  openSession(cleanName)
  return { ok: true, name: cleanName }
}

export async function verifyAccess(password) {
  const record = getAccessRecord()
  if (!record) return { ok: false, error: 'No access set up yet' }
  const hash = await hashPassword(String(password || ''), record.salt)
  if (hash !== record.hash) {
    return { ok: false, error: 'Incorrect password' }
  }
  localStorage.removeItem(PIN_FAILURE_KEY)
  openSession(record.name)
  return { ok: true, name: record.name }
}

export function hasPinSetup() {
  const record = getAccessRecord()
  return !!(record?.pinSalt && record?.pinHash)
}

export async function setAccessPin(currentPassword, pin) {
  const value = String(pin || '')
  if (!/^\d{4}$/.test(value)) {
    return { ok: false, error: 'PIN must be exactly 4 digits' }
  }
  const check = await verifyAccess(currentPassword)
  if (!check.ok) return check
  const record = getAccessRecord()
  const pinSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
  const pinHash = await hashPassword(value, pinSalt)
  localStorage.setItem(
    ACCESS_KEY,
    JSON.stringify({ ...record, pinSalt, pinHash, pinUpdatedAt: new Date().toISOString() })
  )
  localStorage.removeItem(PIN_FAILURE_KEY)
  return { ok: true }
}

export async function verifyPin(pin) {
  const record = getAccessRecord()
  if (!record?.pinSalt || !record?.pinHash) {
    return { ok: false, error: 'Use your password to sign in' }
  }
  let failures = 0
  try { failures = Number(localStorage.getItem(PIN_FAILURE_KEY) || 0) } catch { /* ignore */ }
  if (failures >= 5) return { ok: false, locked: true, error: 'Use your password to sign in' }
  const hash = await hashPassword(String(pin || ''), record.pinSalt)
  if (hash !== record.pinHash) {
    const next = failures + 1
    try { localStorage.setItem(PIN_FAILURE_KEY, String(next)) } catch { /* ignore */ }
    return {
      ok: false,
      locked: next >= 5,
      error: next >= 5
        ? 'Use your password to sign in'
        : 'That PIN didn’t match. Try again or use your password.',
    }
  }
  localStorage.removeItem(PIN_FAILURE_KEY)
  openSession(record.name)
  return { ok: true, name: record.name }
}

export async function removeAccessPin(currentPassword) {
  const check = await verifyAccess(currentPassword)
  if (!check.ok) return check
  const record = getAccessRecord()
  const { pinSalt, pinHash, pinUpdatedAt, ...next } = record
  localStorage.setItem(ACCESS_KEY, JSON.stringify(next))
  localStorage.removeItem(PIN_FAILURE_KEY)
  return { ok: true }
}

export async function changeAccessPassword(currentPassword, nextPassword) {
  const check = await verifyAccess(currentPassword)
  if (!check.ok) return check
  const record = getAccessRecord()
  if (!record) return { ok: false, error: 'No access set up' }
  if (String(nextPassword || '').length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters' }
  }
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
  const hash = await hashPassword(nextPassword, salt)
  localStorage.setItem(
    ACCESS_KEY,
    JSON.stringify({
      ...record,
      salt,
      hash,
      pinSalt: undefined,
      pinHash: undefined,
      pinUpdatedAt: undefined,
      updatedAt: new Date().toISOString(),
    })
  )
  localStorage.removeItem(PIN_FAILURE_KEY)
  openSession(record.name)
  return { ok: true }
}

function openSession(name) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        name: name || 'You',
        at: Date.now(),
      })
    )
  } catch {
    /* ignore */
  }
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isSessionOpen() {
  return !!getSession()
}

export function closeSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/** Clears access credentials only (not project data). */
export function clearAccessRecord() {
  try {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(PIN_FAILURE_KEY)
  } catch {
    /* ignore */
  }
  closeSession()
}

export const STORAGE_EXPLAIN = {
  workDataKey: 'creative-companion-storage',
  accessKey: ACCESS_KEY,
  sessionKey: SESSION_KEY,
  summary:
    'Projects, tasks, pins, brand, and settings stay in this browser only. Other devices stay empty unless you import a JSON backup.',
}
