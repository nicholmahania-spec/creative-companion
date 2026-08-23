/**
 * A brand-new project must not claim to have finished anything.
 *
 * THE BUG THIS PINS (audit F5). `createBlankProject` seeds
 * `bookBuilder: { ...bookSetup }` from the studio's sticky page defaults, and
 * the `book` completion rule read exactly that:
 *
 *     return !!(project.bookBuilder && typeof project.bookBuilder === 'object')
 *
 * with a comment claiming it "proves builder opened". It never did — it was
 * true from the instant a project existed. App.jsx latches every met condition
 * into `pathReached` on first render and `markPathReached` can never clear a
 * latch, so every new project announced "Step 6: Brand book, done" to the step
 * rail and to screen readers, permanently, before anyone opened it.
 *
 * This is the product's core promise (an honest Completed → Current → Next)
 * failing on the very first screen of every project, and 2,981 unit tests were
 * green while it shipped — because no test ever asked what a BLANK project
 * claims. That is the gap this file closes: it asserts over the real
 * `createBlankProject`, not over a hand-written fixture, so a future default
 * that accidentally satisfies a completion rule fails here.
 */
import { describe, it, expect } from 'vitest'
import { JOURNEY_STEPS } from './journey'
import { pathStepMeetsCondition, pathStepHasContent } from './journeyProgress'
import { stopEstablished } from './stopEstablished'
import { createBlankProject } from '../../store/useAppStore'
import { ensureBookDocumentData } from '../documents/documentModel'

const ctxFor = (project) => ({
  project,
  moodItems: [],
  tasks: [],
  palette: project.palette || [],
})

describe('a blank project claims nothing', () => {
  it('reports NO stop as done, on the real createBlankProject', () => {
    const project = createBlankProject('Blank')
    const ctx = ctxFor(project)
    const claimed = JOURNEY_STEPS.filter((s) =>
      pathStepMeetsCondition(s.id, ctx)
    ).map((s) => s.id)
    expect(
      claimed,
      'A project created seconds ago has finished none of its stops. ' +
        'A default that satisfies a completion rule is a false claim the ' +
        'pathReached latch then makes permanent.'
    ).toEqual([])
  })

  it('reports Brand book as not done, and says so in words', () => {
    const project = createBlankProject('Blank')
    const ctx = ctxFor(project)
    expect(pathStepMeetsCondition('book', ctx)).toBe(false)
    expect(pathStepHasContent('book', ctx)).toBe(false)
    expect(stopEstablished('book', ctxFor(project)).line).toBe('Builder not opened yet')
  })

  it('still carries the seeded page setup — the fix must not delete it', () => {
    /* `bookBuilder` is load-bearing: it holds the studio's sticky page setup
       and an older build reading the same workspace still finds its settings
       there (PRD §5). The bug was reading it as evidence of work, not its
       existence. */
    const project = createBlankProject('Blank')
    expect(project.bookBuilder).toBeTypeOf('object')
    expect(project.bookBuilder).not.toBeNull()
  })
})

describe('Brand book becomes done when the builder is actually opened', () => {
  it('ticks once the Book Document exists', () => {
    const project = createBlankProject('Blank')
    expect(pathStepMeetsCondition('book', ctxFor(project))).toBe(false)

    /* Exactly what opening the builder does: BrandBookBuilderView's mount
       effect calls ensureBookDocument, which writes this. */
    const opened = { ...project, document: ensureBookDocumentData(project) }

    expect(pathStepMeetsCondition('book', ctxFor(opened))).toBe(true)
    expect(stopEstablished('book', ctxFor(opened)).line).toBe('Builder opened')
  })

  it('survives a persist round-trip', () => {
    const project = createBlankProject('Blank')
    const opened = { ...project, document: ensureBookDocumentData(project) }
    const reloaded = JSON.parse(JSON.stringify(opened))
    expect(pathStepMeetsCondition('book', ctxFor(reloaded))).toBe(true)
  })

  it('a project that already earned the tick keeps it', () => {
    /* Projects saved before this fix laid out a book while the old rule was
       live, so they carry `pathReached.book`. The latch outranks the live
       condition, which is why correcting the rule cannot take a mark away
       from work someone actually did. */
    const legacy = {
      ...createBlankProject('Legacy'),
      pathReached: { book: true },
    }
    expect(pathStepMeetsCondition('book', ctxFor(legacy))).toBe(false)
    expect(pathStepHasContent('book', ctxFor(legacy))).toBe(true)
  })
})
