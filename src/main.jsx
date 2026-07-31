import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import PublicDiscoveryFill from './components/PublicDiscoveryFill.jsx'
import PublicClientPortal from './components/PublicClientPortal.jsx'
import ErrorBoundary from './components/error/ErrorBoundary.jsx'
import { routePath } from './lib/appPaths'
import './index.css'
import { versionLabel, APP_BUILD_DATE } from './lib/version'

/** Public client-fill link (/f/:shareId) — no auth, no app shell. Checked
 *  before anything else boots so a client never needs an account.
 *  routePath() strips the deploy base ('/creative-companion/' on GitHub
 *  Pages) so these patterns work wherever the app is mounted. */
const path = routePath()
const publicFormMatch = /^\/f\/([^/]+)\/?$/.exec(path)
/** Public client-dashboard link (/c/:portalId) — same no-auth pattern. */
const publicPortalMatch = /^\/c\/([^/]+)\/?$/.exec(path)
// Sentry initialization
if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then(({ init }) => {
    init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: 1.0,
    })
  }).catch(err => {
    console.error('Failed to initialize Sentry', err)
  })
}
/* Outermost crash net. Wraps all three roots, not just the app: a render
   error on /f/ or /c/ is a stranger looking at a blank white page with no idea
   whether their answers went anywhere, which is the worst version of this
   failure and the one with no way to ask for help. App.jsx mounts a second,
   inner one around the active view so an ordinary screen crash keeps the
   header and nav alive; this one only catches what gets past that. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {publicFormMatch ? (
        <PublicDiscoveryFill shareId={publicFormMatch[1]} />
      ) : publicPortalMatch ? (
        <PublicClientPortal portalId={publicPortalMatch[1]} />
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </StrictMode>,
)

// Log version in development to help with debugging
if (import.meta.env.DEV) {
  console.info(`🚀 Creative Companion ${versionLabel()} ${APP_BUILD_DATE ? `• ${APP_BUILD_DATE}` : ''} running in development mode`)
}

// PWA: offline shell + cached assets. Desk data is localStorage (works offline).
// Failures are silent so login still works without SW.
//
// Production only. In dev the cached shell wins over what the dev server is
// serving, so edits appear not to land: the file on disk is correct, Vite
// serves the correct module, and the page runs the previous one. That failure
// is worse than it sounds because it is silent and it lies — a fixed bug
// reappears, and a half-updated module graph throws errors ("Invalid hook
// call") that point at code which is not actually wrong.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Skipping registration is not enough on its own: a worker installed by
    // an earlier build stays active and keeps serving its cache. Tear down
    // whatever is already there, once, on load.
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then((results) => {
          if (!results.some(Boolean)) return
          console.info(
            '[dev] Unregistered a service worker left over from a production build — reload once if the page looks stale.'
          )
          if (typeof caches === 'undefined') return undefined
          return caches
            .keys()
            .then((names) => Promise.all(names.map((n) => caches.delete(n))))
        })
        .catch(() => {})
    })
  } else {
    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          // Pick up new shell when a fresh deploy is available
          if (reg && reg.update) reg.update().catch(() => {})
        })
        .catch(() => {})
    })
  }
}
