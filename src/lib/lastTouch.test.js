/**
 * "Where you left off" restores the thought, not just the route.
 *
 * The desk already had a control reading "Back to Identity / where you left
 * off". That names a destination, and a destination reloads the room without
 * reloading what you were thinking in it. Returning days later, working memory
 * has nothing to reconstruct from, so the first minutes go on re-reading your
 * own work to find the thread — and that re-read is where the session dies
 * before it starts.
 *
 * The tone rules below are not decoration; they are the feature. This line is
 * read at the moment of return, by someone who may have been avoiding the
 * project. A sentence that counts the days converts a resumption into an
 * accusation, and the reader most likely to have left it two weeks is the
 * reader most likely to respond by closing the tab. Name the state, not the
 * gap.
 */

import { describe, it, expect } from 'vitest'
import { lastTouchSentence } from '../views/DeskView.jsx'

describe('it says what you were in the middle of', () => {
  it('names the stage, not just a destination', () => {
    expect(lastTouchSentence({ stopLabel: 'Identity' })).toBe(
      'Last time you were in Identity.'
    )
  })

  it('adds the client state when there is something waiting', () => {
    expect(
      lastTouchSentence({ stopLabel: 'Identity', unreadClient: true })
    ).toBe('Last time you were in Identity. The client has sent something since.')
  })

  it('says plainly when the client has been quiet', () => {
    /* "Nothing from the client since" is the fact that actually unblocks the
       reader: it answers "am I waiting or are they?" without them having to
       go and look. */
    expect(
      lastTouchSentence({ stopLabel: 'Logo', waitingOnClient: true })
    ).toBe('Last time you were in Logo. Nothing from the client since.')
  })

  it('prefers real news over silence when both could apply', () => {
    expect(
      lastTouchSentence({
        stopLabel: 'Logo',
        unreadClient: true,
        waitingOnClient: true,
      })
    ).toMatch(/has sent something/)
  })
})

describe('it stays quiet when it has nothing to say', () => {
  it('returns empty for a project with no history', () => {
    // A first-open project has nothing to recall, and a sentence that says
    // nothing is just one more thing on the screen.
    expect(lastTouchSentence()).toBe('')
    expect(lastTouchSentence({ stopLabel: '   ' })).toBe('')
  })

  it('still speaks when only the client state is known', () => {
    expect(lastTouchSentence({ unreadClient: true })).toBe(
      'The client has sent something since.'
    )
  })
})

describe('it never scolds', () => {
  const samples = [
    lastTouchSentence({ stopLabel: 'Identity' }),
    lastTouchSentence({ stopLabel: 'Identity', unreadClient: true }),
    lastTouchSentence({ stopLabel: 'Identity', waitingOnClient: true }),
    lastTouchSentence({ unreadClient: true }),
  ]

  it('never counts elapsed time', () => {
    /* The specific sentence this forbids: "It's been 12 days." It is
       information the reader cannot act on, and it lands as judgement. */
    for (const s of samples) {
      expect(s, s).not.toMatch(/\d+\s*(day|week|month|hour|min)/i)
      expect(s, s).not.toMatch(/\bago\b|\bstill\b|\boverdue\b/i)
    }
  })

  it('uses no alarm words and no exclamation', () => {
    for (const s of samples) {
      expect(s, s).not.toMatch(/!|urgent|behind|late|stalled|neglect|forgot/i)
    }
  })

  it('stays to one or two short sentences', () => {
    // A paragraph here would be a second thing to read before starting, which
    // is precisely the cost being removed.
    for (const s of samples) {
      expect(s.split('.').filter(Boolean).length, s).toBeLessThanOrEqual(2)
      expect(s.length, s).toBeLessThanOrEqual(90)
    }
  })
})
