/**
 * The bridge that lets Node run `src/`.
 *
 * `src/` is Vite code: extensionless relative imports (`from '../lib/color'`),
 * the `@` alias, `import.meta.env`. Plain `node` cannot resolve any of that —
 * which is why `scripts/build-harbor-demo.mjs` sat broken and unnoticed after
 * the lib/book move: nothing ran it, so nothing reported the dead path.
 *
 * Rather than duplicate the domain logic here, or add a bundler step, this asks
 * Vite itself to load the modules. `ssrLoadModule` applies the real
 * `vite.config.js` — same aliases, same `define`, same resolution the browser
 * gets — so the CLI and the app cannot drift into two different answers about
 * what a brand pack contains. Zero new dependencies: Vite is already here.
 *
 * The server runs in middlewareMode and never listens, so this does not collide
 * with `npm run dev` on port 5274.
 */

import { createServer } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PROJECT_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
)

let serverPromise = null

function startServer() {
  return createServer({
    root: PROJECT_ROOT,
    configFile: resolve(PROJECT_ROOT, 'vite.config.js'),
    mode: 'production',
    appType: 'custom',
    logLevel: 'error',
    // No HMR, no file watcher: a one-shot command must not leave handles open
    // that keep the process alive after the work is done.
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true },
  })
}

/**
 * Load a module from `src/` as if the app were importing it.
 * @param {string} specifier root-relative path, e.g. '/src/lib/color.js'
 */
export async function load(specifier) {
  if (!serverPromise) serverPromise = startServer()
  const server = await serverPromise
  return server.ssrLoadModule(specifier)
}

/** Load several modules at once. */
export async function loadAll(specifiers) {
  return Promise.all(specifiers.map(load))
}

export async function closeRuntime() {
  if (!serverPromise) return
  try {
    const server = await serverPromise
    await server.close()
  } catch {
    /* closing a server we are about to exit from is not worth failing over */
  } finally {
    serverPromise = null
  }
}

/* The module paths the commands use, in one place so a future file move breaks
   loudly here rather than in five command files. */
export const MOD = {
  exportFiles: '/src/lib/book/exportFiles.js',
  brandSystem: '/src/lib/brandSystem.js',
  color: '/src/lib/color.js',
  contrastMatrix: '/src/lib/contrast/contrastMatrix.js',
  detectiveBrief: '/src/lib/brief/detectiveBrief.js',
  journey: '/src/lib/journey/journey.js',
  projectTypes: '/src/lib/journey/projectTypes.js',
  journeyProgress: '/src/lib/journey/journeyProgress.js',
  dates: '/src/lib/dates.js',
  decisionLog: '/src/lib/decisionLog.js',
  revisions: '/src/lib/revisions.js',
  touchpoints: '/src/lib/journey/touchpoints.js',
}
