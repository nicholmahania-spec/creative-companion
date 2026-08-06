/**
 * "Which copy am I?" answered at RUNTIME, from the page that is actually open.
 *
 * The registry in `deployTargets.js` stays free of `window` and `import.meta`
 * so the serverless proxy can import it too; this is the browser-only half.
 *
 * Runtime, not build time, is the point. A build flag records what someone
 * intended when they configured the pipeline. `location.hostname` records
 * where the bundle is actually being served from — which is the question that
 * was being got wrong.
 */

import { appBasePath } from '../appPaths'
import {
  deployNotice,
  helperProxyBaseFor,
  identifyDeploy,
} from './deployTargets'

function safeBasePath() {
  try {
    return appBasePath()
  } catch {
    return '/'
  }
}

function safeHostname() {
  try {
    if (typeof window === 'undefined' || !window.location) return ''
    return String(window.location.hostname || '')
  } catch {
    return ''
  }
}

/** @returns {import('./deployTargets').DeployTarget & { known: boolean }} */
export function currentDeploy() {
  return identifyDeploy({ hostname: safeHostname(), basePath: safeBasePath() })
}

/** The Helper's chat base on this copy — `''` when there is no live path. */
export function currentHelperProxyBase() {
  return helperProxyBaseFor(currentDeploy())
}

/** The header line, or `null` on production and on a local build. */
export function currentDeployNotice() {
  return deployNotice(currentDeploy())
}
