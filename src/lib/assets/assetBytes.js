/**
 * Local bytes for the Asset Library.
 *
 * WHY THIS EXISTS, and it is a correction rather than an enhancement.
 *
 * The migration puts asset metadata in Postgres and asset bytes in a private
 * Supabase bucket. Read alone, that quietly broke a promise the project has
 * already made — PHASES.md Phase 1b: "Local storage stays the working copy.
 * The app must still open, read and write projects with no network and no
 * sign-in." A private bucket needs a signed URL, a signed URL needs a live
 * session and a live network, so offline the library would render cards with
 * names, categories and version numbers and no images. Every value resolves
 * except the one the designer opened the panel to see.
 *
 * That failure is worse than an obviously-offline app, and specifically worse
 * for this audience: a card with a name and a blank thumbnail is
 * indistinguishable from a failed upload. The migration's own justification
 * for a nullable storage_path is that "a file that vanishes without trace is
 * the failure this audience least recovers from" — and remote-only reads
 * reproduce exactly that state on every plane trip.
 *
 * WHY THE BYTES ARE STILL DURABLE REMOTELY. Not size — that was the original
 * mistaken reasoning, see the migration header. IndexedDB would hold a 50 MB
 * PDF without difficulty. It is eviction: best-effort browser storage is
 * cleared LRU under disk pressure, all-or-nothing per origin, and Safari
 * proactively deletes script-created data for origins unvisited for seven
 * days. navigator.storage.persist() improves the odds and does not settle it,
 * because the user can still clear it deliberately. A designer's only copy of
 * a client's deliverable must not live here.
 *
 * So this is a CACHE, and the word is load-bearing. Losing it costs a
 * download. It must never be the only copy of anything, and nothing in this
 * module may be the last reference to a byte.
 *
 * WHY INDEXEDDB AND NOT THE CACHE API. Cache Storage keys on Request/URL.
 * Signed URLs rotate on every mint, so the key would churn and every read
 * would miss. IndexedDB keyed on the stable object path from
 * assetStorageKey() does not have that problem.
 *
 * The IndexedDB surface is injected rather than imported so the decisions
 * here are testable. Nothing in this repo's vitest suite runs a browser, and
 * a cache that silently never hits looks exactly like a cache that works.
 */

export const DB_NAME = 'creative-companion-assets'
export const STORE_NAME = 'bytes'
export const DB_VERSION = 1

/* ---------------------------------------------------------------- states --- */

/**
 * What a card should say about its own bytes.
 *
 * Deliberately four states, not two. "Has image / no image" collapses three
 * genuinely different situations into one blank rectangle, and the designer
 * cannot act on any of them without knowing which they are looking at:
 * a failed upload needs a re-push, an un-downloaded asset needs a connection,
 * and a still-uploading one needs nothing at all.
 *
 * Copy rules, per AGENTS.md and the non-punitive-language work in Phase 5:
 * no alarm words, no red, no elapsed counts, nothing that reads as the
 * designer's fault. "Not downloaded to this device yet" is a fact about a
 * device. "Failed" is an accusation.
 */
export const BYTE_STATES = {
  /** Bytes are in the local cache. Renders immediately, online or not. */
  ready: 'ready',
  /** Row says bytes exist remotely; this device has not fetched them. */
  remote: 'remote',
  /** Fetching now. */
  loading: 'loading',
  /** The row never got a storage_path — the upload did not complete. */
  missing: 'missing',
}

/**
 * Decide what to show for one asset, given what we know.
 *
 * Pure, and that is the point: this is the judgement the UI will make dozens
 * of times per render, and it is the part most likely to be wrong in a way
 * nobody notices until a designer is offline in front of a client.
 *
 * @param {object} args
 * @param {string|null} args.storagePath  assets.storage_path
 * @param {boolean} args.cached           bytes present locally
 * @param {boolean} args.loading          a fetch is in flight
 * @param {boolean} args.online           navigator.onLine at call time
 */
export function assetByteState({ storagePath, cached, loading, online = true } = {}) {
  /* Cache first, unconditionally — before the storagePath check, before the
     online check. A cached asset renders even if the row lost its path and
     even with no network; those are facts about the server and this is a
     fact about this device. Checking them first is how a working local copy
     gets hidden behind a server problem. */
  if (cached) return { state: BYTE_STATES.ready, label: null, canRetry: false }

  if (!storagePath) {
    return {
      state: BYTE_STATES.missing,
      // Names what happened and what to do. Not "upload failed".
      label: 'The file did not finish uploading. Push it again when you can.',
      canRetry: true,
    }
  }

  if (loading) {
    return { state: BYTE_STATES.loading, label: 'Getting the file…', canRetry: false }
  }

  return {
    state: BYTE_STATES.remote,
    label: online
      ? 'Not on this device yet.'
      : 'Not on this device yet — it will appear when you are back online.',
    /* Offline is not a retry situation. Offering a button that cannot work is
       worse than offering none: it invites the second and third press, which
       is the same "control that looks dead" problem Phase 0 found in the
       primary button. */
    canRetry: online,
  }
}

/* ------------------------------------------------------------------- idb --- */

/**
 * Promisify one IDBRequest.
 *
 * Every error path here resolves rather than rejects at the call sites below.
 * A cache miss and a cache explosion must look the same to a caller, because
 * the correct response to both is "fetch it from the network" — and a cache
 * that can throw is a cache that can take the panel down with it.
 */
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Open (and if needed create) the byte store.
 *
 * @param {IDBFactory} [factory] injected for tests; defaults to the global.
 */
export function openAssetCache(factory) {
  const idb = factory || (typeof indexedDB !== 'undefined' ? indexedDB : null)
  if (!idb) return Promise.resolve(null)

  return new Promise((resolve) => {
    let request
    try {
      request = idb.open(DB_NAME, DB_VERSION)
    } catch {
      // Firefox in private browsing throws here rather than erroring async.
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Keyed by the object path from assetStorageKey() — stable across
        // signed-URL rotations, which is the whole reason this is IndexedDB.
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

/**
 * Read cached bytes. Resolves null on any miss or failure.
 */
export async function getAssetBytes(db, key) {
  if (!db || !key) return null
  try {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const result = await promisify(tx.objectStore(STORE_NAME).get(key))
    return result || null
  } catch {
    return null
  }
}

/**
 * Cache bytes. Resolves false on failure rather than throwing.
 *
 * Called at PUSH time as well as after a fetch, and that ordering is the
 * cheap win: the Blob is already in hand when an asset is uploaded, so the
 * device that created an asset never has to download it back. It also means
 * a failed upload still leaves the bytes locally, which gives the retry
 * something to retry from instead of asking the designer to find the file
 * again.
 */
export async function putAssetBytes(db, key, blob) {
  if (!db || !key || !blob) return false
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await promisify(tx.objectStore(STORE_NAME).put(blob, key))
    return true
  } catch {
    /* Quota exceeded lands here. Deliberately silent: this is a cache, the
       asset is safe in the bucket, and the fallback (fetch it again) already
       works. Surfacing a storage warning for a degraded optimisation would
       spend the designer's attention on something they cannot act on. */
    return false
  }
}

/** Drop one cached object. Best-effort; a failure leaves a harmless orphan. */
export async function deleteAssetBytes(db, key) {
  if (!db || !key) return false
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await promisify(tx.objectStore(STORE_NAME).delete(key))
    return true
  } catch {
    return false
  }
}

/**
 * Ask the browser not to evict this origin under storage pressure.
 *
 * Best-effort by definition — Chrome grants it on engagement heuristics,
 * Safari on installed-web-app status, and the user can clear storage
 * regardless. Called for its upside; its failure changes nothing, because
 * the durable copy was never here.
 */
export async function requestPersistence(storage) {
  const store = storage || (typeof navigator !== 'undefined' ? navigator.storage : null)
  if (!store?.persist) return false
  try {
    return await store.persist()
  } catch {
    return false
  }
}

/**
 * The read path: local first, network on miss, cache what comes back.
 *
 * `fetchBytes` is injected — it is the signed-URL round trip, which belongs
 * with the Supabase client rather than here. Returning null is a normal
 * outcome (offline, or the object is gone); the caller renders the state from
 * assetByteState() rather than a broken image.
 */
export async function loadAssetBytes({ db, key, fetchBytes, online = true } = {}) {
  if (!key) return { blob: null, fromCache: false }

  const cached = await getAssetBytes(db, key)
  if (cached) return { blob: cached, fromCache: true }

  // Do not attempt a fetch we know cannot succeed. The signed-URL mint would
  // fail slowly and the card would sit in `loading` until it timed out.
  if (!online || typeof fetchBytes !== 'function') {
    return { blob: null, fromCache: false }
  }

  // Declared without an initialiser: both branches below assign it, so a
  // `= null` here is dead and the lint ratchet counts it.
  let blob
  try {
    blob = await fetchBytes(key)
  } catch {
    blob = null
  }
  if (!blob) return { blob: null, fromCache: false }

  await putAssetBytes(db, key, blob)
  return { blob, fromCache: false }
}
