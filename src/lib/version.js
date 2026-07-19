/** Injected at build time via vite.config.js `define`. */
export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev'

export const APP_BUILD =
  typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : 'dev'

export const APP_BUILD_DATE =
  typeof __APP_BUILD_DATE__ !== 'undefined' ? __APP_BUILD_DATE__ : ''

/** Footer / UI label, e.g. "v0.2.5" */
export function versionLabel() {
  return `v${APP_VERSION}`
}
