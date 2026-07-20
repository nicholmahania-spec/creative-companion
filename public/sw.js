/* Creative Companion — offline shell + asset cache (v6)
 * v4: network-first for hashed /assets/ so deploys win over sticky cache-first.
 * v5: cache name bump after brand-kit + path extracts so clients drop stale shells.
 * v6: bust after Define isFilled crash fix so clients drop bad DetectiveSheet chunks.
 */
const CACHE = 'cc-shell-v6'
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

function shouldCacheResponse(url, res) {
  if (!res || !res.ok) return false
  if (res.type === 'opaque') return false
  const path = url.pathname
  if (path.includes('/assets/')) return true
  if (/\.(?:js|css|svg|png|jpg|jpeg|webp|gif|woff2?|webmanifest)$/i.test(path))
    return true
  if (path.includes('/buddy/')) return true
  return false
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigate: network-first, offline → cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches
            .open(CACHE)
            .then((c) => c.put('./index.html', copy))
            .catch(() => {})
          return res
        })
        .catch(() =>
          caches
            .match('./index.html')
            .then((r) => r || caches.match('./') || caches.match(request)),
        ),
    )
    return
  }

  // Hashed bundles: network-first so new deploys replace old shell quickly
  if (isHashedAsset(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (shouldCacheResponse(url, res)) {
            const copy = res.clone()
            caches
              .open(CACHE)
              .then((c) => c.put(request, copy))
              .catch(() => {})
          }
          return res
        })
        .catch(() => caches.match(request)),
    )
    return
  }

  // Other static: cache-first (buddy art, icons)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (shouldCacheResponse(url, res)) {
          const copy = res.clone()
          caches
            .open(CACHE)
            .then((c) => c.put(request, copy))
            .catch(() => {})
        }
        return res
      })
    }),
  )
})
