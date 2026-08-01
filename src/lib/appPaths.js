/**
 * Base-path helpers for the public deep links (/f/:shareId, /c/:portalId).
 *
 * The app is served from a subpath on GitHub Pages ('/creative-companion/')
 * and from the root in dev. Both the links we hand to clients and the
 * route matching that reads them back have to account for that, or a
 * shared link 404s (or silently boots the normal app shell instead of the
 * public page).
 */

/**
 * Path the app is served under, always leading+trailing slashed.
 * Vite's BASE_URL is './' for relative builds, which can't be used inside
 * an absolute URL — normalize that case to '/'.
 */
export function appBasePath() {
  const raw = import.meta.env.BASE_URL || '/'
  if (!raw.startsWith('/')) return '/'
  return raw.endsWith('/') ? raw : `${raw}/`
}

/** Absolute URL for a public route, e.g. publicUrl('c', id). */
export function publicUrl(prefix, id) {
  return `${window.location.origin}${appBasePath()}${prefix}/${id}`
}

/**
 * Absolute URL of the app's own base (origin + base path). For redirects that
 * must land back on the app across BOTH root and subpath deploys — e.g. the
 * Supabase password-reset redirectTo. Never build these from
 * window.location.pathname: on a public deep link that is /c/<id>, and the
 * reset would send the user there instead of into the app.
 */
export function appUrl() {
  return `${window.location.origin}${appBasePath()}`
}

/**
 * Current pathname with the base prefix stripped, so route patterns can
 * be written as plain '/c/:id' regardless of where the app is mounted.
 */
export function routePath(pathname = window.location.pathname) {
  const base = appBasePath()
  // slice(base.length - 1) keeps the leading slash
  return pathname.startsWith(base) ? pathname.slice(base.length - 1) : pathname
}
