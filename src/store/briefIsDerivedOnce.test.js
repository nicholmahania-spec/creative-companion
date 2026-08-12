import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import useAppStore, {
  briefFromDetective,
  withDetective,
} from './useAppStore'
import { buildBrandPackSnapshot } from '../lib/book/exportFiles'

/**
 * `detective` IS AUTHORED. `brief` IS DERIVED FROM IT. ONCE.
 *
 * THE BUG THESE PIN (audit F3). `updateDetective` recomposed `project.brief` on
 * every keystroke, but the two paths a CLIENT's answers arrive on —
 * `mergeDetectiveAnswers` (portal review / paper OCR) and
 * `mergeDiscoveryAnswers` (the public /f/:shareId link) — wrote `detective` and
 * left `brief` untouched.
 *
 * So: the client submits, the answers land, the summary does not. Any export
 * taken in that window — pack, brand book, delivery pack — ships a brief
 * missing the client's own words. Then the designer types one unrelated
 * character in Define and the brief silently becomes correct, with no event to
 * attribute the change to. An invisible corruption window with an untriggerable
 * end is worse than a permanent one, because nothing can be tested by hand.
 *
 * THE RULE NOW: every writer of `detective` hands the result through
 * `withDetective`, which re-derives `brief` in the SAME state write. One
 * derivation expression, one author. The last test greps for a second one.
 */

const fresh = (name = 'Brief derivation') => {
  useAppStore.getState().clearToEmpty()
  return useAppStore.getState().createNewProject(name)
}

const current = () => {
  const s = useAppStore.getState()
  return s.projects.find((p) => p.id === s.currentProjectId)
}

describe('a client submission leaves the brief current', () => {
  beforeEach(() => {
    fresh()
  })

  it('mergeDiscoveryAnswers recomposes the brief in the same write', () => {
    const s = () => useAppStore.getState()
    s().updateDetective('goal', 'Look established')
    expect(current().brief).toContain('Look established')

    s().mergeDiscoveryAnswers(current().id, {
      audience: 'Independent makers',
      feel: 'Warm and plain',
    })

    expect(current().detective.audience).toBe('Independent makers')
    expect(current().brief).toContain('Independent makers')
    expect(current().brief).toContain('Warm and plain')
    // …and the answer that was already there is still in the summary.
    expect(current().brief).toContain('Look established')
  })

  it('mergeDetectiveAnswers recomposes the brief in the same write', () => {
    const s = () => useAppStore.getState()
    s().updateDetective('goal', 'Look established')

    s().mergeDetectiveAnswers({ audience: 'Cyclists who commute' }, current().id)

    expect(current().detective.audience).toBe('Cyclists who commute')
    expect(current().brief).toContain('Cyclists who commute')
  })

  it('an export taken immediately after a merge carries the client’s words', () => {
    const s = () => useAppStore.getState()
    s().updateDetective('clientName', 'Harbor & Hearth')
    s().mergeDiscoveryAnswers(current().id, { audience: 'Independent makers' })

    /* No keystroke in between — this is the exact sequence that used to ship a
       stale brief to the client. */
    const pack = buildBrandPackSnapshot({ project: current() })
    expect(pack.brief).toContain('Independent makers')
    expect(pack.brief).toContain('Harbor & Hearth')
  })

  it('needs no later Define keystroke to become correct', () => {
    const s = () => useAppStore.getState()
    s().mergeDiscoveryAnswers(current().id, { audience: 'Independent makers' })
    const afterMerge = current().brief

    // The keystroke that used to be load-bearing.
    s().updateDetective('story', 'Started in a kitchen')

    /* The merge's contribution was already there; the keystroke only added its
       own. If the brief had been stale, `afterMerge` would not have contained
       the audience and this would fail. */
    expect(afterMerge).toContain('Independent makers')
    expect(current().brief).toContain('Independent makers')
    expect(current().brief).toContain('Started in a kitchen')
  })

  it('does not blank a brief that predates the sheet', () => {
    /* `createBlankProject` takes a brief argument and imported workspaces carry
       briefs written before the detective existed. Those cannot be recomposed,
       so the derivation falls back to the stored text rather than erasing it —
       this is why the derivation is not done at read time. */
    const legacy = { brief: 'A brief someone typed in 2024', detective: {} }
    expect(briefFromDetective(legacy, {})).toBe('A brief someone typed in 2024')
    expect(withDetective(legacy, {}).brief).toBe('A brief someone typed in 2024')

    // …and a real answer replaces it, rather than being appended to it.
    expect(briefFromDetective(legacy, { goal: 'Look established' })).toBe(
      'Goal: Look established'
    )
  })

  it('keeps the deadline mirror write on the derivation path too', () => {
    const s = () => useAppStore.getState()
    s().updateDetective('goal', 'Look established')
    s().setProjectDeadline('2027-02-19')
    expect(current().deadline).toBe('2027-02-19')
    expect(current().detective.projectDeadline).toBe('2027-02-19')
    // The brief it already had is not collateral damage.
    expect(current().brief).toContain('Look established')
  })
})

describe('there is exactly one author of the derived brief', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./useAppStore.js', import.meta.url)),
    'utf8'
  )
  /* Strip comments — the history above is allowed to name the old writes. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('composes the brief in one place only', () => {
    /* One definition, one call inside the derivation, and one emptiness probe
       in the deprecated `applyDetectiveToBrief`. Anything beyond that is a
       second author computing the same fact somewhere else. */
    const calls = [...code.matchAll(/composeBriefFromDetective\(/g)].length
    expect(
      calls,
      'composeBriefFromDetective should be reachable only through briefFromDetective'
    ).toBeLessThanOrEqual(3)
  })

  it('writes `brief:` only in the factory and the derivation helper', () => {
    /* Matched anywhere on the line for the same reason as the detective guard
       below: an anchored version let a one-line `{ ...p, brief }` writer pass. */
    const withoutHelper = code.replace(
      /export function withDetective\([\s\S]*?\n\}/,
      ''
    )
    const writes = [...withoutHelper.matchAll(/\bbrief:\s*([^,\n]+)/g)]
      .map((m) => m[1].trim())
      .sort()
    /* `createBlankProject` seeding the field from its own argument is the only
       write outside the derivation. A second one is a second author — which is
       what `updateDetective` effectively was while the two merges were not. */
    expect(writes).toEqual(["brief || ''"])
  })

  it('routes every detective write through withDetective', () => {
    /* Everything except the derivation helper itself: whatever assigns
       `detective:` out here is doing it without re-deriving the brief, which is
       precisely what both merges used to do.

       Matched anywhere on the line, not just at its start — the first version
       of this guard anchored to line-start and sailed straight past a
       one-line `return { ...p, detective: merged }`, which is the exact shape
       of the bug it exists to catch. */
    const withoutHelper = code.replace(
      /export function withDetective\([\s\S]*?\n\}/,
      ''
    )
    const assigns = [...withoutHelper.matchAll(/\bdetective:\s*([^,\n]+)/g)].map(
      (m) => m[1].trim()
    )
    /* The only survivor is `brandIdentityDefaults()` seeding a fresh project. */
    expect(assigns).toEqual(['blankDetective()'])
  })
})
