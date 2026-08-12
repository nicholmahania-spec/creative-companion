import { describe, expect, it, vi } from 'vitest'
import { createAssetStorage, NO_DURABLE_PROJECT } from './assetStorage.js'

/**
 * The durable boundary, including the part that used to be missing: the
 * translation between the LOCAL project id every caller holds and the cloud
 * uuid `assets.project_id` actually requires.
 *
 * The mock models `projects` and `assets` as separate tables, because the
 * previous single-table mock accepted any query against anything — which is
 * how a writer that named two non-existent columns and forwarded a
 * non-uuid project id stayed green for a whole phase.
 */

const LOCAL_ID = '1754000000000-ab12x'
const PROJECT_UUID = '22222222-2222-4222-8222-222222222222'

const asset = (over = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  project_id: LOCAL_ID,
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

/**
 * @param {object} opts
 * @param {string|null} opts.projectRowId  what (owner, local_id) resolves to
 */
function client({
  insertError = null,
  rows = [],
  lookup = null,
  lookupError = null,
  projectRowId = PROJECT_UUID,
  projectError = null,
} = {}) {
  const bucket = {
    upload: vi.fn(async () => ({ error: null })),
    remove: vi.fn(async () => ({ error: null })),
    createSignedUrl: vi.fn(async () => ({
      data: { signedUrl: 'https://signed/file' },
      error: null,
    })),
  }
  const insert = vi.fn(async () => ({ error: insertError }))
  /** Every `.eq()` this test saw, as [table, column, value]. */
  const filters = []

  function table(name) {
    const chain = {
      select: () => chain,
      order: async () => ({ data: rows, error: null }),
      maybeSingle: async () =>
        name === 'projects'
          ? { data: projectRowId ? { id: projectRowId } : null, error: projectError }
          : { data: lookup, error: lookupError },
      eq: (column, value) => {
        filters.push([name, column, value])
        return chain
      },
      insert,
    }
    return chain
  }

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'owner-1' } }, error: null })),
    },
    storage: { from: vi.fn(() => bucket) },
    from: vi.fn((name) => table(name)),
    bucket,
    insert,
    filters,
    on: (name, column) =>
      filters.filter((f) => f[0] === name && f[1] === column).map((f) => f[2]),
  }
}

describe('local project id → durable project uuid', () => {
  it('resolves the cloud project through the existing (owner, local_id) mapping', async () => {
    const supabase = client()
    const result = await createAssetStorage(supabase).save(asset(), { name: 'logo.svg' })

    expect(result.ok).toBe(true)
    expect(supabase.on('projects', 'local_id')).toEqual([LOCAL_ID])
    expect(supabase.on('projects', 'owner_id')).toEqual(['owner-1'])
  })

  it('writes the cloud uuid into assets.project_id, never the local id', async () => {
    const supabase = client()
    await createAssetStorage(supabase).save(asset(), { name: 'logo.svg' })

    const row = supabase.insert.mock.calls[0][0]
    expect(row.project_id).toBe(PROJECT_UUID)
    expect(row.project_id).not.toBe(LOCAL_ID)
  })

  it('keeps the LOCAL id on the returned asset so the shelf can still find it', async () => {
    /* The store, the views and the ingest path all speak local. If `save`
       handed back the uuid the row would vanish from the library the instant
       it was preserved. */
    const supabase = client()
    const result = await createAssetStorage(supabase).save(asset(), { name: 'logo.svg' })

    expect(result.asset.project_id).toBe(LOCAL_ID)
    expect(result.asset.project_row_id).toBe(PROJECT_UUID)
    expect(result.asset.owner_id).toBe('owner-1')
  })

  it('resolves the mapping once for repeated calls', async () => {
    const supabase = client()
    const store = createAssetStorage(supabase)
    await store.save(asset(), { name: 'a.svg' })
    await store.save(asset({ id: 'second' }), { name: 'b.svg' })

    expect(supabase.on('projects', 'local_id')).toEqual([LOCAL_ID])
  })

  it('says so, and uploads nothing, when the project has never been pushed', async () => {
    const supabase = client({ projectRowId: null })
    const result = await createAssetStorage(supabase).save(asset(), { name: 'logo.svg' })

    expect(result).toEqual({ ok: false, error: NO_DURABLE_PROJECT })
    /* The order matters: no orphan object is left in the bucket for a row
       that could never have been written. */
    expect(supabase.bucket.upload).not.toHaveBeenCalled()
    expect(supabase.insert).not.toHaveBeenCalled()
  })
})

describe('durable Asset Library storage boundary', () => {
  it('uploads original bytes to the private bucket then records source metadata', async () => {
    const supabase = client()
    const result = await createAssetStorage(supabase).save(asset(), { name: 'Existing logo.svg' })
    expect(result.ok).toBe(true)
    /* Keyed by owner then CLOUD project — the owner segment is what every
       storage policy on this bucket compares against auth.uid(). */
    expect(supabase.bucket.upload).toHaveBeenCalledWith(
      `owner-1/${PROJECT_UUID}/11111111-1111-4111-8111-111111111111.svg`,
      expect.any(Object),
      expect.objectContaining({ upsert: false })
    )
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'source',
        origin: 'client',
        storage_path: expect.stringContaining(`owner-1/${PROJECT_UUID}/`),
      })
    )
  })

  it('removes uploaded bytes if durable metadata cannot be recorded', async () => {
    const supabase = client({ insertError: new Error('db unavailable') })
    const result = await createAssetStorage(supabase).save(asset(), { name: 'Existing logo.svg' })
    expect(result.ok).toBe(false)
    expect(supabase.bucket.remove).toHaveBeenCalledTimes(1)
  })

  it('rehydrates durable project rows without IndexedDB', async () => {
    const row = { ...asset(), storage_path: `owner-1/${PROJECT_UUID}/logo.svg` }
    const supabase = client({ rows: [row] })
    const result = await createAssetStorage(supabase).list(LOCAL_ID)
    expect(result).toEqual({ ok: true, assets: [row] })
    expect(supabase.on('assets', 'project_id')).toEqual([PROJECT_UUID])
  })

  it('retrieves a private signed URL from the durable file reference', async () => {
    const supabase = client()
    await expect(
      createAssetStorage(supabase).signedUrl(asset({ storage_path: 'owner-1/p/logo.svg' }))
    ).resolves.toBe('https://signed/file')
  })

  it('looks up a Brief source by project and stable source identity without loading the library', async () => {
    const row = asset({ source_app: 'brief', source_ref: 'https://client.test/logo.png' })
    const supabase = client({ lookup: row })
    const result = await createAssetStorage(supabase).findBriefSource(LOCAL_ID, {
      sourceRef: 'https://client.test/logo.png',
    })

    expect(result).toEqual({ ok: true, asset: row })
    expect(supabase.on('assets', 'project_id')).toEqual([PROJECT_UUID])
    expect(supabase.on('assets', 'source_ref')).toEqual(['https://client.test/logo.png'])
    /* role/origin are real columns as of 20260810110000_asset_roles, and they
       are what makes this lookup mean "the client's own brief artwork" rather
       than "anything sharing this source_ref". */
    expect(supabase.on('assets', 'role')).toEqual(['source'])
    expect(supabase.on('assets', 'origin')).toEqual(['client'])
  })

  it('keeps a failed narrow lookup distinct from not found', async () => {
    const supabase = client({ lookupError: new Error('offline') })
    await expect(
      createAssetStorage(supabase).findBriefSource(LOCAL_ID, {
        sourceRef: 'https://client.test/logo.png',
      })
    ).resolves.toEqual({ ok: false, asset: null })
  })

  it('treats a project with no cloud row as a definite not-found, not a failed check', async () => {
    /* The difference decides what the caller does next. "Could not check"
       must stop it from copying; "definitely not there" must let it. */
    const supabase = client({ projectRowId: null })
    await expect(
      createAssetStorage(supabase).findBriefSource(LOCAL_ID, {
        sourceRef: 'https://client.test/logo.png',
      })
    ).resolves.toEqual({ ok: true, asset: null })
  })
})
