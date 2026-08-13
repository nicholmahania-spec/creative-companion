import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

/**
 * THE OLD DISCOVERY INTAKE IS RETIRED, AND MUST NOT COME BACK.
 *
 * It was a second 30-question brief with its own `discoveryAnswers` store:
 * fillable in the studio modal, runnable as a call script, and completely
 * invisible to the Define sheet, which reads `detective`. So the designer
 * filled one schema while the client filled another at /f/:shareId, and
 * nothing reconciled them.
 *
 * Both capture modes now have canonical replacements — the Brief itself, and
 * its Call mode on `DETECTIVE_CHAPTERS` — and the studio write path is gone.
 * What survives is deliberate: the stored answers stay visible, the markdown
 * and plain-text hand-offs still read them, and the client's own route is
 * untouched.
 *
 * Textual, because nothing in the unit suite renders these views, and the way
 * this regresses is someone re-adding a setter and an input, not someone
 * changing a value.
 */
const here = dirname(fileURLToPath(import.meta.url))
const srcDir = resolve(here, '../..')
const read = (p) => readFileSync(resolve(srcDir, p), 'utf8')

/** Source with comments removed, so a note ABOUT the retired path does not
 *  read as the retired path. */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Every non-test source file under src/. */
function sourceFiles(dir = srcDir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) sourceFiles(full, out)
    else if (/\.jsx?$/.test(name) && !name.includes('.test.')) out.push(full)
  }
  return out
}

describe('the studio Discovery intake is retired', () => {
  it('nothing anywhere calls updateDiscoveryField', () => {
    /* The store action is gone; this catches a caller being reintroduced
       against a re-added action, which is how the path would return. */
    /* A CALL or a property access, not the bare word — the store carries a
       comment naming it, which is the record of why it went. */
    const used = /updateDiscoveryField\s*[(:]|\.updateDiscoveryField/
    const offenders = sourceFiles()
      .filter((f) => used.test(stripComments(readFileSync(f, 'utf8'))))
      .map((f) => f.replace(srcDir, 'src'))
    expect(offenders, 'the retired studio write path is back').toEqual([])
  })

  it('the notes surface has no way to write an answer', () => {
    const modal = read('features/client-portal/DiscoveryBrief.jsx')
    expect(modal).not.toContain('onUpdateField')
    /* An input bound to an answer is the shape of the thing being prevented. */
    expect(modal).not.toMatch(/onChange=\{\(e\) => on[A-Za-z]*Update/)
    expect(modal).not.toContain('function FillMode')
    expect(modal).not.toContain('function CallMode')
  })

  it('it still shows the stored answers and still exports them', () => {
    /* The reason the file survives at all. Losing either would mean the
       retirement had destroyed real user data rather than frozen it. */
    const modal = read('features/client-portal/DiscoveryBrief.jsx')
    expect(modal).toContain('function NotesMode')
    expect(modal).toContain('discoveryBriefToMarkdown')
    expect(modal).toContain('discoveryBriefToPlainText')
  })

  it('does not present itself as another brief', () => {
    const app = read('App.jsx')
    const modal = read('features/client-portal/DiscoveryBrief.jsx')
    expect(modal).toContain('Discovery notes')
    /* One Brief. A second thing calling itself one is the confusion the
       whole consolidation removes. */
    expect(stripComments(app)).not.toContain('Discovery brief')
  })

  it('the client route and its share controls are untouched', () => {
    /* Retiring the studio surface must not reach the client's own path. */
    const store = read('store/useAppStore.js')
    expect(store).toContain('mergeDiscoveryAnswers')
    expect(store).toContain('discoveryAnswers')
    const link = read('features/brief/BriefClientLink.jsx')
    expect(link).toContain('createDiscoveryShare')
    expect(link).toContain('revokeDiscoveryShare')
  })
})
