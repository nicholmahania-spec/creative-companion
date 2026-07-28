/**
 * Translate an internal error into something a client should read.
 *
 * `clientPortal.js` and `discoveryShare.js` serve two audiences from one set
 * of return values: the studio, who can act on "Cloud sync isn't configured",
 * and the client, who cannot. That string reached `/f/:shareId` and
 * `/c/:portalId` verbatim — a page a stranger opens on their phone as a
 * favour, telling them about a configuration they have never heard of and
 * could not fix. It reads as "you broke it".
 *
 * Most of the library's messages are already fine for either reader ("This
 * link isn't valid", "This form was already submitted"), so this maps only
 * the ones that are not, and passes everything else through unchanged.
 */

/** Internal-only messages, and what the client should see instead. */
const CLIENT_SAFE = new Map([
  ['Cloud sync isn’t configured', 'This link isn’t working right now. Try again shortly.'],
  ["Cloud sync isn't configured", 'This link isn’t working right now. Try again shortly.'],
])

/** Anything mentioning these is studio plumbing, not the client's problem. */
const INTERNAL_HINTS = [/\bcloud sync\b/i, /\bsign in\b/i, /\bsupabase\b/i]

const GENERIC = 'This link isn’t working right now. Try again shortly.'

export function clientFacingError(error) {
  const msg = String(error || '').trim()
  if (!msg) return GENERIC
  const mapped = CLIENT_SAFE.get(msg)
  if (mapped) return mapped
  /* Catches rephrasings of the same internal conditions without needing every
     variant listed — a new "Cloud sync unavailable" should not leak either. */
  if (INTERNAL_HINTS.some((re) => re.test(msg))) return GENERIC
  return msg
}
