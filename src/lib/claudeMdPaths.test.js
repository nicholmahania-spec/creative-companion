/**
 * Every path CLAUDE.md points at must exist.
 *
 * CLAUDE.md is the first thing read before touching this repo, so a wrong
 * pointer in it does not cause a small confusion — it causes a confident
 * wrong conclusion. The stylesheet split is the case that proved it: the
 * file kept describing `src/index.css` as "the full CSS design system
 * (~15k lines)" after it had become a two-line `@import`, so grepping it
 * for a rule returned nothing and read as "this style does not exist."
 * Four separate findings were mis-called that way in one session before
 * anyone checked the file's length.
 *
 * WHAT THIS CATCHES: a referenced file or directory that has been moved,
 * renamed or deleted.
 *
 * WHAT IT DOES NOT: a path that still exists but no longer contains what
 * the prose claims. `src/index.css` would pass this test today. Nothing
 * mechanical can check that, which is why the rule stays a human one —
 * when you move something, fix the sentence in the same commit.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const doc = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8')

/** Backticked repo-relative paths under the directories we control. */
const PATH_RE = /`((?:src|e2e|docs|public|\.github|\.githooks)\/[A-Za-z0-9_./*-]+)`/g

function referencedPaths() {
  const found = new Set()
  for (const m of doc.matchAll(PATH_RE)) found.add(m[1])
  return [...found].sort()
}

/** `src/styles/lazy-*.css` → true when at least one file matches. */
function globMatches(pattern) {
  const dir = dirname(pattern)
  const base = pattern.slice(dir.length + 1)
  const abs = join(repoRoot, dir)
  if (!existsSync(abs)) return false
  const re = new RegExp(
    `^${base.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`
  )
  return readdirSync(abs).some((f) => re.test(f))
}

describe('CLAUDE.md points at things that exist', () => {
  it('references at least a handful of real paths', () => {
    // Guards the guard: a broken regex would silently assert nothing.
    expect(referencedPaths().length).toBeGreaterThan(8)
  })

  it('every referenced path resolves', () => {
    const broken = referencedPaths().filter((p) =>
      p.includes('*') ? !globMatches(p) : !existsSync(join(repoRoot, p))
    )
    expect(
      broken,
      `CLAUDE.md points at ${broken.length} path(s) that do not exist:\n` +
        broken.map((p) => `  - ${p}`).join('\n')
    ).toEqual([])
  })

  it('does not describe src/index.css as the design system', () => {
    /* The specific regression this file exists for. index.css is a two-line
       entry point; the rules live in src/styles/. Asserted on the file's
       real size so it self-corrects if the CSS is ever consolidated back. */
    const entry = readFileSync(join(repoRoot, 'src/index.css'), 'utf8')
    const isEntryStub = entry.split('\n').filter(Boolean).length < 10
    if (isEntryStub) {
      expect(
        doc,
        'src/index.css is a stub, but CLAUDE.md still calls it the full design system'
      ).not.toMatch(/`src\/index\.css`[^\n]*full CSS design system/)
    }
  })
})
