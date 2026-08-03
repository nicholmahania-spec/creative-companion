/**
 * A scripted reply must never be mistakable for a real one.
 *
 * `coachWithHelper` has always reported which it gave back —
 * `{ text, source: 'ai' | 'scripted', error? }` — and BuddyMate discarded
 * everything but `text`. So a dead API key, a 503 from an unconfigured
 * proxy, or an expired session produced a plausible canned sentence that
 * looked exactly like a working Helper.
 *
 * That is the worst shape a failure can take: it cannot be debugged from
 * the outside, because from the outside it does not look like a failure.
 * It hid for as long as it did precisely because pressing the button
 * always "worked".
 *
 * The distinction under test is narrow and worth stating: `scripted` WITH
 * an error means the model was expected and did not answer — that gets
 * marked. `scripted` with no error is ordinary offline mode, which is
 * honest already and must NOT be marked, or the badge appears permanently
 * for every local user and stops meaning anything.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const buddy = readFileSync(
  fileURLToPath(new URL('../../features/helper/BuddyMate.jsx', import.meta.url)),
  'utf8'
)
const helper = readFileSync(
  fileURLToPath(new URL('./helperAi.js', import.meta.url)),
  'utf8'
)

describe('helper fallback is visible', () => {
  it('coachWithHelper still reports its source', () => {
    // The contract BuddyMate depends on. If this stops being returned, the
    // marking below silently becomes a no-op.
    expect(helper).toMatch(/source:\s*'ai'/)
    expect(helper).toMatch(/source:\s*'scripted'/)
  })

  it('BuddyMate reads source rather than only text', () => {
    expect(
      buddy,
      'BuddyMate must inspect result.source — reading only result.text is the bug'
    ).toMatch(/result\.source\s*===\s*'scripted'/)
  })

  it('marks the reply only when the model was expected and failed', () => {
    // `&& !!result.error` is the whole distinction — without it every
    // offline user gets a permanent badge and it stops carrying meaning.
    expect(buddy).toMatch(
      /offline:\s*result\.source\s*===\s*'scripted'\s*&&\s*!!result\.error/
    )
  })

  it('renders the marker where replies are shown', () => {
    // Two render paths — the single latest reply and the message list.
    // Fixing one and missing the other is this repo's recurring failure.
    const uses = buddy.match(/<OfflineNote \/>/g) || []
    expect(uses.length, 'both render paths must show the marker').toBe(2)
    expect(buddy).toMatch(/function OfflineNote/)
  })

  it('states a fact rather than raising an alarm', () => {
    /* The Helper is what you reach for when things are already going badly;
       a red error banner there is the shame-coded failure CLAUDE.md rules
       out. No retry button either — the reply underneath is usable, and an
       unpredictable button is a decision billed at the worst moment. */
    const note = buddy.slice(buddy.indexOf('function OfflineNote'))
    const body = note.slice(0, note.indexOf('}'))
    expect(body).not.toMatch(/error|failed|problem|retry|try again/i)
  })

  it('keeps the real reason in the console', () => {
    // The user gets a short honest note; whoever is debugging gets the cause.
    expect(buddy).toMatch(/console\.warn\([^)]*Helper AI/)
  })
})
