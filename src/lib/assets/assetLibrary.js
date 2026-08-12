/**
 * The Asset Library, as logic.
 *
 * Everything here is pure: no store, no network, no browser. That is
 * deliberate and it is not stylistic — nothing in this repo's vitest suite
 * renders a view, so any judgement that lives inside a component is untested
 * by construction. Phase 5 found six views rendering nearly empty for exactly
 * that reason, with a clean build and a green suite. The rules about what an
 * asset IS live here, where they can be checked.
 *
 * The matching schema is 20260806120000_asset_library.sql. Where a limit
 * appears in both, this file is the fast, readable failure and the database is
 * the real one — never the other way round. A client-side check that a server
 * does not also enforce is decoration.
 */

/* ------------------------------------------------------------- categories --- */

/**
 * PRD §12 lists fourteen categories. The trimmed MVP (Expansion Spec §5)
 * ships four and explicitly defers the rest. These are the four, plus the
 * escape hatch.
 *
 * `other` is FIRST-CLASS, not a leftover. Forcing a category at the moment a
 * file arrives is the exact tax the frictionless-capture principle exists to
 * remove: the designer pushing a mark from Illustrator is mid-flow, and
 * making them answer a taxonomy question to complete the push is how the
 * bridge becomes something they route around. File it later, with bandwidth.
 */
export const ASSET_CATEGORIES = [
  { id: 'logo', label: 'Logo' },
  { id: 'color', label: 'Color' },
  { id: 'type', label: 'Type' },
  { id: 'application', label: 'Application' },
  { id: 'other', label: 'Unfiled' },
]

export const DEFAULT_CATEGORY = 'other'

const CATEGORY_IDS = new Set(ASSET_CATEGORIES.map((c) => c.id))

export function categoryLabel(id) {
  return ASSET_CATEGORIES.find((c) => c.id === id)?.label || 'Unfiled'
}

/* ------------------------------------------------------------ source apps --- */

/**
 * Where an asset came from. The column Phase 7 is named after.
 *
 * `upload` is a real provenance, not "unknown" — a file the designer dragged
 * in came from their own hands, which is different from one a plugin pushed
 * and is worth being able to tell apart later.
 *
 * `vector` marks whether the source can be trusted to carry true brand colour.
 * A push from Illustrator carries the actual fill values; a photographic
 * mockup carries whatever the lighting did to them. Phase 6's colour check
 * needs that distinction — flagging a mockup's shadowed logo as "doesn't match
 * your primary" is precisely the wolf-crying the phase warns is worse than no
 * checker at all.
 */
export const SOURCE_APPS = [
  { id: 'upload', label: 'Uploaded', vector: false },
  { id: 'brief', label: 'From the brief', vector: false },
  { id: 'illustrator', label: 'Illustrator', vector: true },
  { id: 'photoshop', label: 'Photoshop', vector: false },
  { id: 'indesign', label: 'InDesign', vector: true },
  { id: 'figma', label: 'Figma', vector: true },
]

export const DEFAULT_SOURCE_APP = 'upload'

/** What the file means to this project. Source files are never delivery inputs. */
export const ASSET_ROLES = ['source', 'produced']
export const DEFAULT_ASSET_ROLE = 'source'

/** Who supplied the file, distinct from the tool it came through. */
export const ASSET_ORIGINS = ['client', 'designer', 'imported']
export const DEFAULT_ASSET_ORIGIN = 'client'

export function assetRoleLabel(role) {
  return role === 'produced' ? 'Produced work' : 'Source material'
}

export function sourceAppLabel(id) {
  return SOURCE_APPS.find((a) => a.id === id)?.label || 'Uploaded'
}

/**
 * Can this asset's colours be read as the brand's actual colours?
 *
 * Returns false for anything unrecognised, and that default matters: an
 * unknown source is not a trusted one, and the cost of the two mistakes is
 * asymmetric. Trusting a mockup produces confident wrong findings on every
 * upload; distrusting a real vector push produces one missing finding.
 */
export function carriesTrueColour(asset) {
  const app = SOURCE_APPS.find((a) => a.id === asset?.source_app)
  if (!app?.vector) return false
  // A rasterised export from a vector tool is a raster. The tool of origin
  // tells you what the file COULD carry; the mime type tells you what it does.
  return asset?.mime_type === 'image/svg+xml' || asset?.mime_type === 'application/pdf'
}

/* --------------------------------------------------------------- storage --- */

/**
 * Mime → extension. Only the types the bucket accepts; anything else has
 * already been rejected before it reaches here.
 *
 * The extension is cosmetic — the object key's identity is the asset id, and
 * the content type is stored alongside it. It exists so a file downloaded
 * from Storage opens in something when the designer double-clicks it, which
 * is a real moment (recovering work from the bucket by hand) and is miserable
 * with extensionless files.
 */
const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
}

export const ALLOWED_MIME_TYPES = Object.keys(MIME_EXTENSIONS)

/** Bucket ceiling, mirroring the migration's file_size_limit. 50 MB. */
export const MAX_ASSET_BYTES = 52428800

export function extensionForMime(mime) {
  return MIME_EXTENSIONS[mime] || 'bin'
}

/**
 * Every segment of an object key must be a bare identifier.
 *
 * ASCII alphanumerics, underscore and hyphen only, and it must not open with a
 * separator-ish character. That is not a blocklist of dangerous inputs; it is
 * the complete description of what the three identity values actually are —
 * `auth.uid()` and the cloud project id are uuids, and an asset id is either a
 * uuid or the `a-<stamp>-<index>-<slug>` form `ingestFiles` mints. Nothing
 * legitimate is excluded, so anything excluded is illegitimate.
 *
 * Note what it forbids without naming any of them: `/` and `\` (not in the
 * class), `..` and `.` (a dot is not in the class at all, so a traversal
 * segment cannot even be spelled), a leading `/` for an absolute path, `%2e`
 * and every other percent-encoding (`%` is not in the class), empty segments,
 * whitespace, and every non-ASCII codepoint. A blocklist would have had to
 * anticipate each of those; an allowlist of the identifier shape gets them for
 * free and stays correct against the next encoding somebody thinks of.
 */
const KEY_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

/**
 * Object key for an asset's bytes.
 *
 * `${ownerId}/${projectId}/${assetId}.${ext}` — the owner MUST be the first
 * segment, because every storage policy on this bucket is
 * `(storage.foldername(name))[1] = auth.uid()`. Changing this shape silently
 * breaks read, write and delete at once, so it is built in one place.
 *
 * THE INVARIANT: identity determines the namespace. The owner, the project and
 * the asset id decide where bytes live, and nothing else contributes a single
 * character. In particular the ORIGINAL FILENAME never appears — the extension
 * comes from `extensionForMime`, a closed map, so a file called
 * `../../../etc/passwd.png` lands at `<owner>/<project>/<asset-id>.png` like
 * every other PNG.
 *
 * Segments are VALIDATED, not scrubbed. Rewriting a bad segment into a good
 * one invents a key nobody asked for: two different inputs can collapse onto
 * one object, which is how one asset silently overwrites another, and the
 * caller is never told that the thing it stored is not the thing it named.
 * Returning null instead fails closed — `assetStorage.save` already answers a
 * null key with "This file could not be filed" and writes nothing, which is
 * the correct outcome for an identity the app cannot account for.
 *
 * @returns {string|null} the object key, or null when any part is unusable.
 */
export function assetStorageKey({ ownerId, projectId, assetId, mimeType } = {}) {
  const segments = [ownerId, projectId, assetId]
  /* STRINGS, not stringifiable things. Coercing first would let `0`, `false`
     and `NaN` through — each stringifies to something that passes the pattern
     and produces a confident, well-formed key for an identity nobody holds.
     An object written under `NaN/…` is unreachable by the row that names it
     and unreadable through a policy that compares against auth.uid(), and the
     caller is told it was stored. A non-string here means the caller has a
     bug, and inventing a plausible key on its behalf is how that bug becomes
     a lost file instead of a refusal. */
  if (!segments.every((seg) => typeof seg === 'string' && KEY_SEGMENT.test(seg))) {
    return null
  }
  const [owner, project, asset] = segments
  return `${owner}/${project}/${asset}.${extensionForMime(mimeType)}`
}

/* ---------------------------------------------------------------- ingest --- */

/**
 * Limits mirrored from the migration's CHECK constraints, so a bad push fails
 * with a sentence instead of a Postgres error code.
 */
const NAME_MAX = 200
const SOURCE_REF_MAX = 500
const SLUG = /^[a-z0-9][a-z0-9_-]{0,39}$/

/**
 * Normalise an inbound asset push into a row shape, or say why not.
 *
 * This is the bridge's front door — the same function serves an Illustrator
 * push, a Figma push and a plain drag-and-drop, because they differ only in
 * what they can tell us. Anything a source cannot supply is defaulted rather
 * than rejected: a bridge that refuses a push because the plugin could not
 * determine pixel dimensions has failed at the one job that makes it better
 * than dragging a file.
 *
 * @param {object} payload raw, from a plugin or a file input
 * @returns {{ok: boolean, errors: string[], asset?: object}}
 */
export function normaliseIngest(payload = {}) {
  const errors = []

  const name = String(payload.name ?? '').trim()
  if (!name) errors.push('The asset needs a name.')
  else if (name.length > NAME_MAX) errors.push(`Name is longer than ${NAME_MAX} characters.`)

  const projectId = String(payload.projectId ?? payload.project_id ?? '').trim()
  if (!projectId) errors.push('The asset needs a project to land in.')

  const mimeType = String(payload.mimeType ?? payload.mime_type ?? '').trim()
  if (mimeType && !MIME_EXTENSIONS[mimeType]) {
    /* Named rather than generic. "Unsupported file type" sends the designer
       to guess; naming the type and listing what works lets them convert it
       and retry without a support round trip. .ai and .eps land here
       constantly — browsers cannot render either, so the bridge is expected
       to push a rendered PDF alongside the source. */
    errors.push(`${mimeType} can't be shown in a browser. Push a PDF, SVG or PNG instead.`)
  }

  const byteSize = numberOrNull(payload.byteSize ?? payload.byte_size)
  if (byteSize != null && byteSize > MAX_ASSET_BYTES) {
    errors.push(`That file is over the ${Math.round(MAX_ASSET_BYTES / 1048576)} MB limit.`)
  }

  const category = slugOr(payload.category, DEFAULT_CATEGORY)
  /* An unrecognised category is NOT an error. The column takes any slug on
     purpose (adding "packaging" must not need a migration), so a push naming
     a category this build has not heard of is a forward-compatible push, not
     a broken one — it files as unfiled and keeps the file. Dropping the
     designer's work over a vocabulary mismatch would be absurd. */
  const role = oneOf(payload.role, ASSET_ROLES, DEFAULT_ASSET_ROLE)
  const origin = oneOf(payload.origin, ASSET_ORIGINS, DEFAULT_ASSET_ORIGIN)
  const sourceApp = slugOr(payload.sourceApp ?? payload.source_app, DEFAULT_SOURCE_APP)

  let sourceRef = payload.sourceRef ?? payload.source_ref
  sourceRef = sourceRef == null ? null : String(sourceRef).trim() || null
  if (sourceRef && sourceRef.length > SOURCE_REF_MAX) {
    errors.push('The source reference is too long.')
  }

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    errors: [],
    asset: {
      name,
      project_id: projectId,
      category: CATEGORY_IDS.has(category) ? category : DEFAULT_CATEGORY,
      source_app: sourceApp,
      role,
      origin,
      source_ref: sourceRef,
      mime_type: mimeType || null,
      byte_size: byteSize,
      width: positiveOrNull(payload.width),
      height: positiveOrNull(payload.height),
      status: 'draft',
      approved_at: null,
      replaces_id: null,
    },
  }
}

function oneOf(value, allowed, fallback) {
  const candidate = String(value ?? '').trim().toLowerCase()
  return allowed.includes(candidate) ? candidate : fallback
}

function slugOr(value, fallback) {
  const slug = String(value ?? '').trim().toLowerCase()
  return SLUG.test(slug) ? slug : fallback
}

function numberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

function positiveOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

/* -------------------------------------------------------------- versions --- */

/**
 * The version this push should chain onto, if any.
 *
 * A bridge makes re-pushing nearly free, so the same artboard arrives over and
 * over. Matching on (source_app, source_ref) is what turns "card-v1 … card-v7
 * cluttering the library" into one asset with a history — but ONLY when the
 * source told us what it was. A push with no source_ref (every plain upload)
 * matches nothing and starts its own chain, because guessing by filename
 * would silently bury an unrelated file as an old version of something else.
 * A cluttered library is annoying; a hidden file is lost work.
 */
export function findVersionTarget(assets, { source_app: sourceApp, source_ref: sourceRef } = {}) {
  if (!sourceRef || !sourceApp) return null
  const matches = (assets || []).filter(
    (a) => a?.source_app === sourceApp && a?.source_ref === sourceRef
  )
  if (!matches.length) return null
  // Chain onto the HEAD, not the newest by date. They are usually the same
  // row, but two pushes racing on a flaky connection can land out of order,
  // and chaining onto a superseded version forks the history into two heads —
  // after which the library shows the same asset twice and neither is wrong.
  //
  // This is the first line of defence, NOT the only one, and it is the weaker
  // one: `assets_one_successor_idx` makes a fork impossible at the database
  // level. That ordering matters. Picking the head here is a best effort over
  // whatever this client happens to have loaded; the constraint is what turns
  // a genuine race into a 23505 the caller can catch and retry against the
  // new head. Do not read this function as sufficient on its own.
  const heads = currentAssets(matches)
  return heads[0] || null
}

/**
 * Heads of the version chains — what the library shows by default.
 *
 * Mirrors the `assets_current` SQL view, and mirrors it in METHOD as well as
 * result: a row is current when nothing replaces it. Neither side stores an
 * `is_current` flag, because a stored flag needs two writes to stay honest
 * and a library showing a stale version is indistinguishable from one showing
 * a current version.
 */
export function currentAssets(assets) {
  const replaced = new Set(
    (assets || []).map((a) => a?.replaces_id).filter(Boolean)
  )
  return (assets || []).filter((a) => a && !replaced.has(a.id))
}

/**
 * The full history of one asset, newest first.
 *
 * Walks `replaces_id` backwards. Guarded against a cycle by a seen-set even
 * though the schema makes cycles unreachable — an infinite loop here hangs
 * the designer's browser on their own asset panel, which is far too high a
 * price for trusting a constraint in a different system.
 */
export function versionChain(assets, assetId) {
  const byId = new Map((assets || []).filter(Boolean).map((a) => [a.id, a]))
  const chain = []
  const seen = new Set()
  let cursor = byId.get(assetId)
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    chain.push(cursor)
    cursor = cursor.replaces_id ? byId.get(cursor.replaces_id) : null
  }
  return chain
}

/** 1-based version number: how many versions deep this asset sits. */
export function versionNumber(assets, assetId) {
  return versionChain(assets, assetId).length
}
