import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ANSWERS_MAX_BYTES,
  ANSWERS_SAFE_BYTES,
  ANSWERS_TOO_LARGE_MESSAGE,
  answersByteSize,
  answersTooLarge,
} from './answerPayload'

/**
 * A client must never be told they already submitted when they did not.
 *
 * The three submit RPCs refuse a payload over 200 KB and signal it exactly the
 * way they signal "this link was already used" — by returning false. Every
 * wrapper collapsed that into "This form was already submitted". On a
 * single-use link that is the most expensive wrong message available: the
 * client believes they are done, they stop, and nothing on the studio side
 * shows anything is missing.
 */
describe('answer payload size guard', () => {
  it('lets an ordinary set of answers through', () => {
    expect(answersTooLarge({ goal: 'Sell more bread', feel: 'Warm, honest' }))
      .toBe(false)
  })

  it('stops a payload that would be refused by the server', () => {
    const huge = { inspirationLinksFiles: 'x'.repeat(ANSWERS_MAX_BYTES) }
    expect(answersTooLarge(huge)).toBe(true)
  })

  /* The margin is the point. pg_column_size measures stored jsonb, which is
     not byte-identical to JSON.stringify — so the limit enforced here has to
     sit below the server's, or an accepted payload can still be refused and we
     are back to the wrong message. */
  it('enforces a limit below the server ceiling, not equal to it', () => {
    expect(ANSWERS_SAFE_BYTES).toBeLessThan(ANSWERS_MAX_BYTES)
  })

  it('measures real byte length, not character count', () => {
    // Multi-byte characters cost more than one byte each; a .length check
    // would under-count them and let an oversize payload through.
    const size = answersByteSize({ a: '€€€' })
    expect(size).toBeGreaterThan(JSON.stringify({ a: '€€€' }).length - 1)
    expect(size).toBeGreaterThan(8)
  })

  /* Failing to measure must not block a submit — that would invent a new way
     to lose an answer while fixing another. */
  it('does not block when the payload cannot be measured', () => {
    const circular = {}
    circular.self = circular
    expect(answersTooLarge(circular)).toBe(false)
  })

  it('tells the client the one thing they can act on', () => {
    expect(ANSWERS_TOO_LARGE_MESSAGE).toMatch(/image/i)
    // No byte counts or field names — this is read by a stranger on a phone.
    expect(ANSWERS_TOO_LARGE_MESSAGE).not.toMatch(/\d/)
  })
})

describe('every single-use submit checks before it sends', () => {
  /* All three collapse a false return into "already submitted". The guard has
     to be on all three or the message stays a lie on whichever one is missed —
     which is precisely how this codebase's public surfaces keep drifting. */
  const files = [
    'discoveryShare.js',
    'clientPortal.js',
  ].map((f) => ({
    name: f,
    text: readFileSync(new URL(`./${f}`, import.meta.url).pathname, 'utf8'),
  }))

  it('guards every submit RPC call site', () => {
    for (const { name, text } of files) {
      const submits = (text.match(/supabase\.rpc\('submit_[a-z_]+'/g) || [])
      expect(submits.length, `${name} should have submit calls`).toBeGreaterThan(0)
      const guards = (text.match(/answersTooLarge\(/g) || []).length
      expect(guards, `${name}: one guard per submit`).toBe(submits.length)
    }
  })
})
