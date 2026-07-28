/* Creative Companion — offline shell + asset cache (v37)
 * v36: put both shell keys on navigate
 * v37: precache hashed JS/CSS discovered from index.html
 */
const CACHE = 'cc-shell-v37'
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
]

/** Parse built index.html for /assets/* (or ./assets/*) script + stylesheet URLs. */
function assetUrlsFromHtml(html, baseUrl) {
  const found = new Set()
  const re =
    /(?:src|href)=["']((?:\.\.?\/|\/)?assets\/[^"']+\.(?:js|css))["']/gi
  let m
  while ((m = re.exec(html))) {
    try {
      found.add(new URL(m[1], baseUrl).href)
    } catch {
      /* ignore bad url */
    }
  }
  return [...found]
}

async function precacheShellAndAssets() {
  const cache = await caches.open(CACHE)
  await cache.addAll(PRECACHE).catch(() => {})
  try {
    const indexUrl = new URL('./index.html', self.location.href).href
    const res = await fetch(indexUrl, { cache: 'no-cache' })
    if (!res.ok) return
    const html = await res.text()
    const assets = assetUrlsFromHtml(html, indexUrl)
    await Promise.all(
      assets.map((url) =>
        cache.add(url).catch(() => {
          /* optional asset */
        }),
      ),
    )
  } catch {
    /* offline during install — runtime caching still fills on first visit */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShellAndAssets().then(() => self.skipWaiting()))
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
          const copyA = res.clone()
          const copyB = res.clone()
          caches.open(CACHE).then((c) => {
            c.put('./', copyA).catch(() => {})
            c.put('./index.html', copyB).catch(() => {})
          })
          return res
        })
        .catch(() =>
          caches
            .match('./')
            .then(
              (r) => r || caches.match('./index.html') || caches.match(request),
            ),
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
