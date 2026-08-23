/**
 * A frozen Book Version must carry everything the book PRINTS that a person
 * authored — and nothing the app merely defaulted.
 *
 * HOW THIS WAS FOUND. Phase 8 made the client package version-bound. The first
 * real delivery after that went from a 20-page working book to a 17-page
 * frozen one. Three pages vanished, and the three had different causes:
 *
 *   Imagery    the ★ pack was never frozen at all. `pins` is authored work —
 *              the designer starred them and wrote a "why" on each — and the
 *              Version had no field for it, so the frozen pack rendered
 *              `pins: []` and the page was skipped. REAL LOSS.
 *   Messaging  `messagingPlan` / `messagingCta` are the client's own answers
 *              from the Brief. The book prints them; `frozenBookContentFrom`
 *              walks `PAGE_FIELDS` + `BOOK_CONTENT_EXTRA_FIELDS` and they were
 *              in neither list. REAL LOSS.
 *   Writing    `writingCase` / `writingCaps` were NOT authored. They are
 *              `brandIdentityDefaults` factory values, and
 *              `buildBrandPackSnapshot` re-defaults them again
 *              (`p.writingCase || 'sentence'`). The live book printed the
 *              app's own rule as though the designer had written it. Losing
 *              that page is CORRECT — freezing it would be the
 *              placeholder-as-spec failure docs/PRD.md §9 bans.
 *
 * So "make the page count match" is the wrong goal, and this file exists to
 * stop anyone reaching for it: it asserts the authored things survive AND that
 * the defaulted ones still do not.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  frozenBookContentFrom,
  authoredWritingRules,
  bookContentFieldList,
  BOOK_CONTENT_EXTRA_FIELDS,
  STOCK_WRITING_CASE,
  STOCK_WRITING_CAPS,
} from './bookContent'

/** A pack shaped like `buildBrandPackSnapshot` produces, with everything set. */
const authoredPack = (over = {}) => ({
  clientName: 'Real Client',
  name: 'Real Client',
  studio: 'A Studio',
  tagline: 'A tagline',
  messagingPlan: 'Read the label. Buy one thing.',
  messagingCta: 'Start with the body oil',
  writingNotes: 'Never hyphenate the product names.',
  printPantone: '7526 C',
  printStock: 'Uncoated 300gsm',
  printFinish: 'Soft-touch matte',
  /* What the pack ALWAYS carries, authored or not. */
  writingCase: STOCK_WRITING_CASE,
  writingCaps: STOCK_WRITING_CAPS,
  detective: {},
  ...over,
})

describe('authored Book content survives the freeze', () => {
  it('freezes the Messaging appendix — the client answered these', () => {
    const out = frozenBookContentFrom(authoredPack())
    expect(out.messagingPlan).toBe('Read the label. Buy one thing.')
    expect(out.messagingCta).toBe('Start with the body oil')
  })

  it('freezes authored print specification', () => {
    const out = frozenBookContentFrom(authoredPack())
    expect(out.printPantone).toBe('7526 C')
    expect(out.printStock).toBe('Uncoated 300gsm')
    expect(out.printFinish).toBe('Soft-touch matte')
  })

  it('freezes free-text writing notes, which have no factory value', () => {
    const out = frozenBookContentFrom(authoredPack())
    expect(out.writingNotes).toBe('Never hyphenate the product names.')
  })

  it('lists every printed field it knows about', () => {
    const list = bookContentFieldList()
    for (const f of ['messagingPlan', 'messagingCta', 'writingNotes', 'printPantone']) {
      expect(list, `${f} missing from the printed-field list`).toContain(f)
    }
  })
})

describe('default content is NOT falsely frozen', () => {
  it('does not freeze the factory writing rules', () => {
    /* The exact failure to avoid: printing the app's own default in a client's
       brand book as though it were the designer's rule. */
    const out = frozenBookContentFrom(authoredPack())
    expect(out.writingCase).toBeUndefined()
    expect(out.writingCaps).toBeUndefined()
  })

  it('DOES freeze a writing rule the designer actually moved', () => {
    const out = frozenBookContentFrom(
      authoredPack({ writingCase: 'title', writingCaps: 'never' })
    )
    expect(out.writingCase).toBe('title')
    expect(out.writingCaps).toBe('never')
  })

  it('authoredWritingRules is the single place that decides', () => {
    expect(authoredWritingRules({ writingCase: STOCK_WRITING_CASE })).toEqual({})
    expect(authoredWritingRules({ writingCaps: STOCK_WRITING_CAPS })).toEqual({})
    expect(authoredWritingRules({ writingCase: 'title' })).toEqual({ writingCase: 'title' })
    expect(authoredWritingRules({})).toEqual({})
    expect(authoredWritingRules(null)).toEqual({})
  })

  it('the stock values still match the store defaults', () => {
    /* If `brandIdentityDefaults` moves, the stock test above silently starts
       freezing the new default. This is the tripwire. */
    const store = readFileSync(
      new URL('../../store/useAppStore.js', import.meta.url),
      'utf8'
    )
    expect(store).toMatch(
      new RegExp(`writingCase:\\s*'${STOCK_WRITING_CASE}'`)
    )
    expect(store).toMatch(
      new RegExp(`writingCaps:\\s*'${STOCK_WRITING_CAPS}'`)
    )
  })

  it('empty authored fields are omitted, not frozen as blanks', () => {
    const out = frozenBookContentFrom(
      authoredPack({ printPantone: '', printStock: '   ', writingNotes: '' })
    )
    expect(out.printPantone).toBeUndefined()
    expect(out.printStock).toBeUndefined()
    expect(out.writingNotes).toBeUndefined()
  })

  it('the extras list carries no field with a factory value', () => {
    /* Adding an enum-with-a-default to BOOK_CONTENT_EXTRA_FIELDS would
       reintroduce the bug wholesale, because that path does not ask whether
       the value was chosen. */
    expect(BOOK_CONTENT_EXTRA_FIELDS).not.toContain('writingCase')
    expect(BOOK_CONTENT_EXTRA_FIELDS).not.toContain('writingCaps')
  })
})
