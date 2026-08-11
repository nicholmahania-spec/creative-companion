/**
 * Durable Asset Library boundary.
 *
 * Asset bytes belong in the existing private `brand-assets` bucket; metadata
 * belongs in the existing `assets` table. IndexedDB is only a local cache.
 * Keeping this boundary injectable lets unit tests prove the durable path
 * without pretending IndexedDB is a server.
 */
import { assetStorageKey } from './assetLibrary.js'

export const ASSET_BUCKET = 'brand-assets'
export const ASSET_URL_TTL_SECONDS = 3600

const databaseRow = (asset, ownerId, storagePath) => ({
  id: asset.id,
  owner_id: ownerId,
  project_id: asset.project_id,
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
  role: asset.role || 'source',
  origin: asset.origin || 'client',
})

export function createAssetStorage(client) {
  return {
    async save(asset, file) {
      if (!client || !asset || !file) return { ok: false, error: 'Asset sync is unavailable.' }
      const { data: auth, error: authError } = await client.auth.getUser()
      const ownerId = auth?.user?.id
      if (authError || !ownerId) return { ok: false, error: 'Sign in to preserve source files.' }
      const storagePath = assetStorageKey({
        ownerId,
        projectId: asset.project_id,
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
        .insert(databaseRow(asset, ownerId, storagePath))
      if (insertError) {
        await bucket.remove([storagePath])
        return { ok: false, error: 'The original file could not be recorded.' }
      }
      return {
        ok: true,
        asset: { ...asset, owner_id: ownerId, storage_path: storagePath },
      }
    },

    async list(projectId) {
      if (!client || !projectId) return { ok: false, assets: [] }
      const { data: auth } = await client.auth.getUser()
      if (!auth?.user?.id) return { ok: false, assets: [] }
      const { data, error } = await client
        .from('assets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      return error ? { ok: false, assets: [] } : { ok: true, assets: data || [] }
    },

    /**
     * Narrow, durable lookup for a client Brief image already adopted into
     * this project. This deliberately does not hydrate the Asset Library UI:
     * Brief acceptance needs one identity check, not every asset row.
     */
    async findBriefSource(projectId, { assetRef, sourceRef } = {}) {
      if (!client || !projectId) return { ok: false, asset: null }
      const id = String(assetRef?.kind === 'asset' ? assetRef.id || '' : '').trim()
      const source = String(sourceRef || '').trim()
      if (!id && !source) return { ok: true, asset: null }

      let query = client
        .from('assets')
        .select('*')
        .eq('project_id', projectId)
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
