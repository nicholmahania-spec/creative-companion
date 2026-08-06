/**
 * Signed URLs for the private `brand-assets` bucket, memoised per object path.
 *
 * Owed since Phase 7 part one, where it was named and deferred: "a grid
 * minting fresh URLs per mount is permanently cold, and an `<img src>` on a
 * signed URL blanks silently once it expires."
 *
 * Both halves of that are real and they pull in opposite directions:
 *
 * 1. **Cold cache.** Supabase's Smart CDN treats each distinct signed URL as
 *    its own object: the first request with any given URL is always a miss,
 *    and only that exact URL hits afterwards. A component that signs on every
 *    mount therefore never benefits from the CDN at all — every thumbnail in
 *    the grid is a fresh origin fetch, every time the view is opened.
 * 2. **Silent expiry.** The opposite mistake is caching a URL until it dies.
 *    An `<img>` whose src has expired does not report anything useful; it
 *    renders nothing. A designer sees an empty rectangle, which is
 *    indistinguishable from an upload that never finished — and this repo has
 *    already decided those two must never look the same (`assetByteState`).
 *
 * So: memoise by path, and treat a URL as spent BEFORE it actually expires.
 * The skew is deliberate and generous — a URL handed to an `<img>` may not be
 * requested for several seconds after it is read out of here, and a token that
 * dies in flight produces exactly the blank rectangle above.
 *
 * Pure and injectable: `sign` is passed in rather than imported, so this is
 * testable without a network, a bucket, or a clock.
 */

/** How long a minted URL is asked to live. */
export const SIGNED_TTL_SECONDS = 3600

/**
 * Treat a URL as spent this long before it expires.
 *
 * Five minutes rather than a few seconds, because the gap that matters is not
 * "between reading and rendering" — it is between reading and the LAST render
 * that uses it. A cached React element can hold a src across re-renders, and
 * a slow connection can start the request long after the URL was handed over.
 */
export const REFRESH_SKEW_MS = 300_000

/**
 * @param {object} deps
 * @param {(path: string) => Promise<string|null>} deps.sign  mints a URL
 * @param {() => number} [deps.now]  injectable clock, defaults to Date.now
 * @param {number} [deps.ttlSeconds]
 * @param {number} [deps.skewMs]
 */
export function createSignedUrlCache({
  sign,
  now = () => Date.now(),
  ttlSeconds = SIGNED_TTL_SECONDS,
  skewMs = REFRESH_SKEW_MS,
} = {}) {
  /** path -> { url, expiresAt } */
  const entries = new Map()
  /** path -> Promise, so a grid of 40 thumbnails signs each path ONCE. */
  const inflight = new Map()

  const fresh = (entry) => entry && entry.expiresAt - skewMs > now()

  return {
    /**
     * A usable URL for this path, or null.
     *
     * Returns the memoised one while it is comfortably alive, re-signs when it
     * is close to expiry, and collapses concurrent callers for the same path
     * onto one request — the grid case, where every card asks at once.
     */
    async get(path) {
      if (!path) return null

      const entry = entries.get(path)
      if (fresh(entry)) return entry.url

      const pending = inflight.get(path)
      if (pending) return pending

      const req = (async () => {
        try {
          const url = await sign(path)
          if (!url) {
            /* A failed signing is NOT cached. Caching it would turn one bad
               moment — an expired session, a blip — into a permanently blank
               card for the rest of the page's life, with no way to retry
               short of a reload. */
            return null
          }
          entries.set(path, { url, expiresAt: now() + ttlSeconds * 1000 })
          return url
        } finally {
          inflight.delete(path)
        }
      })()

      inflight.set(path, req)
      return req
    },

    /** Drop one path — after a re-upload, where the bytes changed under it. */
    forget(path) {
      entries.delete(path)
    },

    /** Drop everything. Sign-out, or a switch of account. */
    clear() {
      entries.clear()
      inflight.clear()
    },

    /** Test seam only: how many live entries are held. */
    size() {
      return entries.size
    },
  }
}
