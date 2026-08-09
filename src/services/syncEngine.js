/**
 * Phase 1b — real sync. Local ↔ Supabase, background, with a stated
 * conflict rule and the losing version RETAINED.
 *
 * THE CONFLICT RULE, stated once and enforced here:
 *
 *   The desk wins. The version in front of the designer is never yanked
 *   away by a background process; when both sides changed, the local
 *   version becomes the truth and the cloud version is written to
 *   project_conflicts FIRST — durably — and only then overwritten.
 *
 * Why desk-wins and not newest-wins: "newest" needs trustworthy edit
 * timestamps on both sides, and the local store does not timestamp edits.
 * Wall-clock comparisons across devices are exactly the trap PHASES.md
 * warns about. Desk-wins is explainable in one sentence and — because the
 * loser is retained — LOSSLESS either way.
 *
 * The part borrowed from CouchDB is narrow and worth stating precisely: that
 * picking a winner is a DISPLAY choice, valid only once both versions are
 * durably stored. The rest of CouchDB's model is NOT what this is —
 * CouchDB picks its winner by a deterministic function of the revisions, so
 * every replica independently agrees. Desk-wins is per-replica: the winner
 * is whichever device happens to sync last. That is fine for one designer on
 * their own two devices, and it would NOT be fine with real concurrent
 * writers.
 *
 * Known limit, recorded rather than hidden: the sync unit is the whole
 * project document, so a conflict resolves wholesale even when the two sides
 * touched unrelated sections. A merge-based model (Automerge/CRDT) would
 * resolve those without a loser at all. That is a rewrite of the store, and
 * the honest trigger for it is measurement — if real conflicts turn out to
 * be common rather than rare, this rule is the wrong one.
 *
 * Change detection is by content hash against the last-synced state, not
 * by timestamps: `dirty` means "this desk changed the document since it
 * last agreed with the cloud", `remoteChanged` means "the cloud row moved
 * since then". The four combinations give the four actions below.
 *
 * Sync meta lives in its own localStorage key, NOT in the zustand persist
 * blob — it is per-device bookkeeping about the relationship between this
 * desk and the cloud, not workspace content, and keeping it out of the
 * store means no store migration and no accidental export.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { projectToCloudData, pushProject } from './projectSync.js'

const META_KEY = 'cc-project-sync-meta-v1'

/** djb2 over the cloud-shaped document. Collisions are theoretically
 *  possible and practically irrelevant here: a false "clean" needs two
 *  different documents hashing equal AND being the same project; the cost
 *  of a false "dirty" is one redundant push. */
export function docHash(doc) {
  const s = JSON.stringify(doc)
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return String(h)
}

export function readSyncMeta() {
  try {
    return JSON.parse(window.localStorage.getItem(META_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

export function writeSyncMeta(meta) {
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    /* Full storage must not kill sync — worst case is re-detecting work
       already done next round. */
  }
}

/**
 * The four-way decision, pure and unit-tested.
 *
 * @param {object|null} localDoc  cloud-shaped local document (workLog gone)
 * @param {object|null} meta      { remoteUpdatedAt, docHash } from last sync
 * @param {object|null} remoteRow { updated_at, data } or null if no row
 * @returns {'push'|'pull'|'conflict'|'none'}
 */
export function decideSyncAction(localDoc, meta, remoteRow) {
  if (!localDoc && !remoteRow) return 'none'
  if (localDoc && !remoteRow) return 'push'
  if (!localDoc && remoteRow) return 'pull'

  const dirty = !meta || docHash(localDoc) !== meta.docHash
  const remoteChanged =
    !meta || String(remoteRow.updated_at) !== String(meta.remoteUpdatedAt)

  if (dirty && remoteChanged) return 'conflict'
  if (dirty) return 'push'
  if (remoteChanged) return 'pull'
  return 'none'
}

/* ------------------------------------------------------------------ state */

/** synced | syncing | offline | failed | idle — the honest four (plus
 *  "idle" for before the first attempt). Failure keeps its reason and stays
 *  until a retry succeeds; it does not decay into a toast. */
let syncStatus = { state: 'idle', reason: '', at: null, conflicts: 0 }
const listeners = new Set()

export function getSyncStatus() {
  return syncStatus
}

export function subscribeSyncStatus(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function setStatus(state, reason = '', conflicts = 0) {
  syncStatus = { state, reason, at: Date.now(), conflicts }
  listeners.forEach((fn) => fn(syncStatus))
}

/* ------------------------------------------------------------- orchestrate */

let inFlight = false
let queued = false

/**
 * Sync every local project against the cloud.
 *
 * @param {object} deps
 * @param {() => Array<object>} deps.getProjects   read local projects
 * @param {(projects: Array<object>) => void} deps.setProjects  replace them
 * @returns {Promise<{ok: boolean, pushed: number, pulled: number, conflicts: number, reason?: string}>}
 */
export async function syncAllProjects({
  getProjects,
  setProjects,
  getDeletedProjects = () => [],
}) {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      ok: false,
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      reason: 'not-configured',
    }
  }
  if (inFlight) {
    queued = true
    return {
      ok: true,
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      reason: 'coalesced',
    }
  }
  inFlight = true
  try {
    let result
    do {
      queued = false
      result = await runSync({ getProjects, setProjects, getDeletedProjects })
    } while (queued)
    return result
  } finally {
    inFlight = false
  }
}

async function runSync({ getProjects, setProjects, getDeletedProjects }) {
  const counts = { pushed: 0, pulled: 0, conflicts: 0 }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setStatus('offline')
    return { ok: false, ...counts, reason: 'offline' }
  }

  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) {
    // Not an error state — a local-only desk is a supported way to work.
    setStatus('idle')
    return { ok: false, ...counts, reason: 'signed-out' }
  }

  setStatus('syncing')

  const { data: rows, error } = await supabase
    .from('projects')
    .select('id, local_id, name, stage, data, updated_at')
    .eq('owner_id', user.id)
  if (error) {
    setStatus(
      'failed',
      'The cloud did not answer. Your work is safe on this desk.',
    )
    return { ok: false, ...counts, reason: error.message }
  }

  const remoteByLocalId = new Map(
    (rows || []).filter((r) => r.local_id).map((r) => [String(r.local_id), r]),
  )
  const meta = readSyncMeta()
  const locals = getProjects()
  const localById = new Map(locals.map((p) => [String(p.id), p]))
  let nextProjects = [...locals]
  let projectsChanged = false

  /* A DELETED PROJECT IS NOT A CANDIDATE FOR ANYTHING.
     The set below used to be the plain union of both sides, and that is the
     whole bug: a project deleted locally is `local = null, remote = present`,
     which `decideSyncAction` reads as "the cloud has something this desk has
     not seen" and pulls straight back in. Nothing deletes a project row, so
     the remote copy is permanent and it came back on every sync, for ever.

     Filtering the RESULT would have fixed the pull and left the push: a stale
     copy on another device would keep re-uploading the project. Taking the id
     out of the work set removes it as a candidate in both directions at once,
     which is the property that actually has to hold. */
  const deleted = (getDeletedProjects?.() || []).map((d) => String(d?.id))
  const tombstoned = new Set(deleted.filter((id) => id && id !== 'undefined'))
  const ids = new Set(
    [...localById.keys(), ...remoteByLocalId.keys()].filter(
      (id) => !tombstoned.has(String(id)),
    ),
  )

  for (const id of ids) {
    const local = localById.get(id) || null
    const remote = remoteByLocalId.get(id) || null
    const localCloudDoc = local ? projectToCloudData(local) : null
    const action = decideSyncAction(localCloudDoc, meta[id], remote)

    if (action === 'none') continue

    if (action === 'push') {
      const r = await pushProject(local)
      if (!r.ok) {
        setStatus('failed', r.reason)
        return { ok: false, ...counts, reason: r.reason }
      }
      meta[id] = await refreshedMeta(user.id, id, localCloudDoc)
      counts.pushed += 1
      continue
    }

    if (action === 'pull') {
      const incoming = rehydrate(remote, local)
      if (local) {
        nextProjects = nextProjects.map((p) =>
          String(p.id) === id ? incoming : p,
        )
      } else {
        nextProjects = [...nextProjects, incoming]
      }
      projectsChanged = true
      meta[id] = {
        remoteUpdatedAt: String(remote.updated_at),
        docHash: docHash(projectToCloudData(incoming)),
      }
      counts.pulled += 1
      continue
    }

    // conflict — retain the LOSER (the cloud copy) first, then push the desk.
    const retained = await supabase.from('project_conflicts').insert({
      owner_id: user.id,
      project_row_id: remote.id,
      local_id: id,
      project_name: remote.name || local?.name || null,
      losing_side: 'remote',
      data: remote.data || {},
    })
    if (retained.error) {
      // Retention failed → the loser would be LOST if we pushed. Do not
      // push. This ordering is the entire safety argument of the rule.
      setStatus(
        'failed',
        'Could not keep the other version safe, so nothing was overwritten.',
      )
      return { ok: false, ...counts, reason: retained.error.message }
    }
    const r = await pushProject(local)
    if (!r.ok) {
      setStatus('failed', r.reason)
      return { ok: false, ...counts, reason: r.reason }
    }
    meta[id] = await refreshedMeta(user.id, id, localCloudDoc)
    counts.conflicts += 1
  }

  if (projectsChanged) setProjects(nextProjects)
  writeSyncMeta(meta)
  /* A kept version that nobody is told about is a version nobody recovers.
     The count rides on the status so the UI can say so without polling. */
  setStatus('synced', '', counts.conflicts)
  return { ok: true, ...counts }
}

/** A pulled document becomes a local project again. Device-local fields the
 *  cloud never carries (workLog) survive from the existing local copy. */
function rehydrate(remoteRow, existingLocal) {
  const doc =
    remoteRow.data && typeof remoteRow.data === 'object' ? remoteRow.data : {}
  return {
    ...doc,
    id: String(remoteRow.local_id),
    workLog: existingLocal?.workLog || [],
  }
}

/** After a push, meta must record the updated_at the SERVER wrote (the
 *  trigger stamps it — we cannot know it client-side). One cheap read. */
async function refreshedMeta(userId, localId, localCloudDoc) {
  const { data } = await supabase
    .from('projects')
    .select('updated_at')
    .eq('owner_id', userId)
    .eq('local_id', localId)
    .maybeSingle()
  return {
    remoteUpdatedAt: data ? String(data.updated_at) : '',
    docHash: docHash(localCloudDoc),
  }
}

/** How many retained versions the recovery list asks for at a time. */
export const RETAINED_PAGE = 20

/**
 * Retained versions, newest first, for the Settings recovery list.
 *
 * Ordered by (created_at desc, seq desc), NOT created_at alone: created_at
 * comes from now(), which is transaction-start time, so versions retained in
 * the same transaction share a timestamp and their order is undefined. With
 * an unstable order a paged window can return a different subset per call —
 * a retained version appearing, vanishing and reappearing, in the one list
 * whose whole job is recovery. `seq` is the monotonic tie-break.
 *
 * @param {{ page?: number }} [opts]
 * @returns {Promise<{ok: boolean, rows: Array<object>, hasMore: boolean, reason?: string}>}
 */
export async function listRetainedVersions(opts = {}) {
  const empty = { ok: false, rows: [], hasMore: false }
  if (!isSupabaseConfigured() || !supabase) return empty
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return empty
  const page = Math.max(0, Number(opts.page) || 0)
  const from = page * RETAINED_PAGE
  const { data, error } = await supabase
    .from('project_conflicts')
    .select('id, seq, local_id, project_name, losing_side, created_at, data')
    .order('created_at', { ascending: false })
    .order('seq', { ascending: false })
    // One extra row is the cheapest "is there more?" — no count query.
    .range(from, from + RETAINED_PAGE)
  if (error) return { ...empty, reason: error.message }
  const rows = data || []
  return {
    ok: true,
    rows: rows.slice(0, RETAINED_PAGE),
    hasMore: rows.length > RETAINED_PAGE,
  }
}

/**
 * Retain the CURRENT version of a project before something replaces it.
 *
 * Exists because "Bring back" was the one operation in the app with no
 * safety net (devil's advocate, 2026-08-05): restoring a retained version
 * makes the local copy dirty while the remote is unchanged, so the next sync
 * decides `push` — not `conflict` — and the winning copy was overwritten
 * with nothing kept. The recovery path was destroying a version, which
 * inverts the entire argument the conflict rule rests on.
 *
 * This is what `losing_side: 'local'` is for: the desk copy is the one about
 * to be replaced, so it is the loser this time.
 *
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function retainCurrentVersion(project) {
  if (!isSupabaseConfigured() || !supabase) return { ok: false }
  if (!project?.id) return { ok: false }
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return { ok: false, reason: 'signed-out' }

  const { data: row } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)
    .eq('local_id', String(project.id))
    .maybeSingle()

  const { error } = await supabase.from('project_conflicts').insert({
    owner_id: user.id,
    project_row_id: row?.id || null,
    local_id: String(project.id),
    project_name: project.name || null,
    losing_side: 'local',
    data: projectToCloudData(project),
  })
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

/**
 * Discard ONE retained version.
 *
 * Goes through an RPC rather than a delete, because this table has no delete
 * policy on purpose: a table-level delete grant means one unfiltered request
 * can wipe the entire safety net, which is the first thing a stolen token
 * would reach for before overwriting projects. The RPC can only ever remove
 * a single row, scoped to the caller. (Audit 2026-08-05.)
 *
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function discardRetainedVersion(id) {
  if (!isSupabaseConfigured() || !supabase) return { ok: false }
  const { data, error } = await supabase.rpc('discard_retained_version', {
    p_id: id,
  })
  if (error) return { ok: false, reason: error.message }
  return { ok: data === true }
}
