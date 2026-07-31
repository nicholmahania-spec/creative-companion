import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, basename, relative } from 'node:path'

/**
 * No module sits in `src/` that nothing imports.
 *
 * An orphan is not merely untidy — it is indistinguishable from working code
 * when you read it, and it rots without ever failing. Seventeen of them were
 * deleted at once, and what they had quietly accumulated makes the case:
 *
 * - `src/components/ui/*` held a Button, Card, Badge, Textarea and ButtonGroup
 *   that nothing rendered. One of them had been edited in a shipped PR, so a
 *   review passed on code that could never run.
 * - `UserActivityTable.jsx` was a near-duplicate of a live component, so a fix
 *   to one would silently miss the other.
 * - They imported `cn` from a `lib/utils.ts` that existed only to serve them,
 *   and wore Tailwind class names in a repo with no Tailwind — a whole
 *   dialect of a framework this app does not use, kept alive by nothing.
 *
 * The rule is about REACHABILITY, not usefulness. A file that is genuinely
 * wanted gets imported; a file that is not gets deleted. There is no third
 * state worth keeping, because "we might need it later" is what git is for.
 *
 * Scanned by resolving every import specifier in the tree rather than by
 * matching names — an earlier version of this check searched for filename
 * stems and missed `.ts` files entirely, which is how the fabricated Activity
 * panel stayed hidden behind a hook nobody had listed.
 */

const here = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(here, '..')
const CODE = /\.(js|jsx|ts|tsx)$/

/** Entry points — reached by the browser or the tooling, not by an import. */
const ENTRIES = new Set(['main.jsx'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (CODE.test(name)) out.push(full)
  }
  return out
}

/** Every path an import/require/lazy-import in the tree points at. */
function importedPaths(files) {
  const specs = new Set()
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    for (const re of patterns) {
      for (const m of src.matchAll(re)) {
        const spec = m[1]
        if (!spec.startsWith('.') && !spec.startsWith('@/')) continue
        /* `@/x` is the alias for `src/x` (vite.config.js). Relative specifiers
           resolve against the importing file. Extensions are optional, so the
           target is recorded without one and compared the same way. */
        const abs = spec.startsWith('@/')
          ? resolve(SRC, spec.slice(2))
          : resolve(dirname(f), spec)
        specs.add(abs.replace(CODE, ''))
        specs.add(resolve(abs, 'index'))
      }
    }
  }
  return specs
}

describe('every module in src/ is reachable', () => {
  it('has no file that nothing imports', () => {
    const files = walk(SRC)
    const imported = importedPaths(files)

    const orphans = files
      .filter((f) => !f.endsWith('.test.js') && !f.endsWith('.test.jsx'))
      .filter((f) => !ENTRIES.has(basename(f)))
      .filter((f) => !imported.has(f.replace(CODE, '')))
      .map((f) => relative(SRC, f))
      .sort()

    expect(
      orphans,
      `these modules are in src/ but nothing imports them — wire them up or delete them:\n  ${orphans.join('\n  ')}`
    ).toEqual([])
  })
})
