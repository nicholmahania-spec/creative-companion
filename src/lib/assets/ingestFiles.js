/**
 * Files a designer dropped, turned into stored assets.
 *
 * THE DEFECT THIS CLOSES. The drop plane accepted a drag, cleared its
 * highlight, and discarded the files. Nothing was written, nothing was said.
 * For this audience that is the worst shape a bug can take: the file left
 * their hands, the app gave no trace either way, and the working memory that
 * would have asked "wait, did that land?" is exactly the resource the product
 * exists to spare. A designer forms the belief the file is filed and builds on
 * it for days.
 *
 * So the contract here is that every file dropped produces a RESULT — stored
 * or refused, named either way. There is no path through this function where a
 * file is silently dropped.
 *
 * WHERE THE BYTES GO, and why not the obvious place. Not the Zustand store:
 * `prefs`, `projects` and now `assets` are serialised into ONE localStorage
 * blob, so a 50 MB deliverable there would fail the write that carries every
 * project, decision and approval — the same trap the studio logo's size cap
 * exists to avoid. Bytes go to IndexedDB via `assetBytes.js`, which holds them
 * without difficulty and keeps the library readable offline. Only metadata —
 * name, category, size, type — reaches the store.
 *
 * That makes this a LOCAL working copy, and `assetBytes.js` is blunt about the
 * limit in its own header: eviction is discretionary and a browsing-data clear
 * takes it regardless, so "a designer's only copy of a deliverable must not
 * live here". Pushing to the private bucket is the next step; until it exists
 * the copy on their own disk is still the real one, and the UI says so rather
 * than implying this is a backup.
 */

import {
  ALLOWED_MIME_TYPES,
  MAX_ASSET_BYTES,
  normaliseIngest,
} from './assetLibrary.js'
import { openAssetCache, putAssetBytes } from './assetBytes.js'

/** Bytes are keyed by asset id alone until an owner id exists to scope them. */
export const localByteKey = (assetId) => `local/${assetId}`

/**
 * A file the browser could not type. Common for `.ai` and `.eps`, and for
 * anything dragged out of an archive.
 */
const UNTYPED = 'application/octet-stream'

/**
 * @param {File} file
 * @returns {string} a stable id. Not a hash of the bytes — reading a 50 MB
 *   file twice to name it is a real cost for no gain, and a designer who drops
 *   the same file twice on purpose (a corrected v2 with the same name) must
 *   get two rows, not one silently swallowed.
 */
function assetId(file, index, now) {
  const stamp = Number(now) || 0
  const safe = String(file?.name || 'file').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 40)
  return `a-${stamp}-${index}-${safe}`.toLowerCase()
}

/**
 * Turn dropped files into asset rows, writing bytes as it goes.
 *
 * Deliberately does NOT touch the store. The caller commits the accepted rows
 * in one `addAssets` call, so a partial failure part-way through a multi-file
 * drop cannot leave the shelf half-populated mid-render.
 *
 * @param {File[]} files
 * @param {object} opts
 * @param {string} opts.projectId  the project the assets land in
 * @param {number} opts.now        injected clock, so ids are testable
 * @param {object} opts.db         an open IndexedDB handle; opened if absent
 * @returns {Promise<{accepted: object[], refused: {name: string, reason: string}[]}>}
 */
export async function ingestFiles(files, { projectId, now = Date.now(), db } = {}) {
  const list = Array.from(files || []).filter(Boolean)
  const accepted = []
  const refused = []

  if (!list.length) return { accepted, refused }

  if (!projectId) {
    /* Named rather than swallowed. Dropping onto a library with no project
       open is an ordinary mistake, and the fix is one click away — but only
       if the designer is told which click. */
    return {
      accepted,
      refused: list.map((f) => ({
        name: f.name || 'file',
        reason: 'Open a project first — assets file into a project.',
      })),
    }
  }

  let cache = db
  if (!cache) {
    try {
      cache = await openAssetCache()
    } catch {
      cache = null
    }
  }

  for (let i = 0; i < list.length; i += 1) {
    const file = list[i]
    const name = String(file.name || 'file')
    const type = String(file.type || '').toLowerCase()

    /* Checked here rather than left to normaliseIngest so the message names
       the file. In a five-file drop, "that file is too big" without a name is
       a puzzle the designer has to solve by elimination. */
    if (file.size > MAX_ASSET_BYTES) {
      refused.push({
        name,
        reason: `Over the ${Math.round(MAX_ASSET_BYTES / 1048576)} MB limit.`,
      })
      continue
    }

    /* An untyped file is not refused on that basis alone — the browser failing
       to guess is not the designer's error, and `normaliseIngest` treats an
       absent type as acceptable. Only a type we know we cannot render is
       turned away, and the message says what to send instead. */
    if (type && type !== UNTYPED && !ALLOWED_MIME_TYPES.includes(type)) {
      refused.push({
        name,
        reason: `${type} can’t be shown in a browser. A PDF, SVG or PNG will.`,
      })
      continue
    }

    const id = assetId(file, i, now)
    const result = normaliseIngest({
      name,
      projectId,
      mimeType: type === UNTYPED ? '' : type,
      byteSize: file.size,
      sourceApp: 'upload',
    })

    if (!result.ok) {
      refused.push({ name, reason: result.errors[0] || 'Could not be filed.' })
      continue
    }

    /* Bytes first, row second. The other order can produce a card for a file
       whose bytes never landed — a name with a blank thumbnail, which reads
       exactly like a corrupted deliverable and is the state assetBytes.js was
       written to keep out of the shelf. */
    let storedLocally = false
    if (cache) {
      try {
        await putAssetBytes(cache, localByteKey(id), file)
        storedLocally = true
      } catch {
        storedLocally = false
      }
    }

    if (!storedLocally) {
      refused.push({
        name,
        reason: 'This browser wouldn’t store the file. Nothing was saved.',
      })
      continue
    }

    accepted.push({
      ...result.asset,
      id,
      /* No `storage_path` yet: nothing has been uploaded. Leaving it null is
         what makes `assetByteState` report this as a local-only file rather
         than claiming a remote copy that does not exist. */
      storage_path: null,
      local_key: localByteKey(id),
      created_at: new Date(now).toISOString(),
    })
  }

  return { accepted, refused }
}

/**
 * One sentence for what just happened, for the toast.
 *
 * Plain counts, no exclamation, no "success". Refusals are stated as facts
 * about files, never as something the designer did wrong — dropping the print
 * version of a logo, or an .ai, is the normal thing to do.
 */
export function ingestSummary({ accepted = [], refused = [] } = {}) {
  const a = accepted.length
  const r = refused.length
  if (!a && !r) return ''
  if (a && !r) return a === 1 ? 'Filed 1 file' : `Filed ${a} files`
  if (!a && r === 1) return refused[0].reason
  if (!a) return `${r} files couldn’t be filed`
  return `Filed ${a}, ${r} couldn’t be filed`
}
