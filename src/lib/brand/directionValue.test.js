/**
 * What counts as an answered direction-sheet line.
 *
 * The distinction is not cosmetic: an unanswered line renders as "—" in muted
 * ink, meaning "nobody has decided this yet", and that has to stay true for
 * whitespace. A stray space typed into an empty field must not make the sheet
 * claim a decision was made — the direction sheet is the thing a client is
 * shown, and every line on it is read as settled.
 */

import { describe, it, expect } from 'vitest'
import { hasAnswer } from './directionValue'

describe('hasAnswer', () => {
  it('is false for the states that mean nobody has decided yet', () => {
    for (const v of [undefined, null, '', '   ', '\n', '\t ']) {
      expect(hasAnswer(v), JSON.stringify(v)).toBe(false)
    }
  })

  it('is true for real content, including content that is mostly spaces', () => {
    expect(hasAnswer('Warm')).toBe(true)
    expect(hasAnswer('  Warm, for new parents  ')).toBe(true)
    expect(hasAnswer('—')).toBe(true) // a typed em-dash IS an answer
  })
})
