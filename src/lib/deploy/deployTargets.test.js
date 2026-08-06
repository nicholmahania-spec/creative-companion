import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEPLOY_TARGETS,
  HELPER_PROXY_PATH,
  deployNotice,
  firstPartyOrigins,
  helperProxyBaseFor,
  identifyDeploy,
  primaryDeploy,
} from './deployTargets'

const PAGES = 'nicholmahania-spec.github.io'
const VERCEL = 'creative-companion-ten.vercel.app'
const NETLIFY = 'creativecompanion.netlify.app'

describe('deploy registry', () => {
  it('has exactly one primary', () => {
    const primaries = DEPLOY_TARGETS.filter((t) => t.role === 'primary')
    expect(primaries).toHaveLength(1)
    expect(primaryDeploy().host).toBe(VERCEL)
  })

  it('origins are bare https origins — no path, no trailing slash', () => {
    /* The proxy allowlist matches origins EXACTLY (see xaiProxyCore). A stray
       trailing slash here would silently refuse a whole deploy, and a path
       would never match anything at all. */
    for (const t of DEPLOY_TARGETS) {
      expect(t.origin).toMatch(/^https:\/\/[a-z0-9.-]+$/)
      expect(new URL(t.origin).pathname).toBe('/')
    }
  })

  it('identifies each live copy by hostname', () => {
    expect(identifyDeploy({ hostname: VERCEL, basePath: '/' }).id).toBe('vercel')
    expect(
      identifyDeploy({ hostname: PAGES, basePath: '/creative-companion/' }).id
    ).toBe('pages')
    expect(identifyDeploy({ hostname: NETLIFY, basePath: '/' }).id).toBe(
      'netlify'
    )
  })

  it('localhost is a local build, not an unlisted copy', () => {
    const local = identifyDeploy({ hostname: 'localhost', basePath: '/' })
    expect(local.id).toBe('local')
    expect(deployNotice(local)).toBeNull()
  })
})

describe('where the Helper reaches a live model', () => {
  it('primary uses its own function', () => {
    expect(helperProxyBaseFor(identifyDeploy({ hostname: VERCEL }))).toBe(
      HELPER_PROXY_PATH
    )
  })

  it('the static mirror borrows the primary — it is NOT a dead end', () => {
    /* This is the assertion the whole change exists for. "GitHub Pages has no
       serverless functions" is true and was read as "the Helper cannot work
       there". It only means the mirror has no function OF ITS OWN. */
    const base = helperProxyBaseFor(
      identifyDeploy({ hostname: PAGES, basePath: '/creative-companion/' })
    )
    expect(base).toBe(`https://${VERCEL}${HELPER_PROXY_PATH}`)
    expect(base.startsWith('https://')).toBe(true)
  })

  it('the retired copy claims no live path', () => {
    expect(helperProxyBaseFor(identifyDeploy({ hostname: NETLIFY }))).toBe('')
  })

  it('an unlisted root host is treated as a preview of this repo', () => {
    // Vercel preview deploys land here and do serve /api/xai.
    const preview = identifyDeploy({
      hostname: 'creative-companion-abc123.vercel.app',
      basePath: '/',
    })
    expect(preview.known).toBe(false)
    expect(helperProxyBaseFor(preview)).toBe(HELPER_PROXY_PATH)
  })

  it('an unlisted subpath host is treated as a static mirror', () => {
    const mirror = identifyDeploy({
      hostname: 'someone.github.io',
      basePath: '/fork/',
    })
    expect(helperProxyBaseFor(mirror)).toBe(
      `https://${VERCEL}${HELPER_PROXY_PATH}`
    )
  })
})

describe('the annunciator', () => {
  it('says nothing on production — silence is the normal path', () => {
    expect(deployNotice(identifyDeploy({ hostname: VERCEL }))).toBeNull()
  })

  it('names the mirror and offers the main copy', () => {
    const n = deployNotice(
      identifyDeploy({ hostname: PAGES, basePath: '/creative-companion/' })
    )
    expect(n).not.toBeNull()
    expect(n.text).toContain('GitHub Pages')
    expect(n.actionHref).toBe(`https://${VERCEL}/`)
  })

  it('says the retired copy is retired', () => {
    const n = deployNotice(identifyDeploy({ hostname: NETLIFY }))
    expect(n.tone).toBe('retired')
    expect(n.text.toLowerCase()).toMatch(/no longer/)
  })

  it('never scolds — no alarm punctuation, no "you have not"', () => {
    /* CLAUDE.md: name the artifact, never the omission. A red exclamation on
       a copy someone opened by accident is a blame signal with no valid
       action behind it. */
    for (const t of DEPLOY_TARGETS) {
      const n = deployNotice(t)
      if (!n) continue
      expect(n.text).not.toMatch(/!/)
      expect(n.text.toLowerCase()).not.toMatch(/you (have not|haven't|forgot|should)/)
      expect(n.actionLabel).toBeTruthy()
    }
  })
})

describe('single source of truth', () => {
  const repoRoot = resolve(import.meta.dirname, '../../..')

  it('firstPartyOrigins covers every listed copy', () => {
    expect(firstPartyOrigins().sort()).toEqual(
      DEPLOY_TARGETS.map((t) => t.origin).sort()
    )
  })

  it("vite's GitHub Pages base matches the registry", () => {
    /* Two places encode the Pages subpath: vite.config.js (what gets built)
       and this registry (what the app claims about itself). If they drift,
       the app misidentifies the copy it is running on — which is the whole
       class of bug being closed here. */
    const vite = readFileSync(resolve(repoRoot, 'vite.config.js'), 'utf8')
    const pages = DEPLOY_TARGETS.find((t) => t.id === 'pages')
    expect(vite).toContain(`'${pages.basePath}'`)
  })
})
