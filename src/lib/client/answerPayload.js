/**
 * Size guard for client-submitted answer payloads.
 *
 * The three submit RPCs each refuse a payload over 200 KB, and they signal it
 * the same way they signal "this link was already used": by returning false.
 * Every wrapper collapsed that into "This form was already submitted", so a
 * client whose answers plus attachment metadata crossed the cap was told they
 * had already sent it. On a single-use link that is the worst possible wrong
 * message — they believe they are finished, they stop, and the submission is
 * lost with no retry offered and nothing on the studio side to notice.
 *
 * Checking here, before the round trip, fixes it from the other end: an
 * oversize payload never reaches the RPC, so a `false` coming back really does
 * mean already-submitted and the existing message becomes true rather than
 * merely less wrong. It also fails without burning the link, and it can say
 * the one useful thing — remove an image — which the server's boolean never
 * could.
 */

/** Server-side ceiling, mirrored from the RPCs' pg_column_size check. */
export const ANSWERS_MAX_BYTES = 200_000

/**
 * The limit actually enforced here, deliberately below the server's.
 *
 * pg_column_size measures the stored jsonb, which is not byte-identical to
 * what JSON.stringify produces — key order, whitespace and jsonb's own
 * encoding all differ. Guessing high would put us back to the exact failure
 * this exists to prevent, so the margin is spent on the safe side: a payload
 * we accept is one the server will too.
 */
export const ANSWERS_SAFE_BYTES = 180_000

/**
 * Byte length of a payload as JSON, or null when it cannot be measured.
 * @param {unknown} answers
 * @returns {number|null}
 */
export function answersByteSize(answers) {
  try {
    const json = JSON.stringify(answers ?? {})
    if (typeof json !== 'string') return null
    return new TextEncoder().encode(json).length
  } catch {
    // Circular or otherwise unserialisable — the submit itself will fail and
    // report honestly. Don't block on a measurement we could not take.
    return null
  }
}

/**
 * @param {unknown} answers
 * @returns {boolean} true when this is too big to send
 */
export function answersTooLarge(answers) {
  const bytes = answersByteSize(answers)
  return bytes !== null && bytes > ANSWERS_SAFE_BYTES
}

/**
 * The one thing a client can act on. Attachments are what push a payload over
 * — text answers do not get near 180 KB — so the message names them rather
 * than reporting a number, which would mean nothing to the person reading it.
 */
export const ANSWERS_TOO_LARGE_MESSAGE =
  'That’s too much to send at once. Remove an image and try again.'
