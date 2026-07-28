/**
 * The public routes must not explain the studio's plumbing to a client.
 */
import { describe, it, expect } from 'vitest'
import { clientFacingError } from './clientFacingError'

describe('clientFacingError', () => {
  it('replaces the config error a client can do nothing about', () => {
    const out = clientFacingError('Cloud sync isn’t configured')
    expect(out).not.toMatch(/cloud sync/i)
    expect(out).toMatch(/try again/i)
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

  it('says something rather than nothing when there is no message', () => {
    expect(clientFacingError('')).toMatch(/try again/i)
    expect(clientFacingError(undefined)).toMatch(/try again/i)
  })
})
