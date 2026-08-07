/**
 * The delivery moment — handing the brand over as an event, not a status flip.
 *
 * Three states, and only the last one exists on the server:
 *
 *   draft     nothing sent; the designer is still working
 *   preview   the designer is looking at exactly what the client will see.
 *             LOCAL ONLY. A preview that had to be written to the server to be
 *             looked at is a publish you cannot take back, which is the one
 *             thing this state exists to prevent.
 *   delivered written to the portal; the client's reveal link is live
 *
 * Delivered is reversible (`unpublishDelivery`) for as long as the designer
 * wants it to be — same rule as everywhere else in this app: an undo, not a
 * confirmation dialog.
 *
 * Server side: columns on `client_portals` plus three SECURITY DEFINER RPCs,
 * so the anon client never touches the table (mirrors clientPortal.js).
 */
import { supabase, isSupabaseConfigured } from '../supabase'
import { publicUrl } from '../appPaths'
import { CLOUD_REQUIRED } from './cloudRequired.js'

/** Client-facing URL for a delivered brand book. */
export function brandRevealUrl(portalId) {
  return publicUrl('d', portalId)
}

/**
 * Fields on a brand pack that the delivered book does not print, and that the
 * client has no business receiving.
 *
 * Not a guess — `deliveryPackPrivacy.test.js` checks that nothing under
 * `src/lib/book/` reads any of them, so stripping them cannot change a single
 * page of the book the designer previewed. If a future page starts printing
 * one of these, that test fails and this list has to be argued about rather
 * than silently drifting.
 *
 * The cost of getting this wrong is not abstract: `openTasks` is the
 * designer's own to-do list, and `feedbackLog` / `revisionRounds` are the
 * record of how many times the client changed their mind.
 */
export const PRIVATE_PACK_FIELDS = [
  'openTasks',
  'doneCount',
  'totalCount',
  'progressPercent',
  'revisionRounds',
  'feedbackLog',
  'decisionLog',
  'discoveryAnswers',
  'scopeRevisionsIncluded',
  'scopeApprover',
  'scopeOutOf',
  'deadline',
]

/** Bytes. Past this the row is silly to store and slow to open on a phone. */
export const DELIVERY_PACK_LIMIT = 3_000_000

const bytes = (value) => {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length
  } catch {
    /* circular or otherwise unserialisable — treat as over the line */
    return Number.POSITIVE_INFINITY
  }
}

/**
 * Turn a brand pack snapshot into the payload the client receives.
 *
 * Strips the designer's private working data, then — only if the result is
 * still too big to be sensible — drops the board pins, which are the heaviest
 * thing in a pack by an order of magnitude (each carries an image data URL).
 *
 * Returns what was dropped so the caller can SAY so. Silence here would mean a
 * designer previews a book with a moodboard page and delivers one without,
 * with nothing on screen to explain the difference.
 *
 * @param {object} pack  from buildBrandPackSnapshot
 * @returns {{ pack: object|null, dropped: string[], tooLarge: boolean }}
 */
export function buildDeliveryPack(pack) {
  if (!pack || typeof pack !== 'object') {
    return { pack: null, dropped: [], tooLarge: false }
  }
  const out = { ...pack }
  for (const key of PRIVATE_PACK_FIELDS) delete out[key]

  const dropped = []
  if (bytes(out) > DELIVERY_PACK_LIMIT && (out.pins || []).length) {
    out.pins = []
    dropped.push('the moodboard images')
  }
  if (bytes(out) > DELIVERY_PACK_LIMIT && out.logoImage) {
    out.logoImage = ''
    dropped.push('the logo artwork')
  }
  return { pack: out, dropped, tooLarge: bytes(out) > DELIVERY_PACK_LIMIT }
}

/**
 * A first draft of the covering note, for the designer to edit or delete.
 *
 * Pre-filled rather than blank on purpose: a blank box at the end of a project
 * is one more thing to compose at the exact moment the work is finished and
 * the tank is empty, and an empty note is the likeliest outcome. This is a
 * starting sentence, not a template to be filled in — it reads as finished so
 * that sending it as-is is a real option.
 */
export function defaultDeliveryNote({ clientName = '', projectName = '' } = {}) {
  const who = String(clientName || '').trim()
  const what = String(projectName || '').trim()
  const opening = who ? `Hi ${who},` : 'Hi,'
  const subject = what ? `the ${what} brand` : 'your brand'
  return `${opening}

Here's ${subject} — everything we worked out together, in one place. Have a look through, and tell me what you think.`
}

/**
 * Which state a portal row is in. `previewing` is the studio's local flag; the
 * row itself only ever knows delivered or not.
 *
 * The local flag WINS, including over a delivered row. It is only ever set by
 * the designer explicitly asking to look at the thing — which is also how you
 * re-send after an edit — so having `delivered` outrank it made "Send it
 * again" a button that changed nothing on screen. Backing out of the preview
 * clears the flag and the delivered view returns.
 */
export function deliveryStage(portal, previewing = false) {
  if (previewing) return 'preview'
  return portal?.delivery_status === 'delivered' ? 'delivered' : 'draft'
}

/** Has the client opened the reveal page? */
export function deliveryOpened(portal) {
  return !!portal?.delivery_viewed_at
}

/**
 * One line about where the delivery stands, for the studio.
 *
 * Neutral by rule (`nonPunitiveState.test.js` territory): a client who has not
 * opened it yet is not late, and this line must never imply they are. No
 * counts of days, no "still", no colour that reads as a warning.
 */
export function deliveryStatusLine(portal) {
  if (portal?.delivery_status !== 'delivered') return 'Not sent yet'
  if (portal?.delivery_reaction) return 'They wrote back'
  if (portal?.delivery_viewed_at) return 'They opened it'
  return 'Sent — waiting for them to open it'
}

// ── Studio side (owner RLS, direct table writes) ──

/**
 * Publish the delivery. This is the moment the client's link goes live.
 *
 * Page setup and the watermark preference travel WITH the pack, because the
 * reveal page renders the book by generating the real PDF — the same
 * construction the studio preview uses. Leave them behind and the client's
 * copy quietly comes out on a different page size to the one the designer
 * chose and checked.
 *
 * @param {string} portalId
 * @param {{ note?: string, pack?: object, book?: object }} payload
 */
export async function publishDelivery(
  portalId,
  { note = '', pack = null, book = null } = {}
) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const built = buildDeliveryPack(pack)
  if (built.tooLarge) {
    return {
      ok: false,
      error: 'This book is too big to send as a link — download the PDF and send that instead',
    }
  }
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('client_portals')
    .update({
      delivery_status: 'delivered',
      delivery_note: note || null,
      delivery_pack: {
        v: 1,
        pack: built.pack,
        book: book || null,
      },
      delivered_at: now,
      updated_at: now,
    })
    .eq('id', portalId)
  if (error) {
    // Log the driver's message, show the human one — this string is rendered
    // to the designer at the end of a project, not to a console reader.
    console.warn('Couldn’t send the delivery', error)
    return { ok: false, error: 'Couldn’t send it — try again in a moment' }
  }
  return { ok: true, dropped: built.dropped }
}

/**
 * Take a delivery back down.
 *
 * Deliberately leaves `delivery_viewed_at` and `delivery_reaction` alone: they
 * record things that genuinely happened, and a re-send should not be able to
 * rewrite the history of the first one. Re-publishing stamps a new
 * `delivered_at` over the old one, which is the one field that describes the
 * current delivery rather than a past event.
 */
export async function unpublishDelivery(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { error } = await supabase
    .from('client_portals')
    .update({
      delivery_status: 'not_delivered',
      updated_at: new Date().toISOString(),
    })
    .eq('id', portalId)
  if (error) {
    console.warn('Couldn’t take the delivery back', error)
    return { ok: false, error: 'Couldn’t take it back — try again in a moment' }
  }
  return { ok: true }
}

// ── Client side (anon, all via SECURITY DEFINER RPCs) ──

/** The reveal payload. Empty until the designer has actually sent it. */
export async function fetchBrandDelivery(portalId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { data, error } = await supabase.rpc('get_brand_delivery', {
    portal_id: portalId,
  })
  if (error) {
    // Log the driver's message, show the human one — this string is rendered
    // to clients on the public routes.
    console.warn('Couldn’t load the brand book', error)
    return { ok: false, error: 'Couldn’t load the brand book' }
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { ok: false, error: 'This link isn’t ready yet' }
  const envelope = readDeliveryEnvelope(row.delivery_pack)
  return {
    ok: true,
    clientName: row.client_name || '',
    note: row.delivery_note || '',
    ...envelope,
    deliveredAt: row.delivered_at || '',
    reaction: row.delivery_reaction || '',
  }
}

/**
 * Unwrap what publishDelivery stored.
 *
 * Tolerates a bare pack as well as the envelope: a row written by a build
 * before the envelope existed would otherwise render an empty book on a page
 * whose whole job is to look finished.
 */
export function readDeliveryEnvelope(stored) {
  if (!stored || typeof stored !== 'object') {
    return { pack: null, book: null }
  }
  if (stored.pack && typeof stored.pack === 'object') {
    return {
      pack: stored.pack,
      book: stored.book || null,
    }
  }
  return { pack: stored, book: null }
}

/**
 * Tell the studio the client opened it. First view only, server-side.
 * Failures are swallowed by the caller — a client must never see an error
 * about a thing they did not ask to do.
 */
export async function markBrandDeliveryViewed(portalId) {
  if (!isSupabaseConfigured() || !supabase) return { ok: false }
  const { error } = await supabase.rpc('mark_brand_delivery_viewed', {
    portal_id_in: portalId,
  })
  if (error) {
    console.warn('Couldn’t record the view', error)
    return { ok: false }
  }
  return { ok: true }
}

/** The client's reaction. Single-use, like the form and the survey. */
export async function submitBrandDeliveryReaction(portalId, body) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  const { data, error } = await supabase.rpc('submit_brand_delivery_reaction', {
    portal_id_in: portalId,
    body_in: body,
  })
  if (error) {
    // Log the driver's message, show the human one — this string is rendered
    // to clients on the public routes.
    console.warn('Couldn’t send that', error)
    return { ok: false, error: 'Couldn’t send that' }
  }
  if (!data) return { ok: false, error: 'You’ve already sent this one' }
  return { ok: true }
}
