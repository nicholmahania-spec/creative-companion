/**
 * Translate an internal error into something a client should read.
 *
 * `clientPortal.js` and `discoveryShare.js` serve two audiences from one set
 * of return values: the studio, who can act on CLOUD_REQUIRED,
 * and the client, who cannot. That string reached `/f/:shareId` and
 * `/c/:portalId` verbatim — a page a stranger opens on their phone as a
 * favour, telling them about a configuration they have never heard of and
 * could not fix. It reads as "you broke it".
 *
 * Most of the library's messages are already fine for either reader ("This
 * link isn't valid", "This form was already submitted"), so this maps only
 * the ones that are not, and passes everything else through unchanged.
 */

import { CLOUD_REQUIRED } from './cloudRequired.js'

/*
 * "Try again shortly" used to end each of these. It was wrong twice over: the
 * conditions it covers are configuration, not weather, so nothing changes by
 * waiting — and it left the client with no action but to keep reloading a link
 * that will never work. Worse, it OVERRODE the good fallback the portal
 * already had ("ask your contact to send a fresh one"), because that fallback
 * only renders when `error` is empty.
 *
 * This is a client's first impression of the designer, so it now ends with the
 * same recovery path the fallback uses. The studio's own name would be better
 * than "your contact", but the portal has not loaded when this renders, so
 * there is no name to use.
 */

/** Internal-only messages, and what the client should see instead. */
const CLIENT_SAFE = new Map([
  ['Cloud sync isn’t configured', 'This link isn’t working right now — ask your contact to send a fresh one.'],
  ["Cloud sync isn't configured", 'This link isn’t working right now — ask your contact to send a fresh one.'],
  [CLOUD_REQUIRED, 'This link isn’t working right now — ask your contact to send a fresh one.'],
])

/** Anything mentioning these is studio plumbing, not the client's problem. */
const INTERNAL_HINTS = [/\bcloud sync\b/i, /\bsign in\b/i, /\bsupabase\b/i]

const GENERIC = 'This link isn’t working right now — ask your contact to send a fresh one.'

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

/**
 * WHAT A REFUSED RESPONSE SHOULD SAY TO A CLIENT.
 *
 * The response RPC answers with a short machine token rather than a sentence,
 * so the wording lives here — one place, in front of one audience. Every line
 * below follows the same three rules the rest of the client surface follows:
 *
 *   Say what is true, not what went wrong. "Your designer has sent a newer
 *   version" is the fact; "stale round" is the implementation.
 *
 *   Give them the next move. A dead end on someone else's page reads as the
 *   client's fault, which is why the generic fallback ends by naming one.
 *
 *   Never blame, never alarm. Nothing here is red, counted, or urgent — a
 *   client who taps twice has not done anything wrong.
 */
const RESPONSE_REASON_COPY = new Map([
  ['link_dead', 'This link has expired — ask your contact to send a fresh one.'],
  ['not_shown', 'That isn’t being shared with you any more.'],
  ['no_artifact', 'There’s nothing here to look at yet.'],
  ['no_open_round', 'There’s nothing waiting on you here right now.'],
  [
    'stale_round',
    'Your designer has sent a newer version — refresh the page to see it.',
  ],
  ['not_approvable', 'These are options to react to, not something to approve.'],
  ['unknown_direction', 'That option isn’t part of what you were sent.'],
  ['preference_not_allowed', 'You can’t pick an option on this one.'],
  ['too_many', 'That’s a lot of changes at once — give it a minute and try again.'],
])

/* Shape problems (`bad_status`, `bad_step`, `bad_unit`, `bad_target`) are not
   listed. A client cannot cause one through the page, so reaching one means
   something is wrong on our side, and the honest answer is the generic
   recovery line rather than a sentence implying they mistyped something. */
export function reasonToClientCopy(reason) {
  return RESPONSE_REASON_COPY.get(String(reason || '').trim()) || GENERIC
}
