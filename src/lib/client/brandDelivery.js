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
import { frozenAppAssetsFrom } from '../book/bookAssets'
import { decisionLineFromPack } from '../brandSystem'
import { CLOUD_REQUIRED } from './cloudRequired.js'

/** Client-facing URL for a delivered brand book. */
export function brandRevealUrl(portalId) {
  return publicUrl('d', portalId)
}

/**
 * THE CLIENT DELIVERY ALLOW-LIST — the only fields that cross into a client's
 * copy of the brand book.
 *
 * WHY THIS IS AN ALLOW-LIST AND NOT A DENY-LIST. Until this pass the rule was
 * "send everything on the pack except these fourteen", which means every field
 * added to `buildBrandPackSnapshot` for a designer-side reader became
 * client-visible the moment it was added, and stayed that way until somebody
 * noticed. Two did: `packageAssets` carried the designer's uploads — including
 * the ones `packagePlan` refuses to ship on usage rights — and `feedbackNotes`
 * carried the designer's private critique of their own work. Neither was
 * rendered by anything. Both were in the payload for months.
 *
 * That is not a list that was maintained badly. It is a list whose default is
 * wrong: a deny-list fails open, and the failure is silent on both sides of the
 * transaction. The default here is now the other way round — a field nobody has
 * thought about does not travel, and the test that proves it invents a field
 * this module has never heard of and checks it does not appear.
 *
 * HOW A FIELD EARNS ITS PLACE. Only two categories qualify:
 *
 *   A  the client-facing book actually prints it
 *   B  the delivery itself needs it to behave correctly
 *
 * Not qualifying, however harmless it looks: designer working material,
 * package/production truth, and residue nothing reads. "It is already crossing
 * the boundary" is not a reason — that was true of both defects above.
 *
 * The membership test is empirical, not editorial. `deliveryContract.test.js`
 * renders the real book from the full snapshot and from the delivered pack and
 * asserts the two documents are identical, so a field the book needs cannot be
 * left out of this list without a test naming it, and a field the book does not
 * need gains nothing by being added.
 */
export const CLIENT_DELIVERY_FIELDS = [
  // ── Whose brand this is, and who made it ────────────────────────────────
  'projectName',
  /* The studio credit printed in the book's footer — the designer's own name
     on their own work, which is the one piece of designer identity that is
     supposed to reach the client. */
  'studio',
  /* THE DATE ON THE COVER (B).

     Left off this list when it was written, because at that moment nothing in
     the client render path read it — the cover stamped `new Date()` and the
     field was residue. That stopped being true in `brandBookPdf.js`, which now
     reads `pack?.exportedAt || Date.now()` so a book dates itself from when it
     was exported rather than from whenever it happens to be opened.

     Strip it and the fallback fires: the designer proofs a book dated the day
     they finished it and the client opens one dated today — the same document
     disagreeing with itself about when it was made, which is exactly the
     preview-is-not-the-delivery failure the whole projection exists to prevent.

     Not private. It is a timestamp about the client's own book, and after that
     change it is printed ON the client's own book. */
  'exportedAt',

  // ── Page setup (B) ──────────────────────────────────────────────────────
  /* The reveal page renders the book by generating the real PDF, the same
     construction the studio preview uses. Leave these behind and the client's
     copy comes out on a different page size, grid and type scale to the one
     the designer chose and checked — `publishDelivery` has always said page
     setup must travel with the pack, and this is where that promise is kept. */
  'bookPageBg',
  'bookGrid',
  'bookRunning',
  'bookTypeColor',
  'bookTypeScale',

  // ── The brand system the book prints ────────────────────────────────────
  'palette',
  'colorRoles',
  'typeHeading',
  'typeBody',
  'typeWhy',
  'logoImage',
  'logoWordmark',
  'logoDirection',
  'logoClearspace',
  'logoMinSize',
  /* Read through `logoDontsList` in brandSystem.js rather than directly by any
     file under src/lib/book/ — which is exactly why the older privacy guard,
     which scans that one directory, could never have caught its absence. */
  'logoDonts',
  'pins',

  // ── The words the book prints ───────────────────────────────────────────
  'tagline',
  'positioning',
  'voice',
  'toneOfVoice',
  'story',
  'usp',
  'messagingPromise',
  'messagingProof',
  'messagingPersonality',
  'messagingPlan',
  'messagingCta',
  'writingCase',
  'writingCaps',
  'writingNotes',
  'doUse',
  'dontUse',
  'imageryStyle',
  'imageryDo',
  'imageryDont',
  'printPantone',
  'printStock',
  'printFinish',
  'technical',
  'accessibilityNeeds',
  /* The Handoff appendix. These two read like private notes and are not —
     the book prints them under "Handoff note" and "What we learned", which is
     copy written for the client to read. `feedbackNotes` is the one that sits
     beside them and IS private; it is on the other list. */
  'handoffNote',
  'learnings',

  // ── Where the brand lives ───────────────────────────────────────────────
  'brandSurfaces',
  'touchpointApps',

  // ── The client's own answers, which the book prints as the agreed brief ──
  'detective',

  // ── The back page ───────────────────────────────────────────────────────
  /* The brand's own contact details, not the studio's — the same values the
     stationery is set from. */
  'contacts',
  'orgEmail',
  'orgPhone',
  'orgWebsite',

  // ── One derived line, resolved by the projection ────────────────────────
  /* See `buildDeliveryPack`. The book prints a decision line that
     `decisionLineFromPack` computes from `decisionLog` and `directions`, both
     of which are private. Resolving it here sends the sentence without the
     material behind it. */
  'decisionLine',
]

/**
 * Fields that must never reach a client — the REGRESSION RECORD, not the
 * mechanism.
 *
 * `CLIENT_DELIVERY_FIELDS` above is what actually decides the payload now, and
 * because it is an allow-list every one of these is already excluded by not
 * being on it. This list survives for two jobs the allow-list cannot do:
 *
 *   1. It names the ones that were genuinely leaking — `packageAssets` and
 *      `feedbackNotes` — so the defect cannot quietly return by someone adding
 *      a plausible-looking name to the allow-list. A test asserts the two lists
 *      never intersect.
 *   2. `deliveryPackPrivacy.test.js` walks it to prove nothing under
 *      `src/lib/book/` reads any of them, which is what makes it safe to say
 *      the client's book is the same document the designer previewed.
 *
 * The cost of getting this wrong is not abstract: `openTasks` is the
 * designer's own to-do list, `feedbackLog` / `revisionRounds` are the record of
 * how many times the client changed their mind, and `packageAssets` is FILES —
 * including the uploads whose usage rights `packagePlan` refuses to ship.
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
  /* The designer's own critique of their own work — the Review stop's notes
     field, placeholdered "Change · why · keep". It sits next to `learnings`
     and `handoffNote` in the snapshot and reads like them, which is why it was
     missed: those two ARE client-facing and the book genuinely prints them in
     its Handoff appendix under client-facing labels. Nothing prints this one.
     It was carried to the client and displayed to no one. */
  'feedbackNotes',
  /* `packageAssets` USED TO BE ON THIS LIST, and the reason it left is the
     whole of Phase 9. The old note is kept below because its reasoning is still
     correct about the WHOLE list — what changed is that the client's book now
     shows the designer's produced artwork, so a filtered PROJECTION of that
     list has to cross the boundary while the list itself still must not.

     `buildDeliveryPack` now takes only the assets the book actually references
     AND that the package's own rights gate clears, through
     `frozenAppAssetsFrom`. Everything the note below objected to still holds:
     the shelf does not travel, and a `thirdParty` or unset-rights file is no
     more shippable in the book than it was in the zip.

     ── the original note, still true of the unfiltered list ──

     `buildBrandPackSnapshot` carries `packageAssets` so the PACKAGE PLANNER
     can read the designer's uploads off the pack — that is a local, designer-
     side concern and it is the right place for it. But the pack is also what
     `publishDelivery` writes into `client_portals.delivery_pack`, which
     `get_brand_delivery` serves to any holder of /d/<portalId>. So the array
     travelled, bytes and all, over the one boundary in this app that actually
     transmits anything to a client.

     `packagePlan` refuses to ship a file whose rights are `thirdParty`,
     `designerOwned`, `doNotDistribute` or unset — it holds each one back and
     prints the reason in the client's README. Every one of those files was in
     the delivery pack anyway. The app asserted rights on the designer's behalf
     on the path it does not send, and silently overrode itself on the path it
     does.

     Stripping it here costs the client nothing: no page of the book reads
     `packageAssets`, so the client's copy is the same document the designer
     previewed, and the legitimate files still reach the client the way they
     always did — through the zip the designer builds and hands over. */
]

/** Bytes. Past this the row is silly to store and slow to open on a phone. */
export const DELIVERY_PACK_LIMIT = 3_000_000

/* Named once. `buildDeliveryPack` reports these at send time and
   `deliveryGaps` derives the same facts from the delivered row afterwards; two
   spellings of "the moodboard images" would read as two different problems. */
const DROPPED_PINS = 'the moodboard images'
const DROPPED_LOGO = 'the logo artwork'
const DROPPED_APP_ART = 'the application artwork'

const bytes = (value) => {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length
  } catch {
    /* circular or otherwise unserialisable — treat as over the line */
    return Number.POSITIVE_INFINITY
  }
}

/**
 * PROJECT a brand pack snapshot onto the payload the client receives.
 *
 * Projection, not a filtered copy: it starts from nothing and takes only what
 * `CLIENT_DELIVERY_FIELDS` names. A field the snapshot grows tomorrow is absent
 * from the client's copy by default, and stays absent until somebody decides
 * otherwise in the one place that decision belongs.
 *
 * Then — only if the result is still too big to be sensible — it drops the
 * board pins, which are the heaviest thing left in a pack by an order of
 * magnitude (each carries an image data URL), and after that the logo artwork.
 *
 * Returns what was dropped so the caller can SAY so. Silence there would mean a
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
  const out = {}
  /* `in` rather than a truthiness check: `false` and `0` are real answers on
     this pack, and a projection that silently dropped them would change the
     book rather than merely shrink the payload. */
  for (const key of CLIENT_DELIVERY_FIELDS) {
    if (key in pack) out[key] = pack[key]
  }

  /* The one value the client's copy has to CARRY rather than compute.
     `decisionLineFromPack` prints a sentence derived from `decisionLog`, then
     from `directions` — the designer's decision history and their unchosen
     routes, neither of which is the client's. Resolving it here sends the
     sentence the designer previewed without any of the material behind it; the
     renderer reads `decisionLine` first, so it never reaches for the rest.
     Set only when there is one: an empty key would be a field with no answer. */
  const decision = decisionLineFromPack(pack)
  if (decision) out.decisionLine = decision

  /* THE PRODUCED ARTWORK THE BOOK SHOWS — and only that.
     Projected rather than copied: `frozenAppAssetsFrom` returns the assets the
     book REFERENCES that the package's rights gate CLEARS, so a shelf of forty
     files becomes the two the client's book actually prints. Re-filtered here
     rather than trusted from the caller, so even a live pack handed to this
     function cannot leak the rest. */
  const appAssets = frozenAppAssetsFrom(pack)
  if (appAssets.length) out.packageAssets = appAssets

  const dropped = []
  /* Shed the heaviest thing that is not the work itself first. The artwork is
     the point of the page it sits on, so it goes last and says so. */
  if (bytes(out) > DELIVERY_PACK_LIMIT && (out.pins || []).length) {
    out.pins = []
    dropped.push(DROPPED_PINS)
  }
  if (bytes(out) > DELIVERY_PACK_LIMIT && out.logoImage) {
    out.logoImage = ''
    dropped.push(DROPPED_LOGO)
  }
  /* Last, and never silently: an application page whose artwork was shed says
     so through the same gap mechanism the pins and the mark already use, and
     the page itself falls back to its held state rather than to a mock. */
  if (bytes(out) > DELIVERY_PACK_LIMIT && (out.packageAssets || []).length) {
    out.packageAssets = []
    dropped.push(DROPPED_APP_ART)
  }
  return { pack: out, dropped, tooLarge: bytes(out) > DELIVERY_PACK_LIMIT }
}

/**
 * What the client's copy is missing, read off the delivery itself.
 *
 * `buildDeliveryPack` returns `dropped` at the moment of sending, and the
 * screen used to hold it in component state — so the one sentence explaining
 * why the client's book differs from the preview survived exactly until the
 * next reload, on a screen a designer returns to for the rest of the project.
 *
 * It does not need storing. The delivered pack IS the record: it is on the row,
 * the studio view already fetches it, and a pack that reached the client with no
 * pins while the project has pins is the fact the sentence was reporting. So
 * this derives it instead — no new column, no second copy to keep in step, and
 * true after a reload, after a re-send, and on another machine.
 *
 * Deliberately compares against the DELIVERED pack rather than recomputing
 * `buildDeliveryPack` on today's project: the question is what the client
 * actually holds, not what a fresh send would leave out now.
 *
 * @param {object|null} portal  a client_portals row
 * @param {object|null} pack    the current local snapshot
 * @returns {string[]} phrases, in the order they were shed
 */
export function deliveryGaps(portal, pack) {
  if (portal?.delivery_status !== 'delivered') return []
  const { pack: sent } = readDeliveryEnvelope(portal?.delivery_pack)
  if (!sent) return []
  const out = []
  if ((pack?.pins || []).length && !(sent.pins || []).length) out.push(DROPPED_PINS)
  if (pack?.logoImage && !sent.logoImage) out.push(DROPPED_LOGO)
  return out
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
 * WHICH PROJECT'S BOOK, AND WHOSE LINK. Owner RLS already makes it impossible
 * to publish into another studio's portal. What it cannot see is a portal that
 * belongs to a different project of the SAME studio — and the inbox's reconnect
 * makes that reachable by hand, because it attaches whatever portal is selected
 * to whatever project is open. Pick the wrong project there and this would send
 * one client's brand book to another client's live link, silently.
 *
 * So the write is scoped to both ids at once. `project_local_id` is stamped at
 * creation and re-stamped by `rebindPortalToProject` on every reconnect, so a
 * legitimate rebind still publishes and a mismatch cannot. Both filters are in
 * the same statement rather than a read followed by a write: a check that
 * happens before the update is a check something can change underneath.
 *
 * @param {string} portalId
 * @param {{ note?: string, pack?: object, book?: object, projectLocalId?: string, identity?: object }} payload
 */
export async function publishDelivery(
  portalId,
  { note = '', pack = null, book = null, projectLocalId = '', identity = null, source = null } = {}
) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: CLOUD_REQUIRED }
  }
  /* Refused rather than published unguarded. An absent project id is a caller
     bug, and the permissive reading of it — publish anyway — is exactly the
     hole this parameter exists to close. */
  if (projectLocalId == null || projectLocalId === '') {
    return { ok: false, error: 'Couldn’t send it — no project is open' }
  }
  const built = buildDeliveryPack(pack)
  if (built.tooLarge) {
    return {
      ok: false,
      error: 'This book is too big to send as a link — download the PDF and send that instead',
    }
  }
  const now = new Date().toISOString()
  const envelope = {
    /* v:2 SAYS ONE THING: this delivery knows which Version it is.
       `readDeliveryEnvelope` still reads v:1 and the bare-pack form that
       predates envelopes, and always will — a client's link from last year has
       to keep opening. The version number is not a gate, it is a label for
       what the row happens to carry. */
    v: 2,
    pack: built.pack,
    book: book || null,
  }
  /* Additive. Old rows have no identity key. A new send may carry a
     published Identity snapshot; the pack remains the book projection. */
  if (identity && typeof identity === 'object' && identity.snapshotId) {
    envelope.identity = identity
  }
  /* WHICH FROZEN THING THIS IS, AS TWO IDS AND NOTHING ELSE.
     Projected key by key rather than spread, so a `source` object that grows a
     field upstream cannot carry it to a client by default — the same rule
     `CLIENT_DELIVERY_FIELDS` applies to the pack, for the same reason. Both
     are app-minted opaque ids (`dver_…`, `idsnap_…`); neither is a database
     key and neither is `project_local_id`, which stays a write-scope predicate
     and never travels. */
  if (source && typeof source === 'object') {
    const ids = {}
    if (source.documentVersionId) ids.documentVersionId = String(source.documentVersionId)
    if (source.identitySnapshotId) ids.identitySnapshotId = String(source.identitySnapshotId)
    if (Object.keys(ids).length) envelope.source = ids
  }
  const { data, error } = await supabase
    .from('client_portals')
    .update({
      delivery_status: 'delivered',
      delivery_note: note || null,
      delivery_pack: envelope,
      delivered_at: now,
      updated_at: now,
    })
    .eq('id', portalId)
    .eq('project_local_id', String(projectLocalId))
    .select('id')
  if (error) {
    // Log the driver's message, show the human one — this string is rendered
    // to the designer at the end of a project, not to a console reader.
    console.warn('Couldn’t send the delivery', error)
    return { ok: false, error: 'Couldn’t send it — try again in a moment' }
  }
  /* Nothing updated means the row exists but is bound to a different project —
     a portal reconnected before rebinding recorded it, or the wrong project is
     open. Says which thing to do about it rather than "try again", because
     trying again does nothing at all here. */
  if (!Array.isArray(data) || data.length === 0) {
    return {
      ok: false,
      error:
        'This client link belongs to a different project — open Client activity and link it to this one first',
    }
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
    const out = {
      pack: stored.pack,
      book: stored.book || null,
    }
    if (stored.identity && typeof stored.identity === 'object' && stored.identity.snapshotId) {
      out.identity = stored.identity
    }
    /* ABSENT ON EVERY v:1 ROW, AND THAT IS THE ANSWER, NOT A GAP.
       A delivery sent before Versions were recorded has no Version to name.
       Nothing here invents one, and nothing anywhere may go looking for the
       "matching" Version in today's project — that would be re-rendering an
       old delivery from current state, which is the exact thing the freeze
       exists to prevent. Absent source reads as: sent before we recorded it. */
    if (stored.source && typeof stored.source === 'object') {
      out.source = stored.source
    }
    return out
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
