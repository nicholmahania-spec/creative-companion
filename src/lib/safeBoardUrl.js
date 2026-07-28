/**
 * Client-side gate before board URL pins / link-preview.
 * Not a substitute for server allowlists — blocks obvious SSRF/local targets
 * and non-http(s) schemes in the browser.
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
  'metadata',
])

function isPrivateOrLocalHostname(host) {
  const h = String(host || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
  if (!h) return true
  if (BLOCKED_HOSTS.has(h) || BLOCKED_HOSTS.has(host)) return true
  if (h.endsWith('.localhost') || h.endsWith('.local')) return true
  // IPv4 private / link-local / loopback
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (m) {
    const a = m.slice(1, 5).map(Number)
    if (a.some((n) => n > 255)) return true
    if (a[0] === 10) return true
    if (a[0] === 127) return true
    if (a[0] === 0) return true
    if (a[0] === 169 && a[1] === 254) return true
    if (a[0] === 172 && a[1] >= 16 && a[1] <= 31) return true
    if (a[0] === 192 && a[1] === 168) return true
  }
  // IPv6 loopback / ULA / link-local (rough)
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
    return true
  }
  return false
}

/**
 * @param {string} raw
 * @returns {{ ok: true, url: string } | { ok: false, error: string }}
 */
export function validateBoardUrl(raw) {
  const s = String(raw || '').trim()
  if (!s) return { ok: false, error: 'Paste a link first' }
  let u
  try {
    u = new URL(s)
  } catch {
    return { ok: false, error: 'That does not look like a valid URL' }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'Only http(s) links on the board' }
  }
  if (isPrivateOrLocalHostname(u.hostname)) {
    return { ok: false, error: 'That host is not allowed for board links' }
  }
  // Cap absurd lengths (abuse / header smuggling noise)
  if (s.length > 2048) {
    return { ok: false, error: 'Link is too long' }
  }
  return { ok: true, url: u.href }
}
