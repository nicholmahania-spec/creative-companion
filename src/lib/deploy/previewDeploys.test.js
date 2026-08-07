import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Preview deploys are off; production must keep deploying.
 *
 * The owner asked to always skip preview deploys after a night of frequent
 * pushes hit Vercel's free-plan ceiling ("more than 100, code:
 * api-deployments-free-per-day"), painting a red X on a pull request whose
 * code was entirely green.
 *
 * THE FIRST ATTEMPT AT THIS USED `ignoreCommand` AND WOULD NOT HAVE WORKED.
 * That command runs at BUILD time. The evidence that killed it is in the
 * commit status on #156: Vercel reported "Deployment rate limited" against the
 * commit before any build began — the deployment is created first, and the
 * daily cap counts deployments, not builds. A build-time hook cannot prevent
 * something that already happened.
 *
 * `git.deploymentEnabled` acts earlier: it stops the deployment being created
 * at all. Wildcards are supported, and the documented rule for a branch
 * matching several patterns is that it deploys "if at least one matching rule
 * is set to true". So `"*": false` with `"main": true` disables everything and
 * re-enables production, which is the whole requirement in two lines.
 *
 * THE SAFE FAILURE MODE IS WHY THIS SHAPE WAS CHOSEN. If Vercel ever treated
 * "*" as a literal branch name rather than a pattern, nothing would be
 * disabled — the old behaviour, harmless. `"main": true` is explicit either
 * way, so no misreading of the wildcard can take production down.
 */
const config = JSON.parse(
  readFileSync(new URL('../../../vercel.json', import.meta.url).pathname, 'utf8')
)

const rules = config.git?.deploymentEnabled

/**
 * Vercel's documented resolution: a branch deploys if ANY matching rule is
 * true. Unmatched branches default to enabled.
 */
function deploys(branch) {
  const matching = Object.entries(rules).filter(([pattern]) =>
    new RegExp(`^${pattern.split('*').map(escape).join('.*')}$`).test(branch)
  )
  if (!matching.length) return true // unspecified branches default to true
  return matching.some(([, enabled]) => enabled === true)
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

describe('vercel preview deploys', () => {
  it('declares branch rules at all', () => {
    expect(rules, 'git.deploymentEnabled is missing').toBeTruthy()
    expect(typeof rules).toBe('object')
  })

  /* The load-bearing one. If this ever fails, merging to main stops updating
     the live site and nothing else reports an error — the symptom arrives days
     later as "my changes aren't live". */
  it('DEPLOYS main — the live site must keep updating', () => {
    expect(rules.main).toBe(true)
    expect(deploys('main')).toBe(true)
  })

  it('disables everything else by default', () => {
    expect(rules['*']).toBe(false)
  })

  it('does not deploy the branches work actually happens on', () => {
    for (const branch of [
      'claude/remaining-features-xvw0l7',
      'claude/asset-library',
      'cc-cli',
      'book-default-marker',
      'some-branch-nobody-has-created-yet',
    ]) {
      expect(deploys(branch), branch).toBe(false)
    }
  })

  it('keeps the build itself intact', () => {
    // Guards against "fixing" the deploy cap by breaking the build.
    expect(config.buildCommand).toBe('npm run build')
    expect(config.outputDirectory).toBe('dist')
    expect(config.framework).toBe('vite')
  })

  it('does not also carry the build-time hook that could not work', () => {
    /* `ignoreCommand` was the first attempt. Leaving it alongside this would
       imply it contributes, and it would additionally skip the build of a
       deliberate manual `vercel deploy`. Named so it is not re-added as a
       belt-and-braces measure that is neither. */
    expect(config.ignoreCommand).toBeUndefined()
  })
})
