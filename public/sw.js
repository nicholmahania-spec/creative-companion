/* Creative Companion — offline shell + asset cache (v7)
 * v4: network-first for hashed /assets/ so deploys win over sticky cache-first.
 * v5: cache name bump after brand-kit + path extracts so clients drop stale shells.
 * v6: bust after Define isFilled crash fix so clients drop bad DetectiveSheet chunks.
 * v7: bust after mobile Define + full-width path rail (v1.48.41–42) so phones drop
 *     the 200px Tech-Studio sidebar cache.
 */
const CACHE = 'cc-shell-v7'
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
]

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
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isHashedAsset(url) {
  const path = url.pathname
  return path.includes('/assets/') || /\.[a-f0-9]{6,}\.(?:js|css)$/i.test(path)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy)).catch(() => {})
          return res
        })
        .catch(() =>
          caches
            .match('./')
            .then((r) => r || caches.match('./index.html') || caches.match(request)),
        ),
    )
    return
  }

  if (isHashedAsset(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
          }
          return res
        })
        .catch(() => caches.match(request)),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        }
        return res
      })
    }),
  )
})
