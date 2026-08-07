import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * Preview builds are off; the production build must stay on.
 *
 * The owner asked to always skip preview deploys, after a night of frequent
 * pushes hit Vercel's free-plan ceiling ("more than 100, code:
 * api-deployments-free-per-day") and painted a red X on a green pull request.
 *
 * `ignoreCommand` runs before every build: exit 0 skips it, exit 1 runs it.
 * The expression is therefore inverted from how it reads — it must SUCCEED for
 * previews and FAIL for production. That inversion is the whole risk. Get it
 * backwards and nothing looks broken in review, no test fails, and the live
 * site silently stops updating on every merge to main. The symptom would
 * appear days later as "my changes aren't live", with no error anywhere.
 *
 * So this executes the real string from the real config against the real
 * values of VERCEL_ENV, rather than asserting the text matches a pattern.
 *
 * `git.deploymentEnabled` was the alternative and was rejected: it maps only
 * NAMED branches and defaults unnamed ones to enabled, so it would quietly
 * stop working the first time a branch had a new name. `ignoreCommand` does
 * not know or care what a branch is called.
 */
const config = JSON.parse(
  readFileSync(new URL('../../../vercel.json', import.meta.url).pathname, 'utf8')
)

/** @returns true when Vercel would SKIP the build for this environment. */
function skipsBuild(vercelEnv) {
  try {
    execFileSync('sh', ['-c', config.ignoreCommand], {
      env: { ...process.env, VERCEL_ENV: vercelEnv },
      stdio: 'ignore',
    })
    return true // exit 0 — ignored
  } catch {
    return false // non-zero — build proceeds
  }
}

describe('vercel preview deploys', () => {
  it('declares an ignoreCommand at all', () => {
    expect(typeof config.ignoreCommand).toBe('string')
    expect(config.ignoreCommand.length).toBeGreaterThan(0)
  })

  it('BUILDS production — the live site must keep deploying', () => {
    // The one that matters. If this ever passes as `true`, the site is frozen.
    expect(skipsBuild('production')).toBe(false)
  })

  it('skips preview builds', () => {
    expect(skipsBuild('preview')).toBe(true)
  })

  it('skips anything that is not production, including an unset value', () => {
    // An empty VERCEL_ENV must not be treated as production and burn a build.
    for (const env of ['development', '', 'Production', 'PRODUCTION', 'prod']) {
      expect(skipsBuild(env), `VERCEL_ENV=${JSON.stringify(env)}`).toBe(true)
    }
  })

  it('still builds the app when it does build', () => {
    // Guards against "fixing" the rate limit by breaking the build itself.
    expect(config.buildCommand).toBe('npm run build')
    expect(config.outputDirectory).toBe('dist')
  })
})
