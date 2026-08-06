/**
 * Every live copy of this app, in one place.
 *
 * WHY THIS FILE EXISTS. Three copies of Creative Companion are reachable on
 * the public internet and they look identical. On 2026-08-01 that cost most of
 * an evening, twice: the Helper answers with real AI on Vercel and answered
 * from a lookup table on GitHub Pages, and nothing on screen said which copy
 * was open — so a working app looked like a broken one, and the "bug" being
 * chased did not exist.
 *
 * That is a MODE ERROR in the human-factors sense (Norman, *The Design of
 * Everyday Things*): two modes, identical appearance, no annunciator. Aviation
 * answered the same class of accident with a Flight Mode Annunciator — the
 * mode is displayed continuously, and changes are announced rather than
 * inferred. `deployNotice()` below is this app's annunciator.
 *
 * The second failure was that the answer was *inferred* rather than recorded.
 * `usesHelperProxy()` read `BASE_URL === '/'` as a proxy for "this host has
 * serverless functions" — an inference that is wrong in both directions (the
 * dead Netlify copy also builds with base '/'). Facts about deploys belong in
 * a list of deploys.
 *
 * DELIBERATELY DEPENDENCY-FREE. This module is imported by the browser bundle
 * *and* by `server/xaiProxyCore.mjs` running in a serverless function, so it
 * must not touch `import.meta.env`, `window`, `process`, or anything else that
 * only exists on one side.
 *
 * @typedef {'primary'|'mirror'|'retired'} DeployRole
 * @typedef {object} DeployTarget
 * @property {string} id
 * @property {string} label        Human name, used verbatim in the UI.
 * @property {string} host         Hostname as the browser reports it.
 * @property {string} origin       Scheme + host, as sent in the Origin header.
 * @property {string} basePath     Vite base this copy is built with.
 * @property {DeployRole} role
 * @property {'same-origin'|'primary'|'none'} helperProxy
 *   Where this copy reaches the xAI proxy that holds the API key.
 * @property {string} [note]       Why this copy is in the state it is in.
 */

/** The proxy route, identical on every host that serves one. */
export const HELPER_PROXY_PATH = '/api/xai'

/** @type {DeployTarget[]} */
export const DEPLOY_TARGETS = [
  {
    id: 'vercel',
    label: 'the main copy',
    host: 'creative-companion-ten.vercel.app',
    origin: 'https://creative-companion-ten.vercel.app',
    basePath: '/',
    role: 'primary',
    helperProxy: 'same-origin',
    note: 'Production. Builds from main; serves /api/xai itself.',
  },
  {
    id: 'pages',
    label: 'the GitHub Pages mirror',
    host: 'nicholmahania-spec.github.io',
    origin: 'https://nicholmahania-spec.github.io',
    basePath: '/creative-companion/',
    role: 'mirror',
    /* Static hosting, so it cannot serve a function of its own — but it does
       not need to. It borrows the primary's proxy cross-origin. The proxy
       authenticates the caller's real Supabase session, not the page it was
       loaded from, so a request from here is exactly as gated as one from
       Vercel. See `firstPartyOrigins()` and server/xaiProxyCore.mjs. */
    helperProxy: 'primary',
    note: 'Static mirror of main. Borrows the primary origin for the Helper.',
  },
  {
    id: 'netlify',
    label: 'the retired Netlify copy',
    host: 'creativecompanion.netlify.app',
    origin: 'https://creativecompanion.netlify.app',
    basePath: '/',
    role: 'retired',
    /* Its last deploy errored on 2026-07-19 and the site 404s, so in practice
       nothing loads here at all. Listed anyway: if it ever comes back up it
       must announce what it is rather than impersonate production. */
    helperProxy: 'none',
    note: 'Last deploy errored 2026-07-19. Not production. Do not deploy here.',
  },
]

/** @returns {DeployTarget} */
export function primaryDeploy() {
  return DEPLOY_TARGETS.find((t) => t.role === 'primary') || DEPLOY_TARGETS[0]
}

/** Every origin this project owns — the allowlist the proxy trusts. */
export function firstPartyOrigins() {
  return DEPLOY_TARGETS.map((t) => t.origin)
}

function isLocalHost(hostname) {
  return /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/i.test(
    String(hostname || '')
  )
}

/**
 * Which copy is this?
 *
 * Returns a registry entry for a known host, or a synthetic descriptor for
 * everything else. Two synthetic cases matter and must not be confused:
 *
 * - `local`   — a dev server or a preview build on this machine.
 * - `unknown` — an origin nobody wrote down. Vercel preview deploys land here
 *               (`creative-companion-<hash>.vercel.app`), and so would a fork.
 *               An unknown host is not assumed to be broken; it is assumed to
 *               behave like whatever its base path implies, and it says so.
 *
 * @param {{ hostname?: string, basePath?: string }} [where]
 * @returns {DeployTarget & { known: boolean }}
 */
export function identifyDeploy(where = {}) {
  const hostname = String(where.hostname || '')
  const basePath = String(where.basePath || '/')

  const match = DEPLOY_TARGETS.find(
    (t) => t.host.toLowerCase() === hostname.toLowerCase()
  )
  if (match) return { ...match, known: true }

  /* No hostname at all means there is no page: a unit test, a build script,
     SSR. That is a local context, not an unlisted deploy — calling it
     "an unlisted copy" would put a notice on screen about nowhere. */
  if (!hostname || isLocalHost(hostname)) {
    return {
      id: 'local',
      label: 'a local build',
      host: hostname,
      origin: '',
      basePath,
      role: 'mirror',
      helperProxy: 'same-origin',
      known: false,
    }
  }

  return {
    id: 'unknown',
    label: 'an unlisted copy',
    host: hostname,
    origin: hostname ? `https://${hostname}` : '',
    basePath,
    /* A root-served unlisted host is most likely a Vercel preview of this same
       repo, which does serve /api/xai. A subpath-served one is a static mirror
       and has no function of its own — the only honest guess left, and it is
       reported as a guess by `deployNotice`. */
    role: 'mirror',
    helperProxy: basePath === '/' || basePath === '' ? 'same-origin' : 'primary',
    known: false,
  }
}

/**
 * Absolute or same-origin base for the Helper's chat proxy on this copy.
 * `''` means there is no live path from here at all.
 *
 * @param {DeployTarget} target
 * @returns {string}
 */
export function helperProxyBaseFor(target) {
  if (!target) return ''
  if (target.helperProxy === 'same-origin') return HELPER_PROXY_PATH
  if (target.helperProxy === 'primary') {
    return `${primaryDeploy().origin}${HELPER_PROXY_PATH}`
  }
  return ''
}

/**
 * The line the app shows about the copy you are on — or `null`.
 *
 * `null` on the primary is the whole point: the annunciator must cost nothing
 * on the normal path, or it becomes chrome people stop reading. It appears
 * only when you are somewhere that is not production.
 *
 * Copy rules taken from CLAUDE.md and applied here deliberately: name the
 * artifact rather than the omission, no alarm colour, no exclamation, and
 * every state carries its own next action.
 *
 * @param {DeployTarget & { known?: boolean }} target
 * @returns {{ tone: 'note'|'retired', text: string, actionLabel?: string, actionHref?: string } | null}
 */
export function deployNotice(target) {
  if (!target || target.id === 'local') return null
  if (target.role === 'primary') return null

  const primary = primaryDeploy()
  const openMain = {
    actionLabel: 'Open the main copy',
    actionHref: primary.origin + '/',
  }

  if (target.role === 'retired') {
    return {
      tone: 'retired',
      text: `This is ${target.label}. It is no longer deployed to.`,
      ...openMain,
    }
  }

  return {
    tone: 'note',
    text: `This is ${target.label}, not production.`,
    ...openMain,
  }
}
