/**
 * Where does the Helper actually send its request, on each live copy?
 *
 * This is the assertion the whole change turns on, and it can only be made
 * with `import.meta.env.PROD` stubbed on: the interesting branch is the one
 * that only exists in a production build, which is precisely why the old
 * build-time inference (`BASE_URL === '/'`) went four weeks without anyone
 * noticing it wrote off a whole deploy.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getHelperApiBase,
  helperAiStatus,
  noteHelperOutcome,
  resetHelperOutcome,
  usesHelperProxy,
} from '../helper/helperAi'

function servedFrom(hostname) {
  vi.stubEnv('PROD', true)
  vi.stubEnv('DEV', false)
  globalThis.window = { location: { hostname } }
}

afterEach(() => {
  vi.unstubAllEnvs()
  delete globalThis.window
})

describe('helper request routing per deploy', () => {
  it('production talks to its own function', () => {
    servedFrom('creative-companion-ten.vercel.app')
    expect(usesHelperProxy()).toBe(true)
    expect(getHelperApiBase()).toBe('/api/xai')
  })

  it('the GitHub Pages mirror gets a LIVE helper, cross-origin', () => {
    /* The regression this exists to prevent: "static hosting has no
       serverless functions" being read as "the Helper cannot work here". */
    servedFrom('nicholmahania-spec.github.io')
    expect(usesHelperProxy()).toBe(true)
    expect(getHelperApiBase()).toBe(
      'https://creative-companion-ten.vercel.app/api/xai'
    )
    expect(helperAiStatus().mode).toBe('live')
  })

  it('the mirror says where its answers come from', () => {
    servedFrom('nicholmahania-spec.github.io')
    const status = helperAiStatus()
    expect(status.deploy).toBe('pages')
    expect(status.detail).toContain('the main copy')
  })

  it('the retired copy claims nothing and says which copy it is', () => {
    servedFrom('creativecompanion.netlify.app')
    expect(usesHelperProxy()).toBe(false)
    const status = helperAiStatus()
    expect(status.mode).toBe('scripted')
    expect(status.detail).toContain('Netlify')
  })

  it('a live copy stops saying "Live" once a call has actually failed', () => {
    /* The only branch where this matters is a copy configured FOR live AI —
       exactly the branch that cannot be reached without a production build,
       and therefore the one that went unwatched. */
    servedFrom('nicholmahania-spec.github.io')
    resetHelperOutcome()
    expect(helperAiStatus().short).toBe('Live')
    noteHelperOutcome({ source: 'scripted', error: 'xAI 502: upstream' })
    const failing = helperAiStatus()
    expect(failing.short).not.toBe('Live')
    expect(failing.detail).toContain('502')
    expect(failing.mode).toBe('live') // capability intact; retries continue
    resetHelperOutcome()
  })

  it('an unlisted root host still behaves like a preview of this repo', () => {
    servedFrom('creative-companion-git-branch-x.vercel.app')
    expect(getHelperApiBase()).toBe('/api/xai')
  })
})
