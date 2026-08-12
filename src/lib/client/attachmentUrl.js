/**
 * The one rule for trusting a client-supplied brief attachment.
 *
 * WHY THIS EXISTS (security audit 2026-08-12, P2-1). The portal and discovery
 * submit RPCs used to store the answers JSON verbatim behind nothing but a
 * 200KB size check, and `${fieldId}Files` entries are `{ name, url }` pairs
 * the *client* composes. The studio then rendered those URLs as
 * `<img src>` inside `<a href>`, and `inspirationLinksFiles` auto-pinned onto
 * the Research wall — from where they reach the brand pack, the delivered
 * pack and the PDF. Nothing anywhere required the URL to be an object in the
 * `client-uploads` bucket, let alone one belonging to this portal.
 *
 * TWO MECHANISMS, AND THEY DO DIFFERENT JOBS. Neither is decoration:
 *
 *   1. THE DATABASE decides what gets STORED. `sanitize_client_attachments()`
 *      (migration 20260812120000) drops any entry whose URL does not resolve
 *      to a real row in `storage.objects` under this target's folder, and
 *      stamps the verified object name onto the entry as `path`. That is the
 *      authoritative check: bucket, folder and existence, proven against
 *      storage itself rather than pattern-matched. It is what stops one
 *      project's portal referencing another project's object.
 *
 *   2. THIS MODULE decides what may be DEREFERENCED. The database cannot know
 *      its own public hostname, so it cannot tell
 *      `https://<real>.supabase.co/storage/v1/object/public/client-uploads/<f>/x.png`
 *      from `https://evil.test/storage/v1/object/public/client-uploads/<f>/x.png`
 *      — the object name is identical in both. Closing that means never
 *      dereferencing the stored URL at all: what leaves here is an object KEY,
 *      never a URL, and `attachmentAccess.js` signs that key against the
 *      bucket. The attacker-controlled string is never fetched.
 *
 * So `url` survives in the row, but only as an opaque identity key — dedupe,
 * React keys, and the Asset Library's `linkBriefAttachmentToAsset` all match
 * on it. It must never again be handed to the browser as a URL. Use
 * `attachmentAccess.js` for that, always.
 *
 * LEGACY ROWS. Attachments submitted before the migration have no `path`.
 * They are not dropped — a client's reference photo vanishing from a live
 * project is a worse failure than the one being defended against — but they
 * are only rendered if they still pass the structural check below (our own
 * Supabase origin, the right bucket, and, where the caller knows it, the
 * right folder). Anything else is treated as an untrusted external link and
 * never becomes an `<img>`.
 */
export const CLIENT_UPLOAD_BUCKET = 'client-uploads'

/** The one path shape Supabase serves a public object from. */
const PUBLIC_MARKER = `/storage/v1/object/public/${CLIENT_UPLOAD_BUCKET}/`

/** A share/portal id is the folder name, and it is always a v4-shaped UUID. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Origin of the Supabase project this build talks to, or '' when the app is
 * running without cloud configured. An empty origin fails every check below,
 * which is the correct direction to fail: with no configured project there is
 * no such thing as a trusted upload URL.
 *
 * Read from the environment rather than through `lib/supabase.js` on purpose:
 * this module is pure string work and is imported by screens that have no
 * business pulling the Supabase SDK into their bundle to answer it. The one
 * module that does need the client — `attachmentAccess.js`, which signs — imports
 * it there instead.
 */
function supabaseOrigin() {
  try {
    const raw = String(import.meta.env?.VITE_SUPABASE_URL || '').trim()
    return raw ? new URL(raw).origin : ''
  } catch {
    return ''
  }
}

/**
 * Reject a stored object name that could escape its folder.
 *
 * Storage keys are opaque strings rather than filesystem paths, so `..` is not
 * traversal there — but these names are split on '/' to read the folder, and a
 * name carrying an empty or dot segment makes that read say something other
 * than where the bytes are. Refuse the ambiguity instead of reasoning about it.
 */
function sameSegmentsAreSane(name) {
  const parts = name.split('/')
  if (parts.length < 2) return false
  return parts.every((p) => p !== '' && p !== '.' && p !== '..')
}

/**
 * The storage object name a client-uploads public URL refers to, or null.
 *
 * Null means "not one of ours": wrong origin, wrong bucket, wrong path shape,
 * or a name that does not read cleanly as `<folder>/<file>`. Query strings and
 * fragments are discarded — Supabase ignores them on a public object, so
 * keeping them would let two spellings of one object disagree.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function clientUploadObjectName(url) {
  const origin = supabaseOrigin()
  if (!origin) return null

  /* Prefix match on the RAW string, deliberately, rather than parsing with
     `new URL` and reading `.pathname`.

     `new URL` normalises the path — it resolves `..` — so
     `.../client-uploads/<portal>/../<other>/x.png` arrives already rewritten
     to `.../client-uploads/<other>/x.png`, silently changing which folder the
     key claims to be in. Postgres does no such thing, so the app and
     `sanitize_client_attachments()` would be reading two different keys out of
     one string. They have to agree, so this reads the string the way SQL does.

     Matching `origin + marker` also settles the host questions a parser would
     otherwise invite: a userinfo trick (`https://<us>@evil.test/...`) does not
     start with this prefix because `@evil.test` sits where `/storage` must be,
     and a suffix host (`<us>.attacker.test`) fails for the same reason. */
  const raw = String(url || '')
  const prefix = `${origin}${PUBLIC_MARKER}`
  if (!raw.startsWith(prefix)) return null

  /* Supabase ignores query and fragment on a public object, so two spellings
     of one object must not be able to disagree about which object they are. */
  const name = raw.slice(prefix.length).split('?')[0].split('#')[0]

  /* Not percent-decoded, matching the SQL exactly. `storage.objects.name` is
     compared against this string as-is; decoding here would invent a second
     spelling for a key and the two checks would stop agreeing. */
  if (!name || !sameSegmentsAreSane(name)) return null
  return name
}

/** The folder (share or portal id) an object name sits in, or null. */
export function clientUploadFolder(name) {
  const folder = String(name || '').split('/')[0] || ''
  return UUID.test(folder) ? folder : null
}

/**
 * Is this attachment entry one this app may dereference?
 *
 * @param {{ path?: string, url?: string }} file
 * @param {string} [targetId] the share/portal id the entry must belong to.
 *   Omit only where the caller genuinely cannot know it — the Define sheet
 *   renders answers long after they were merged into the project, and the
 *   originating link id is not carried on the field. Folder-to-target binding
 *   is enforced at submit time by the database for every row written since
 *   migration 20260812120000; omitting it here weakens the legacy fallback
 *   only, never the stored guarantee.
 */
export function isTrustedClientAttachment(file, targetId) {
  return attachmentObjectName(file, targetId) !== null
}

/**
 * The verified object name for an entry, or null if it is not trustworthy.
 *
 * `path` wins whenever it is present: it was written by the database after
 * checking storage, so it is the only field here with a proof behind it.
 */
export function attachmentObjectName(file, targetId) {
  if (!file || typeof file !== 'object') return null

  const stamped = String(file.path || '').trim()
  const name = stamped && sameSegmentsAreSane(stamped)
    ? stamped
    : clientUploadObjectName(file.url)
  if (!name) return null

  const folder = clientUploadFolder(name)
  if (!folder) return null
  if (targetId && folder !== String(targetId)) return null
  return name
}

/**
 * Every attachment entry in an answers document, flattened.
 *
 * Exists so a screen can resolve all of its attachment URLs in ONE hook.
 * `${id}Files` arrays are scattered across the document and the Rules of Hooks
 * forbid calling a hook per array, so the flattening has to happen first.
 */
export function allAttachments(doc) {
  if (!doc || typeof doc !== 'object') return []
  const out = []
  for (const [key, value] of Object.entries(doc)) {
    if (!key.endsWith('Files') || !Array.isArray(value)) continue
    for (const file of value) {
      if (file && typeof file === 'object') out.push(file)
    }
  }
  return out
}

/* THERE IS DELIBERATELY NO `attachmentSrc()` HERE ANY MORE.
 *
 * It built `${origin}/storage/v1/object/public/client-uploads/${key}`, which
 * is a URL that no longer resolves: migration 20260812123000 made the bucket
 * private, on the owner's decision that attachment confidentiality must
 * survive revocation. A public object URL is precisely the thing that
 * decision removes — it is served without consulting RLS, so it cannot be
 * withdrawn once issued.
 *
 * Reads now go through `attachmentAccess.js`, which mints a short-lived signed
 * URL and is gated by the `client-uploads owner read` policy. That is
 * authenticated-only by design. Anonymous screens (/f/, /c/) do not read this
 * bucket at all and must preview from the file the client chose — see
 * BriefAttach.
 *
 * If you are here to add a public-URL helper back: the bucket is private, so
 * it would return a 404 in every case except one where it has reintroduced
 * the hole. */

/**
 * A stable identity for an entry — for React keys, dedupe and removal.
 *
 * Deliberately NOT the render URL: identity has to survive an entry being
 * untrustworthy, otherwise a rejected attachment cannot be listed or removed.
 */
export function attachmentKey(file) {
  if (!file || typeof file !== 'object') return ''
  return String(file.path || file.url || file.name || '')
}

/**
 * Keep only the entries a caller may safely act on.
 *
 * Used before anything that copies an attachment somewhere more permanent than
 * a thumbnail — the Research wall, the brand pack, an export.
 */
export function trustedAttachments(files, targetId) {
  if (!Array.isArray(files)) return []
  return files.filter((f) => isTrustedClientAttachment(f, targetId))
}
