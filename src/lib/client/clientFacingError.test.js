/**
 * The public routes must not explain the studio's plumbing to a client.
 */
import { describe, it, expect } from 'vitest'
import { clientFacingError } from './clientFacingError'

/*
 * These used to assert `/try again/i`. That pinned the exact wording rather
 * than the intent, and the wording was wrong: none of the conditions handled
 * here resolve by waiting, so "try again shortly" left the client reloading a
 * link that would never work. What actually matters is that the message keeps
 * the studio's plumbing out of it AND tells the client what to do next, so
 * that is what is asserted now.
 */
const RECOVERY = /ask your contact/i

describe('clientFacingError', () => {
  it('replaces the config error a client can do nothing about', () => {
    const out = clientFacingError('Cloud sync isn’t configured')
    expect(out).not.toMatch(/cloud sync/i)
    expect(out).toMatch(RECOVERY)
  })

  it('never tells the client to wait for something that will not change', () => {
    for (const input of ['Cloud sync isn’t configured', '', undefined]) {
      expect(clientFacingError(input)).not.toMatch(/try again/i)
    }
  })

  it('catches rephrasings of the same internal condition', () => {
    /* Listing exact strings would miss the next wording. */
    expect(clientFacingError('Cloud sync unavailable')).not.toMatch(/cloud/i)
    expect(clientFacingError('Sign in to send a client link')).not.toMatch(
      /sign in/i
    )
  })

  it('passes through messages that already speak to the client', () => {
    for (const msg of [
      'This link isn’t valid',
      'This form was already submitted',
      'Couldn’t send the message',
    ]) {
      expect(clientFacingError(msg)).toBe(msg)
    }
  })

  it('says something actionable rather than nothing when there is no message', () => {
    expect(clientFacingError('')).toMatch(RECOVERY)
    expect(clientFacingError(undefined)).toMatch(RECOVERY)
  })
})
