import { describe, expect, it } from 'vitest'
import {
  DELIVERABLE_OPTIONS,
  coerceScannedAnswers,
  isWrongShapeForField,
} from './detectiveBrief'
import { touchpointsFor } from './touchpoints'

/**
 * Free text from the paper/OCR route must never reach a typed field.
 *
 * The blank "Project overview" PDF draws a plain text box for every field
 * regardless of type — no checkbox for a checklist, no radio for a choice, no
 * worded scale for a spectrum — and both read paths return
 * Record<string,string>. So a client filling the page in by hand writes
 * "logo, cards" into a slot the whole app treats as an array of option ids.
 *
 * Nothing throws, because every consumer guards with `Array.isArray(x) ? x :
 * []`. That is exactly why it was expensive: the Define checklist shows every
 * box unchecked for a value sitting right there, progress reads further along
 * than it is because isFilled() still counts the string, and touchpointsFor()
 * falls back to LEGACY_TOUCHPOINTS — so the brand book handed to the client
 * prints stock applications instead of the ones they asked for.
 *
 * The last of those is the one worth a test with teeth, so it is asserted
 * against the real touchpoints function rather than described in a comment.
 */
describe('coerceScannedAnswers', () => {
  const twoRealIds = DELIVERABLE_OPTIONS.slice(0, 2)

  it('matches written labels back to option ids', () => {
    const { answers } = coerceScannedAnswers({
      deliverablesPicked: twoRealIds.map((o) => o.label).join(', '),
    })
    expect(answers.deliverablesPicked).toEqual(twoRealIds.map((o) => o.id))
  })

  it('never leaves a raw string in a checklist field', () => {
    const { answers } = coerceScannedAnswers({
      deliverablesPicked: 'something nobody offers',
    })
    expect(typeof answers.deliverablesPicked).not.toBe('string')
  })

  /* Losing the client's words would be its own bug — the review screen shows
     this back so a human can tick what it meant. */
  it('hands back what it could not match, rather than dropping it', () => {
    const { unmatched } = coerceScannedAnswers({
      deliverablesPicked: `${twoRealIds[0].label}, a neon sign`,
    })
    expect(unmatched.deliverablesPicked).toBe('a neon sign')
  })

  /* The label a client is most likely to write contains commas of its own.
     Splitting the free text on commas shredded it into fragments that matched
     nothing — found while writing these tests, not in review. */
  it('matches an option label that itself contains commas', () => {
    const withCommas = DELIVERABLE_OPTIONS.find((o) => o.label.includes(','))
    expect(withCommas).toBeTruthy()
    const { answers, unmatched } = coerceScannedAnswers({
      deliverablesPicked: withCommas.label,
    })
    expect(answers.deliverablesPicked).toContain(withCommas.id)
    expect(unmatched.deliverablesPicked).toBeUndefined()
  })

  it('leaves ordinary text fields alone', () => {
    const { answers } = coerceScannedAnswers({ goal: 'Sell more bread' })
    expect(answers.goal).toBe('Sell more bread')
  })

  it('passes through a value that is already the right shape', () => {
    const ids = twoRealIds.map((o) => o.id)
    const { answers } = coerceScannedAnswers({ deliverablesPicked: ids })
    expect(answers.deliverablesPicked).toEqual(ids)
  })
})

describe('isWrongShapeForField', () => {
  it('rejects free text aimed at a checklist', () => {
    expect(isWrongShapeForField('deliverablesPicked', 'logo, cards')).toBe(true)
  })

  it('rejects option ids that are not declared', () => {
    expect(isWrongShapeForField('deliverablesPicked', ['not-an-option'])).toBe(
      true
    )
  })

  it('accepts a declared set', () => {
    expect(
      isWrongShapeForField('deliverablesPicked', [DELIVERABLE_OPTIONS[0].id])
    ).toBe(false)
  })

  /* Too strict is its own failure: a guard that rejects real answers loses
     client input, which is the bug it exists to prevent, pointed backwards. */
  it('leaves unknown fields and plain text fields alone', () => {
    expect(isWrongShapeForField('not-a-field', 'anything')).toBe(false)
    expect(isWrongShapeForField('goal', 'Sell more bread')).toBe(false)
  })

  it('treats empty as nothing to complain about', () => {
    expect(isWrongShapeForField('engagementType', '')).toBe(false)
  })
})

describe('the consequence this protects', () => {
  /* The reason this matters beyond tidiness: a string here silently changed a
     document that goes to the client. */
  it('keeps the client’s own applications in the brand book', () => {
    const chosen = coerceScannedAnswers({
      brandSurfaces: 'Website, Packaging',
    }).answers.brandSurfaces

    // Positional: touchpointsFor(surfaces, deliverables).
    const fromRawString = touchpointsFor('Website, Packaging', [])
    const fromCoerced = touchpointsFor(chosen, [])

    // The uncoerced string falls back to the stock list; the coerced value
    // does not. If these ever match, the fallback has swallowed the answer.
    expect(fromCoerced).not.toEqual(fromRawString)
  })
})
