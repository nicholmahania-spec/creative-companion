import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * THE RENDERER MUST NOT BE ABLE TO COMPOSE.
 *
 * This is the guard the whole phase rests on. The book is drawn by two
 * renderers now, and the only thing keeping them from drifting apart again is
 * that neither decides what a page looks like. The PDF's half of that is held
 * by tests in `bookLayout.test.js`; this file holds React's.
 *
 * It walks the ACTUAL IMPORT GRAPH rather than grepping for forbidden words.
 * A regex over one file would pass the moment someone added an innocuous
 * helper that itself imported a template — which is precisely how this kind of
 * boundary erodes: never in the file you are watching. Reaching a template
 * through three hops is the same defect as importing it directly, so the walk
 * is transitive and the assertion is about what the renderer CAN reach, not
 * what it happens to mention.
 */

const ROOT = new URL('../../../..', import.meta.url).pathname
const RENDERER = 'src/components/book/PositionedPageView.jsx'

/** Every local module a file imports, resolved to a repo-relative path. */
function localImports(relPath) {
  const abs = resolve(ROOT, relPath)
  const src = readFileSync(abs, 'utf8')
  const specs = [
    ...src.matchAll(/^\s*import\s[^'"]*from\s*['"]([^'"]+)['"]/gm),
    ...src.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm),
    ...src.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((m) => m[1])

  const out = []
  for (const spec of specs) {
    if (!spec.startsWith('.')) continue // a package, not our code
    const base = resolve(dirname(abs), spec)
    const hit = [base, `${base}.js`, `${base}.jsx`, `${base}/index.js`, `${base}/index.jsx`].find(
      (p) => existsSync(p) && !p.endsWith('/')
    )
    if (hit) out.push(hit.slice(ROOT.length).replace(/^\/+/, ''))
  }
  return out
}

/** Everything the renderer can reach, however many hops away. */
function reachableFrom(entry) {
  const seen = new Set()
  const queue = [entry]
  while (queue.length) {
    const next = queue.shift()
    if (seen.has(next)) continue
    seen.add(next)
    for (const dep of localImports(next)) queue.push(dep)
  }
  seen.delete(entry)
  return seen
}

describe('the React renderer cannot reach composition', () => {
  const reachable = reachableFrom(RENDERER)

  it.each([
    ['the compositor', 'src/lib/book/layout/compose.js'],
    ['a template', 'src/lib/book/layout/templates/sectionOpen.js'],
    ['a template', 'src/lib/book/layout/templates/contentOpen.js'],
    ['the shared heading', 'src/lib/book/layout/templates/headingBlock.js'],
    ['the render context', 'src/lib/book/layout/renderContext.js'],
    ['the composition driver', 'src/lib/book/layout/bookPageDriver.js'],
    ['the PDF renderer', 'src/lib/book/brandBookPdf.js'],
    ['the store', 'src/store/useAppStore.js'],
  ])('cannot reach %s (%s)', (_what, mod) => {
    expect([...reachable]).not.toContain(mod)
  })

  it('reaches nothing that can measure or position', () => {
    /* Stated as a whole-set assertion as well as per-module, so a NEW
       template or a second context module is caught the day it lands rather
       than the day someone remembers to add it to the list above. */
    const forbidden = [...reachable].filter((m) =>
      /layout\/(compose|renderContext|bookPageDriver)\.js$|layout\/templates\/|brandBookPdf\.js$|store\//.test(m)
    )
    expect(forbidden).toEqual([])
  })

  it('depends on the positioned vocabulary and little else', () => {
    /* The renderer is a leaf by design. If this list grows, the boundary is
       being widened — which may be right, but it should be a decision. */
    expect([...reachable].sort()).toEqual(['src/lib/book/layout/positioned.js'])
  })

  it('the driver, by contrast, is allowed to compose', () => {
    /* The mirror image: composition has to live somewhere, and this proves it
       lives on the other side of the boundary rather than nowhere. */
    const driver = reachableFrom('src/lib/book/layout/bookPageDriver.js')
    expect([...driver]).toContain('src/lib/book/layout/compose.js')
    expect([...driver]).toContain('src/lib/book/layout/templates/sectionOpen.js')
    expect([...driver]).toContain('src/lib/book/layout/renderContext.js')
  })
})
