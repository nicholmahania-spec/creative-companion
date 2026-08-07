import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'

/**
 * The generator must write to the file the app reads.
 *
 * `scripts/build-book-fonts.mjs` wrote to `src/lib/bookFontData.js` for months
 * after the data moved to `src/lib/book/`. Nothing failed. It cheerfully
 * created an orphan at the old path while the file `bookFonts.js` actually
 * imports went stale — a regeneration that silently updates nothing, which is
 * worse than one that crashes, because the operator believes it worked.
 *
 * The same rot had already killed `build-harbor-demo.mjs`: a script nobody
 * runs, pointing at a path that no longer exists, discovered only when someone
 * finally ran it. A build script is exactly the kind of code that can rot
 * silently, because its output is only inspected when something else breaks.
 *
 * These are static assertions on purpose — the real script needs python3,
 * fonttools and network access, so running it in the suite is not an option.
 * Reading where it writes costs nothing and catches the whole failure.
 */
const repoUrl = (p) => new URL(`../../../${p}`, import.meta.url)
const read = (p) => readFileSync(repoUrl(p), 'utf8')

describe('build-book-fonts writes where bookFonts reads', () => {
  const script = read('scripts/build-book-fonts.mjs')

  it('targets a file that exists', () => {
    const m = script.match(/const OUT = path\.join\(REPO, '([^']+)'\)/)
    expect(m, 'build-book-fonts.mjs no longer declares a single OUT path').toBeTruthy()
    expect(existsSync(repoUrl(m[1])), `${m[1]} does not exist`).toBe(true)
  })

  it('targets the exact module bookFonts.js imports', () => {
    const out = script.match(/const OUT = path\.join\(REPO, '([^']+)'\)/)[1]
    const spec = read('src/lib/book/bookFonts.js').match(/await import\('([^']+)'\)/)[1]
    // './bookFontData' resolved against src/lib/book/
    const resolved = new URL(`${spec}.js`, repoUrl('src/lib/book/')).pathname
    expect(resolved).toBe(repoUrl(out).pathname)
  })

  it('names the path once, so the copies cannot drift apart again', () => {
    /* Three separate copies of the string is how it broke: the file moved and
       only some of them followed. Any bare occurrence outside the OUT
       declaration is a copy waiting to go stale. */
    const bare = script.match(/'src\/lib\/[^']*bookFontData\.js'/g) || []
    expect(bare, `expected one declaration, found ${bare.length}`).toHaveLength(1)
  })

  it('refuses to write when the target is missing', () => {
    // The guard is what turns a silent orphan into a loud stop.
    expect(script).toMatch(/if \(!fs\.existsSync\(OUT\)\)/)
    expect(script).toMatch(/process\.exit\(1\)/)
  })
})
