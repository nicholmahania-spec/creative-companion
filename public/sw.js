/* Creative Companion — minimal offline shell cache (demo-friendly). */
const CACHE = 'cc-shell-v1'
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => {}),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Network-first for navigations; cache fallback when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy)).catch(() => {})
          return res
        })
        .catch(() =>
          caches.match('./').then((r) => r || caches.match('./index.html')),
        ),
    )
    return
  }

  // Cache-first for same-origin static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res.ok && (url.pathname.includes('/assets/') || url.pathname.endsWith('.svg'))) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        }
        return res
      })
    }),
  )
})
