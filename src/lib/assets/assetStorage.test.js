import { describe, expect, it, vi } from 'vitest'
import { createAssetStorage } from './assetStorage.js'

const asset = (over = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  project_id: 'project-a',
  name: 'Existing logo.svg',
  category: 'logo',
  source_app: 'upload',
  source_ref: null,
  mime_type: 'image/svg+xml',
  byte_size: 42,
  width: null,
  height: null,
  status: 'draft',
  approved_at: null,
  replaces_id: null,
  role: 'source',
  origin: 'client',
  ...over,
})

function client({ insertError = null, rows = [], lookup = null, lookupError = null } = {}) {
  const bucket = {
    upload: vi.fn(async () => ({ error: null })),
    remove: vi.fn(async () => ({ error: null })),
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://signed/file' }, error: null })),
  }
  const insert = vi.fn(async () => ({ error: insertError }))
  const order = vi.fn(async () => ({ data: rows, error: null }))
  const maybeSingle = vi.fn(async () => ({ data: lookup, error: lookupError }))
  const eq = vi.fn(() => ({ eq, order, maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'owner-1' } }, error: null })) },
    storage: { from: vi.fn(() => bucket) },
    from: vi.fn(() => ({ insert, select })),
    bucket,
    insert,
    eq,
    maybeSingle,
  }
}

describe('durable Asset Library storage boundary', () => {
  it('uploads original bytes to the private bucket then records source metadata', async () => {
    const supabase = client()
    const result = await createAssetStorage(supabase).save(asset(), { name: 'Existing logo.svg' })
    expect(result.ok).toBe(true)
    expect(supabase.bucket.upload).toHaveBeenCalledWith(
      'owner-1/project-a/11111111-1111-4111-8111-111111111111.svg',
      expect.any(Object),
      expect.objectContaining({ upsert: false })
    )
    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      role: 'source', origin: 'client', storage_path: expect.stringContaining('owner-1/project-a/'),
    }))
  })

  it('removes uploaded bytes if durable metadata cannot be recorded', async () => {
    const supabase = client({ insertError: new Error('db unavailable') })
    const result = await createAssetStorage(supabase).save(asset(), { name: 'Existing logo.svg' })
    expect(result.ok).toBe(false)
    expect(supabase.bucket.remove).toHaveBeenCalledTimes(1)
  })

  it('rehydrates durable project rows without IndexedDB', async () => {
    const row = { ...asset(), storage_path: 'owner-1/project-a/logo.svg' }
    const supabase = client({ rows: [row] })
    const result = await createAssetStorage(supabase).list('project-a')
    expect(result).toEqual({ ok: true, assets: [row] })
    expect(supabase.eq).toHaveBeenCalledWith('project_id', 'project-a')
  })

  it('retrieves a private signed URL from the durable file reference', async () => {
    const supabase = client()
    await expect(createAssetStorage(supabase).signedUrl(asset({ storage_path: 'owner-1/project-a/logo.svg' })))
      .resolves.toBe('https://signed/file')
  })

  it('looks up a Brief source by project and stable source identity without loading the library', async () => {
    const row = { ...asset({ source_app: 'brief', source_ref: 'https://client.test/logo.png' }) }
    const supabase = client({ lookup: row })
    const result = await createAssetStorage(supabase).findBriefSource('project-a', {
      sourceRef: 'https://client.test/logo.png',
    })

    expect(result).toEqual({ ok: true, asset: row })
    expect(supabase.eq).toHaveBeenCalledWith('project_id', 'project-a')
    expect(supabase.eq).toHaveBeenCalledWith('source_ref', 'https://client.test/logo.png')
  })

  it('keeps a failed narrow lookup distinct from not found', async () => {
    const supabase = client({ lookupError: new Error('offline') })
    await expect(createAssetStorage(supabase).findBriefSource('project-a', {
      sourceRef: 'https://client.test/logo.png',
    })).resolves.toEqual({ ok: false, asset: null })
  })
})
