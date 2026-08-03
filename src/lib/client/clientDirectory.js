/**
 * Client directory — grouped view over existing projects, no new object
 * model. One card per client name; a client's project(s) are packaged
 * underneath. Logo auto-fills the "photo" (visual recall, not names).
 */

/** Deterministic 1-2 letter monogram fallback when a client has no logo yet. */
export function clientMonogram(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Stable color for the monogram tile, derived from the name so it's
 * consistent across sessions without storing anything new. */
export function monogramTone(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return hash % 6
}

export function buildClientGroups(projects = []) {
  const groups = new Map()
  for (const p of projects) {
    const name = String(p.detective?.clientName || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (!groups.has(key)) {
      groups.set(key, {
        name,
        email: p.detective?.clientEmail || '',
        phone: p.detective?.clientPhone || '',
        logoImage: p.logoImage || null,
        projects: [],
        lastTouched: p.updatedAt || '',
      })
    }
    const g = groups.get(key)
    g.projects.push(p)
    if (!g.email && p.detective?.clientEmail) g.email = p.detective.clientEmail
    if (!g.phone && p.detective?.clientPhone) g.phone = p.detective.clientPhone
    if (!g.logoImage && p.logoImage) g.logoImage = p.logoImage
    if (String(p.updatedAt || '') > String(g.lastTouched || '')) {
      g.lastTouched = p.updatedAt || ''
    }
  }
  return Array.from(groups.values())
}

export function filterAndSortClients(clients, query, sortMode) {
  const q = String(query || '').trim().toLowerCase()
  let list = clients
  if (q) {
    list = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.projects.some((p) => String(p.name || '').toLowerCase().includes(q))
    )
  }
  const sorted = [...list]
  if (sortMode === 'alpha') {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
  } else {
    sorted.sort((a, b) => String(b.lastTouched || '').localeCompare(String(a.lastTouched || '')))
  }
  return sorted
}
