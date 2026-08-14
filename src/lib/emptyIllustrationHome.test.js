import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * THE PRIMITIVE KEEPS ITS HOME.
 *
 * `EmptyIllustration` is a five-variant illustration written for empty
 * states, and it spent months importable by nothing at all. Not deleted —
 * just quietly abandoned, one rebuild at a time: Research swapped its empty
 * block for an upload button (8778fdd), Deliver's thin-pack block went in a
 * densify pass (cd5b005, import removed in de16d97), and the last call site
 * left with the Touchpoints rebuild (d56c203). Each of those was a
 * reasonable local edit. Together they retired a component nobody decided to
 * retire, and the only thing that ever said so was `noOrphanModules`, long
 * after the fact.
 *
 * WHY THIS IS NOT A DUPLICATE OF `noOrphanModules`. That test asks whether
 * ANYTHING imports the module — it goes quiet the moment one importer exists,
 * whatever that importer does with it. Two regressions pass it silently:
 * an import that lingers after its JSX is deleted, and a variant swapped for
 * a different one. This asserts the actual canonical use, which is the thing
 * with meaning: the wall's empty state renders the `board` variant.
 *
 * `board` IS NOT INTERCHANGEABLE. It draws three reference frames with the
 * middle one starred — the refs wall and its pack star, which is what this
 * screen holds. `desk`, `pack`, `path` and `calendar` each describe a
 * different surface, so a swap here would be a wrong picture rather than a
 * different one, and nothing else would catch it.
 *
 * Source-read rather than rendered, matching `projectActionsReachable.test.js`:
 * the guarantee is about which call site exists, and a render test would pass
 * on a component mounted anywhere at all.
 */
const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(here, '..', p), 'utf8')

describe('EmptyIllustration has a live home', () => {
  const research = read('views/ResearchView.jsx')

  it('the wall imports it', () => {
    expect(research).toMatch(
      /import\(['"]\.\.\/components\/EmptyIllustration['"]\)/
    )
  })

  it('the wall renders it, on the empty state, as the board variant', () => {
    const start = research.indexOf('research-empty')
    expect(start, 'the Research empty state must exist').toBeGreaterThan(-1)
    /* Scoped to the empty state itself. Rendering it somewhere else on the
       screen would satisfy a file-wide grep while leaving the empty wall
       bare, which is the state this component exists for. */
    const block = research.slice(start, start + 1200)
    expect(block).toContain('<EmptyIllustration')
    expect(block).toContain('variant="board"')
  })

  it('it stays lazy, because an empty screen must not delay a full one', () => {
    /* Every historical call site loaded it with `lazy()`. An illustration
       that ships in the eager path costs every designer who never sees it. */
    expect(research).toMatch(
      /lazy\(\s*\(\)\s*=>\s*import\(['"]\.\.\/components\/EmptyIllustration['"]\)\s*\)/
    )
    const at = research.indexOf('<EmptyIllustration')
    const before = research.slice(Math.max(0, at - 400), at)
    expect(before, 'a lazy component needs a Suspense boundary').toContain(
      '<Suspense'
    )
  })

  it('it is decoration here, and says so', () => {
    /* No `label`, so the component renders `aria-hidden` with no role — the
       subtitle beside it already carries the meaning, and a screen reader
       announcing a picture of the thing the sentence just said is noise. */
    const at = research.indexOf('<EmptyIllustration')
    const tag = research.slice(at, research.indexOf('/>', at) + 2)
    expect(tag).not.toContain('label=')
  })
})
