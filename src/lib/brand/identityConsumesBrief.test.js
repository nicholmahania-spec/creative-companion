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
import { FIELD_HOMES } from '../book/bookContent'
import { isArtboardDeepLink } from '../journey/identitySubsteps'

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

describe('positioning is a synthesis, not a copy of the client\'s answer', () => {
  /* The client supplies source material ("What does your business do?"). The
     designer writes a positioning line FROM it. Those are two facts, and the
     sheet must not let one become the other. */

  it('never pre-fills the designer\'s box with the client\'s sentence', () => {
    /* The box used to be `value={value}` — the RESOLVED value. With no
       positioning written that is the client's `usp`, so the first keystroke
       sent the whole string into `project.positioning` and the client's
       description silently became the designer's positioning line. One fact
       forked into two columns, which is the thing briefWords.js exists to
       prevent. The box binds to the project's own field now. */
    expect(artboard).toContain("const ownValue = String(project?.[field] ?? '')")
    /* Checked on the TEXTAREA specifically. The read-only line below it
       legitimately renders the resolved value — that is the display, and it
       is the fallback working as intended. It is binding the EDITABLE
       control to the resolved value that copies. */
    const textareas = artboard.match(/<textarea[\s\S]*?\/>/g) || []
    expect(textareas.length).toBeGreaterThan(0)
    for (const t of textareas) {
      expect(t, 'a textarea must not bind to the resolved value').not.toMatch(
        /value=\{value\}/
      )
    }
    expect(textareas.some((t) => t.includes('value={ownValue}'))).toBe(true)
  })

  it('still shows the client\'s answer, as material rather than as a draft', () => {
    expect(artboard).toContain('sourceBehind')
    expect(artboard).toContain('artboard-word-source')
  })

  it('still falls back for display and export when nothing is written', () => {
    /* Only the CONTROL stopped pre-filling. What the sheet reports, and what
       the book and the pack print, is unchanged. */
    const p = { detective: { usp: 'We make small-batch ceramics' } }
    expect(effectiveWord(p, 'positioning')).toEqual({
      value: 'We make small-batch ceramics',
      fromBrief: true,
    })
    const written = { ...p, positioning: 'For makers who ship on the date' }
    expect(effectiveWord(written, 'positioning')).toEqual({
      value: 'For makers who ship on the date',
      fromBrief: false,
    })
  })
})

describe('every field points at a place it can actually be written', () => {
  it('sends the brief-owned lines to the brief', () => {
    for (const field of BRIEF_OWNED_WORDS) {
      const home = FIELD_HOMES[field]
      expect(home, `${field} needs a home`).toBeTruthy()
      /* "Write it on the sheet" would land the designer on a line they
         cannot type in. A link that names a destination where the thing
         cannot be done is the dead-pointer defect, not a cosmetic detail. */
      expect(home.view, `${field} must not point at Identity`).toBe('project')
    }
  })

  it('keeps positioning on the sheet, and the sheet reachable', () => {
    expect(FIELD_HOMES.positioning.view).toBe('brand')
    expect(FIELD_HOMES.positioning.section).toBe('positioning')
    /* The book's link routes through `goSystemSection`, which only lands on
       the sheet for ids the artboard claims. If this ever stopped being an
       artboard link the button would silently open Mark instead. */
    expect(isArtboardDeepLink(FIELD_HOMES.positioning.section)).toBe(true)
  })

  it('keeps the designer\'s other own lines on the sheet too', () => {
    expect(FIELD_HOMES.tagline.view).toBe('brand')
    expect(FIELD_HOMES.doUse.view).toBe('brand')
  })
})
