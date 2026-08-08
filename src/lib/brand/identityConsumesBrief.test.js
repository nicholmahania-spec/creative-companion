import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  BRIEF_OWNED_WORDS,
  BRIEF_WORD_SOURCES,
  effectiveWord,
  isBriefOwned,
} from './briefWords'
import { DETECTIVE_CHAPTERS } from '../brief/detectiveBrief'

/**
 * IDENTITY CONSUMES THE BRIEF. IT DOES NOT RE-ASK IT.
 *
 * The direction sheet resolved the client's answers correctly and then put
 * every one of them inside a textarea. Resolving right and presenting wrong
 * is still wrong: a box says "Identity decides this", and an EMPTY box on a
 * design workspace says "you have not written the client's tone of voice
 * yet" — about a question the client had already answered, or about a
 * strategic question that is not Identity's to ask at all.
 *
 * Five lines move from asked to reported. The mechanism underneath does not
 * change: `effectiveWord` still resolves live, nothing is copied into a
 * project field, and a brief edited tomorrow shows through with nothing to
 * sync. Only the control is gone.
 */

const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(here, '../..', p), 'utf8')
const artboard = read('components/BrandArtboard.jsx')
const design = read('views/DesignView.jsx')

describe('the brief owns the strategic lines', () => {
  it('names exactly the five the brief asks in the same words', () => {
    expect([...BRIEF_OWNED_WORDS].sort()).toEqual(
      [
        'dontUse',
        'messagingPersonality',
        'messagingPromise',
        'messagingProof',
        'voice',
      ].sort()
    )
  })

  it('every brief-owned line has a real brief question behind it', () => {
    const ids = new Set(
      DETECTIVE_CHAPTERS.flatMap((c) => (c.fields || []).map((f) => f.id))
    )
    for (const field of BRIEF_OWNED_WORDS) {
      const source = BRIEF_WORD_SOURCES[field]
      expect(source, `${field} needs a brief source`).toBeTruthy()
      /* A line may only be taken away from Identity if the designer can
         actually reach it somewhere else. Otherwise this is not a move, it
         is a deletion. */
      expect(ids.has(source), `brief has no question "${source}"`).toBe(true)
    }
  })

  it('leaves the designer’s own lines alone', () => {
    /* No brief source at all — nothing asks what TO do, and nothing supplies
       a tagline. An empty box is the honest state for these. */
    for (const field of ['tagline', 'doUse']) {
      expect(BRIEF_WORD_SOURCES[field]).toBeUndefined()
      expect(isBriefOwned(field)).toBe(false)
    }
  })

  it('keeps positioning editable — a fallback is not the same fact', () => {
    /* The brief asks "What does your business do?" (`usp`), a description.
       A positioning statement is a synthesis written from it. `positioning`
       therefore HAS a fallback and is still the designer's to write —
       see positioningOwnership.test.js. */
    expect(BRIEF_WORD_SOURCES.positioning).toBe('usp')
    expect(isBriefOwned('positioning')).toBe(false)
  })
})

describe('the sheet reports those lines instead of asking them', () => {
  it('no longer takes a change handler for any of them', () => {
    for (const handler of [
      'onVoiceChange',
      'onPromiseChange',
      'onProofChange',
      'onPersonalityChange',
      'onDontChange',
    ]) {
      expect(artboard, `${handler} should be gone`).not.toContain(handler)
      expect(design, `${handler} should be gone`).not.toContain(handler)
    }
  })

  it('Identity never writes a brief-owned field', () => {
    for (const field of BRIEF_OWNED_WORDS) {
      expect(
        design.includes(`updateBrandField('${field}'`),
        `DesignView must not write ${field}`
      ).toBe(false)
    }
  })

  it('still writes the two that are genuinely its own', () => {
    expect(design).toContain("updateBrandField('tagline'")
    expect(design).toContain("updateBrandField('doUse'")
    expect(design).toContain("updateBrandField('positioning'")
  })

  it('offers a route to where they are written', () => {
    expect(artboard).toContain('onEditInBrief')
    expect(design).toContain('onEditInBrief')
    /* The label comes from the journey, not from a literal here —
       journeySingleSource.test.js enforces the same rule globally. */
    expect(artboard).toContain("labelForStepId('define')")
  })
})

describe('resolution stays live — nothing is copied', () => {
  const project = (own, brief) => ({ ...own, detective: brief })

  it('reads the client’s answer when the designer has written nothing', () => {
    const p = project({}, { toneOfVoice: 'warm, plain, unhurried' })
    expect(effectiveWord(p, 'voice')).toEqual({
      value: 'warm, plain, unhurried',
      fromBrief: true,
    })
  })

  it('follows the brief when the brief changes', () => {
    const before = project({}, { avoid: 'no stock photography' })
    const after = project({}, { avoid: 'no stock photography, no gradients' })
    expect(effectiveWord(before, 'dontUse').value).toBe('no stock photography')
    /* The whole point of resolve-never-copy: no sync step, no stale copy on
       the project, no "re-import from brief" button. */
    expect(effectiveWord(after, 'dontUse').value).toBe(
      'no stock photography, no gradients'
    )
  })

  it('still shows an override a designer wrote before this change', () => {
    /* Making the line read-only must not hide or discard what is already
       stored. The value shows, and it is correctly NOT marked as the
       client's. */
    const p = project(
      { messagingPromise: 'Shipped on the day we said' },
      { messagingPromise: 'we deliver on time' }
    )
    expect(effectiveWord(p, 'messagingPromise')).toEqual({
      value: 'Shipped on the day we said',
      fromBrief: false,
    })
  })

  it('says nothing rather than inventing a line', () => {
    expect(effectiveWord(project({}, {}), 'voice')).toEqual({
      value: '',
      fromBrief: false,
    })
  })
})
