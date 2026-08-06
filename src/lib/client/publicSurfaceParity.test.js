import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The public, no-login client surfaces must not drift apart.
 *
 * /f/:shareId, /c/:portalId and /d/:portalId are built from one data shape and
 * serve one kind of person: a stranger, on a phone, with no account, who
 * cannot be told how the tool works. Every time one of them has been fixed, the other has been
 * missed — this codebase has recorded the pattern three separate times now:
 *
 *   - the ${fieldId}Files attachment branch, added to one merge path first
 *   - auto-pinning client images to the Research wall, likewise
 *   - drafting typed answers to localStorage, which /f/ has had since it was
 *     built (with the reasoning written down) while /c/ — the LONGER form, and
 *     the one a client returns to repeatedly — kept none of it, so a phone call
 *     mid-brief lost everything with no acknowledgement
 *
 * Each was a real bug found by an audit rather than by a test, because nothing
 * asserted the two halves agree. This does.
 *
 * It checks for the mechanism, not for identical code. The two surfaces are
 * allowed to differ — /c/ refreshes its message thread on tab focus rather than
 * on the studio's flat interval, because it runs on someone else's battery.
 * What they may not do is have one of them silently lack a protection the other
 * documents as necessary.
 */
const FILL = new URL('../../features/client-portal/PublicDiscoveryFill.jsx', import.meta.url)
  .pathname
const PORTAL = new URL('../../features/client-portal/PublicClientPortal.jsx', import.meta.url)
  .pathname
const REVEAL = new URL('../../features/client-portal/PublicBrandReveal.jsx', import.meta.url)
  .pathname

const fill = readFileSync(FILL, 'utf8')
const portal = readFileSync(PORTAL, 'utf8')
const reveal = readFileSync(REVEAL, 'utf8')

/* Every surface a stranger can be sent a link to. Added to as new ones ship —
   the reveal (/d/) is the third, and it takes typed input (the reaction) that
   is single-use server-side, which is exactly the shape the rules below
   exist for. */
const SURFACES = [
  ['PublicDiscoveryFill', fill],
  ['PublicClientPortal', portal],
  ['PublicBrandReveal', reveal],
]

describe('public client surfaces keep parity', () => {
  it('all of them draft what the client types to localStorage', () => {
    for (const [name, src] of SURFACES) {
      expect(src, `${name} must persist a draft`).toMatch(
        /localStorage\.setItem/
      )
      expect(src, `${name} must restore a draft`).toMatch(
        /localStorage\.getItem/
      )
    }
  })

  /* A draft that is never cleared re-populates a submitted form the next time
     the client opens the link, which reads as "it didn't send". */
  it('they clear the draft once the answers are sent', () => {
    expect(fill).toMatch(/localStorage\.removeItem/)
    expect(reveal).toMatch(/localStorage\.removeItem/)
    // The portal has three independently-submitted pieces, so it clears the
    // relevant slice rather than the whole key.
    expect(portal).toMatch(/writeDraft\(\{\s*form:\s*\{\}\s*\}\)/)
    expect(portal).toMatch(/writeDraft\(\{\s*survey:\s*\{\}\s*\}\)/)
  })

  /* Reading a draft that isn't valid JSON must not take the page down — this
     is a stranger's only route to answering, and there is no support channel. */
  it('they survive a draft that cannot be read back', () => {
    for (const [name, src] of SURFACES) {
      const near = src.slice(
        Math.max(0, src.indexOf('localStorage.getItem') - 400),
        src.indexOf('localStorage.getItem') + 400
      )
      expect(near, `${name} must guard the parse`).toMatch(/catch/)
    }
  })

  /* The client half of a conversation must not depend on the client
     remembering to press a button — the studio half has said so in a comment
     since it was built, and the stranger is the one who cannot be coached. */
  it('the portal refreshes its thread without being asked', () => {
    expect(portal).toMatch(/visibilitychange|setInterval/)
  })

  /* A stranger must never be shown a raw driver error, and must never be left
     with a dead end. Every surface renders its failure through
     clientFacingError, which is where that translation lives. */
  it('every surface translates failures into client-facing words', () => {
    for (const [name, src] of SURFACES) {
      expect(src, `${name} must not show a raw error`).toMatch(/clientFacingError/)
    }
  })
})
