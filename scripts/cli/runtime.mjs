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
 * `vite.config.js`, so the CLI and the app call the same first-party functions.
 * Zero new dependencies: Vite is already here.
 *
 * The server runs in middlewareMode and never listens, so this does not collide
 * with `npm run dev` on port 5274.
 *
 * HOW FAR THAT GUARANTEE REACHES — an earlier version of this comment said
 * "same resolution the browser gets", and that is not true of dependencies.
 * Aliases, `define` and everything under `src/` do resolve exactly as the
 * browser resolves them. `node_modules` does not: Vite externalizes deps for
 * SSR and resolves them under NODE conditions, so a package with split exports
 * hands the CLI a different file than the app gets. jspdf is exactly such a
 * package —
 *
 *     "node":    dist/jspdf.node.min.js   349,835 bytes
 *     "browser": dist/jspdf.es.min.js     343,605 bytes
 *
 * — and it builds the brand book, the artefact that reaches a client. So it was
 * worth measuring rather than assuming. Driving identical drawing operations
 * through both builds and normalising /CreationDate and /ID, the output is
 * BYTE-IDENTICAL: the builds differ in packaging, not in the PDF they emit.
 * `cc export` and the app produce the same book.
 *
 * `ssr.noExternal: ['jspdf']` would close the gap structurally, and was tried —
 * it fails to load ("exports is not defined") and buys nothing measurable, so
 * it is deliberately absent. If a future jspdf makes the builds diverge, this
 * is the note that says where to look.
 *
 * html2canvas is the one dependency that genuinely behaves differently, needing
 * a real DOM — but only the raster PDF path touches it, the CLI uses the vector
 * path, and its import is already wrapped in a catch.
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
    /* `error` normally: a designer running `cc export` should not be shown
       Vite's internal chatter. But the deprecation notice below is emitted at
       WARN, so at the default level the countdown is one nobody ever hears —
       `CC_DEBUG=1 cc <cmd>` is where a maintainer looks, and it already turns
       on stack traces in index.mjs. */
    logLevel: process.env.CC_DEBUG ? 'warn' : 'error',
    // No HMR, no file watcher: a one-shot command must not leave handles open
    // that keep the process alive after the work is done.
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true },
    /* Turns a scheduled breakage into a visible countdown. `ssrLoadModule` is
     * listed Planned for removal on vite.dev/changes; the replacement
     * (createServerModuleRunner) is still flagged release-candidate with
     * "We don't recommend switching to Environment API yet". Nothing is
     * removed in Vite 8, so the stable API is the right call today — this
     * flag means we hear about it rather than discovering it on upgrade. */
    future: { removeSsrLoadModule: 'warn' },
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
