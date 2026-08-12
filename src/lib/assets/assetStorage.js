/**
 * Durable Asset Library boundary.
 *
 * Asset bytes belong in the existing private `brand-assets` bucket; metadata
 * belongs in the existing `assets` table. IndexedDB is only a local cache.
 * Keeping this boundary injectable lets unit tests prove the durable path
 * without pretending IndexedDB is a server.
 *
 * TWO PROJECT IDENTITIES, AND THIS MODULE IS WHERE THEY MEET.
 *
 * The local store names a project `${Date.now()}-${base36}` (createBlankProject).
 * The cloud names it a uuid and keeps the local name beside it in
 * `projects.local_id` — that is the existing mapping, established by
 * `projectSync.pushProject`, which upserts on (owner_id, local_id) and hands
 * back the row's uuid. `assets.project_id` is a uuid with a composite FK to
 * `projects (id, owner_id)`, so it can only ever hold the cloud identity.
 *
 * Before this module resolved that mapping it simply forwarded the local id,
 * which Postgres rejected as `22P02 invalid input syntax for type uuid` before
 * RLS was ever consulted. Every brief adoption failed, and the failure was
 * swallowed upstream.
 *
 * So: CALLERS SPEAK LOCAL. Every function here takes the local project id,
 * because that is what the store, the views and the ingest path all hold.
 * Translation happens once, here, and the returned asset keeps its LOCAL
 * `project_id` so the shelf can still find it — with the resolved uuid
 * recorded alongside as `project_row_id` for traceability. Anything else would
 * mean the same field naming two different things depending on which side of
 * this file you stand on.
 *
 * A project that has never been pushed has no uuid, and this module says so
 * rather than guessing. That is a real state — a local-only desk, or a project
 * created since the last sync — and it is reported as a sentence the caller
 * can show, not as a silent no-op.
 */
import { assetStorageKey } from './assetLibrary.js'

export const ASSET_BUCKET = 'brand-assets'
export const ASSET_URL_TTL_SECONDS = 3600

/** Said once, so the two call paths cannot drift into two explanations. */
export const NO_DURABLE_PROJECT =
  'This project has not been sent to the cloud yet, so the file could not be filed privately.'

const databaseRow = (asset, ownerId, storagePath, projectRowId) => ({
  id: asset.id,
  owner_id: ownerId,
  /* The CLOUD identity, resolved above. Never `asset.project_id`, which is
     the local one. */
  project_id: projectRowId,
  name: asset.name,
  category: asset.category,
  source_app: asset.source_app,
  source_ref: asset.source_ref,
  storage_path: storagePath,
  mime_type: asset.mime_type,
  byte_size: asset.byte_size,
  width: asset.width,
  height: asset.height,
  status: asset.status,
  approved_at: asset.approved_at,
  replaces_id: asset.replaces_id,
  /* Real columns since 20260810110000_asset_roles. Sent explicitly on every
     insert, which is why the column defaults never arbitrate here: the DB
     defaults `origin` to 'imported' (conservative, for rows this app did not
     write) while `normaliseIngest` stamps 'client' (for pushes that came
     through our own intake). Both are members of one vocabulary; neither is
     reached while this writer names the field. */
  role: asset.role || 'source',
  origin: asset.origin || 'client',
})

export function createAssetStorage(client) {
  /** localProjectId -> uuid | null, for the life of this storage instance. */
  const resolved = new Map()

  /**
   * The cloud uuid for a local project id, via the existing (owner, local_id)
   * mapping. Null when the project has no row yet.
   */
  async function durableProjectId(ownerId, localProjectId) {
    const key = String(localProjectId || '')
    if (!key) return null
    if (resolved.has(key)) return resolved.get(key)
    const { data, error } = await client
      .from('projects')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('local_id', key)
      .maybeSingle()
    /* A failed lookup is NOT cached. Caching it would turn one blip into a
       project that can never file an asset for the rest of the session. */
    if (error) return null
    const id = data?.id || null
    resolved.set(key, id)
    return id
  }

  return {
    async save(asset, file) {
      if (!client || !asset || !file) return { ok: false, error: 'Asset sync is unavailable.' }
      const { data: auth, error: authError } = await client.auth.getUser()
      const ownerId = auth?.user?.id
      if (authError || !ownerId) return { ok: false, error: 'Sign in to preserve source files.' }

      const projectRowId = await durableProjectId(ownerId, asset.project_id)
      if (!projectRowId) return { ok: false, error: NO_DURABLE_PROJECT }

      /* Keyed by the CLOUD project id, so an object in the bucket can be
         traced back to the row that owns it without a second mapping. The
         owner stays the first segment, which is the one thing every storage
         policy on this bucket reads. */
      const storagePath = assetStorageKey({
        ownerId,
        projectId: projectRowId,
        assetId: asset.id,
        mimeType: asset.mime_type,
      })
      if (!storagePath) return { ok: false, error: 'This file could not be filed.' }

      const bucket = client.storage.from(ASSET_BUCKET)
      const { error: uploadError } = await bucket.upload(storagePath, file, {
        contentType: asset.mime_type || undefined,
        upsert: false,
      })
      if (uploadError) return { ok: false, error: 'The original file could not be preserved.' }

      const { error: insertError } = await client
        .from('assets')
        .insert(databaseRow(asset, ownerId, storagePath, projectRowId))
      if (insertError) {
        await bucket.remove([storagePath])
        return { ok: false, error: 'The original file could not be recorded.' }
      }
      return {
        ok: true,
        asset: {
          ...asset,
          owner_id: ownerId,
          storage_path: storagePath,
          /* Local id untouched — see the header. The cloud id rides alongside
             so a later reader can find the row without re-resolving. */
          project_row_id: projectRowId,
        },
      }
    },

    async list(localProjectId) {
      if (!client || !localProjectId) return { ok: false, assets: [] }
      const { data: auth } = await client.auth.getUser()
      const ownerId = auth?.user?.id
      if (!ownerId) return { ok: false, assets: [] }
      const projectRowId = await durableProjectId(ownerId, localProjectId)
      if (!projectRowId) return { ok: false, assets: [] }
      const { data, error } = await client
        .from('assets')
        .select('*')
        .eq('project_id', projectRowId)
        .order('created_at', { ascending: false })
      return error ? { ok: false, assets: [] } : { ok: true, assets: data || [] }
    },

    /**
     * Narrow, durable lookup for a client Brief image already adopted into
     * this project. This deliberately does not hydrate the Asset Library UI:
     * Brief acceptance needs one identity check, not every asset row.
     */
    async findBriefSource(localProjectId, { assetRef, sourceRef } = {}) {
      if (!client || !localProjectId) return { ok: false, asset: null }
      const id = String(assetRef?.kind === 'asset' ? assetRef.id || '' : '').trim()
      const source = String(sourceRef || '').trim()
      if (!id && !source) return { ok: true, asset: null }

      const { data: auth } = await client.auth.getUser()
      const ownerId = auth?.user?.id
      if (!ownerId) return { ok: false, asset: null }
      const projectRowId = await durableProjectId(ownerId, localProjectId)
      /* No cloud project means no cloud asset — a definite "not there", not a
         failed check. The caller may then go and create one, which is exactly
         what it should do. */
      if (!projectRowId) return { ok: true, asset: null }

      let query = client
        .from('assets')
        .select('*')
        .eq('project_id', projectRowId)
        .eq('role', 'source')
        .eq('origin', 'client')
        .eq('source_app', 'brief')
      query = id ? query.eq('id', id) : query.eq('source_ref', source)
      const { data, error } = await query.maybeSingle()
      return error ? { ok: false, asset: null } : { ok: true, asset: data || null }
    },

    async signedUrl(asset) {
      const storagePath = asset?.storage_path || asset?.storagePath
      if (!client || !storagePath) return null
      const { data, error } = await client.storage
        .from(ASSET_BUCKET)
        .createSignedUrl(storagePath, ASSET_URL_TTL_SECONDS)
      return error ? null : data?.signedUrl || null
    },
  }
}
