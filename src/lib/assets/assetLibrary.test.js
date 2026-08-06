import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  ALLOWED_MIME_TYPES,
  ASSET_CATEGORIES,
  MAX_ASSET_BYTES,
  SOURCE_APPS,
  assetStorageKey,
  carriesTrueColour,
  currentAssets,
  extensionForMime,
  findVersionTarget,
  normaliseIngest,
  versionChain,
  versionNumber,
} from './assetLibrary.js'

const here = dirname(fileURLToPath(import.meta.url))
const migration = readFileSync(
  resolve(here, '../../../supabase/migrations/20260806120000_asset_library.sql'),
  'utf8'
)

/* Comments stripped. This file's migrations carry long rationale headers that
   quote the very identifiers these assertions forbid — the first version of
   the is_current check below failed against the sentence explaining why there
   is no is_current column. Asserting on prose makes a test that fires on
   documentation and stays silent on schema, which is exactly backwards. */
const schema = migration.replace(/--[^\n]*/g, '')

/* An asset row, minus whatever the test is about. */
const asset = (over = {}) => ({
  id: 'a1',
  project_id: 'p1',
  name: 'Card',
  category: 'application',
  source_app: 'upload',
  source_ref: null,
  mime_type: 'image/png',
  replaces_id: null,
  ...over,
})

describe('storage keys', () => {
  it('puts the owner first, because every bucket policy reads folder[1]', () => {
    const key = assetStorageKey({
      ownerId: 'own',
      projectId: 'proj',
      assetId: 'ass',
      mimeType: 'image/svg+xml',
    })
    expect(key).toBe('own/proj/ass.svg')
    expect(key.split('/')[0]).toBe('own')
  })

  it('returns null rather than a key with holes in it', () => {
    // A key like `undefined/p/a.png` writes to a folder no policy matches, so
    // it fails at the bucket — but only after the bytes have been sent, and
    // cloudSync's catch swallows that class of failure quietly.
    expect(assetStorageKey({ projectId: 'p', assetId: 'a' })).toBeNull()
    expect(assetStorageKey({ ownerId: 'o', assetId: 'a' })).toBeNull()
    expect(assetStorageKey({ ownerId: 'o', projectId: 'p' })).toBeNull()
    expect(assetStorageKey()).toBeNull()
  })

  it('falls back to .bin rather than throwing on an unknown mime', () => {
    expect(extensionForMime('application/x-nonsense')).toBe('bin')
  })
})

describe('the migration and this module agree', () => {
  /* These four are the ones that silently diverge. Each has the same value
     written down in two systems, and when they drift the app either rejects
     what the database would have taken (invisible, and reads as a bug in the
     designer's file) or accepts what it rejects (a 400 mid-push, after the
     upload). Asserting against the SQL text is crude but it fails loudly on
     the commit that changes one side. */

  it('shares the bucket size limit', () => {
    expect(schema).toContain(String(MAX_ASSET_BYTES))
  })

  it('allows exactly the mime types the bucket allows', () => {
    const bucketBlock = schema.slice(
      schema.indexOf('allowed_mime_types'),
      schema.indexOf('on conflict (id) do update')
    )
    for (const mime of ALLOWED_MIME_TYPES) {
      expect(bucketBlock).toContain(`'${mime}'`)
    }
    const inSql = [...bucketBlock.matchAll(/'((?:image|application)\/[a-z+-]+)'/g)].map(
      (m) => m[1]
    )
    expect(new Set(inSql)).toEqual(new Set(ALLOWED_MIME_TYPES))
  })

  it('keeps the owner-first key shape the storage policies depend on', () => {
    expect(schema).toContain("(storage.foldername(name))[1] = (auth.uid())::text")
  })

  it('derives current-ness in the view instead of storing a flag', () => {
    // If someone adds an is_current column, this module's currentAssets()
    // becomes a second source of truth for the same question.
    expect(schema).not.toMatch(/is_current/)
    expect(schema).toContain('security_invoker = true')
  })
})

describe('ingest', () => {
  const good = {
    name: 'Business card',
    projectId: 'p1',
    mimeType: 'application/pdf',
    sourceApp: 'illustrator',
    sourceRef: 'artboard-7',
    byteSize: 1024,
    width: 1050,
    height: 600,
  }

  it('accepts a well-formed push and lands it as a draft', () => {
    const { ok, asset: row } = normaliseIngest(good)
    expect(ok).toBe(true)
    expect(row.status).toBe('draft')
    expect(row.approved_at).toBeNull()
    expect(row.source_app).toBe('illustrator')
    expect(row.source_ref).toBe('artboard-7')
  })

  it('takes snake_case as well as camelCase', () => {
    // The plugins are not written in this repo and will not all agree.
    const { ok, asset: row } = normaliseIngest({
      name: 'Card',
      project_id: 'p1',
      mime_type: 'image/png',
      source_app: 'figma',
      source_ref: 'node:12',
    })
    expect(ok).toBe(true)
    expect(row.project_id).toBe('p1')
    expect(row.source_app).toBe('figma')
  })

  it('files an unnamed category as unfiled rather than refusing the push', () => {
    // Forward compatibility: a plugin that knows about "packaging" before
    // this build does must not lose the designer's file over vocabulary.
    const { ok, asset: row } = normaliseIngest({ ...good, category: 'packaging' })
    expect(ok).toBe(true)
    expect(row.category).toBe('other')
  })

  it('defaults to unfiled, so a push never has to answer a taxonomy question', () => {
    const { asset: row } = normaliseIngest({ name: 'Thing', projectId: 'p1' })
    expect(row.category).toBe('other')
    expect(row.source_app).toBe('upload')
  })

  it('keeps a push that could not report its dimensions', () => {
    // The one job the bridge has over dragging a file is not making the
    // designer stop. Missing optional metadata must never be fatal.
    const { ok, asset: row } = normaliseIngest({ name: 'Mark', projectId: 'p1' })
    expect(ok).toBe(true)
    expect(row.width).toBeNull()
    expect(row.byte_size).toBeNull()
  })

  it('names the offending type instead of saying "unsupported"', () => {
    const { ok, errors } = normaliseIngest({
      ...good,
      mimeType: 'application/postscript',
    })
    expect(ok).toBe(false)
    expect(errors[0]).toContain('application/postscript')
    expect(errors[0]).toMatch(/PDF|SVG|PNG/)
  })

  it('refuses a push with no project to land in', () => {
    const { ok, errors } = normaliseIngest({ name: 'Card' })
    expect(ok).toBe(false)
    expect(errors.join(' ')).toMatch(/project/i)
  })

  it('refuses a file over the bucket ceiling before uploading it', () => {
    const { ok, errors } = normaliseIngest({ ...good, byteSize: MAX_ASSET_BYTES + 1 })
    expect(ok).toBe(false)
    expect(errors.join(' ')).toMatch(/50 MB/)
  })

  it('states every problem at once, not one per attempt', () => {
    // Fixing a form one rejection at a time is the interaction this audience
    // abandons.
    const { ok, errors } = normaliseIngest({ mimeType: 'video/mp4' })
    expect(ok).toBe(false)
    expect(errors.length).toBeGreaterThan(1)
  })

  it('never lets a push arrive pre-approved', () => {
    const { asset: row } = normaliseIngest({ ...good, status: 'approved' })
    expect(row.status).toBe('draft')
    expect(row.approved_at).toBeNull()
  })
})

describe('versions', () => {
  it('chains a re-push onto the existing head', () => {
    const existing = [asset({ id: 'v1', source_app: 'illustrator', source_ref: 'ab-7' })]
    const target = findVersionTarget(existing, {
      source_app: 'illustrator',
      source_ref: 'ab-7',
    })
    expect(target?.id).toBe('v1')
  })

  it('chains onto the head, not the newest row', () => {
    // Two pushes landing out of order on a flaky connection. Chaining onto a
    // superseded version forks the chain into two heads, after which the
    // library shows the asset twice and neither entry is wrong.
    const rows = [
      asset({ id: 'v1', source_app: 'figma', source_ref: 'n1' }),
      asset({ id: 'v2', source_app: 'figma', source_ref: 'n1', replaces_id: 'v1' }),
    ]
    const target = findVersionTarget(rows, { source_app: 'figma', source_ref: 'n1' })
    expect(target.id).toBe('v2')
  })

  it('starts a new chain when the source told us nothing', () => {
    // Guessing by filename would bury an unrelated file as an old version of
    // something else. A cluttered library is annoying; a hidden file is lost.
    const rows = [asset({ id: 'v1', name: 'logo.png' })]
    expect(findVersionTarget(rows, { source_app: 'upload', source_ref: null })).toBeNull()
    expect(findVersionTarget(rows, {})).toBeNull()
  })

  it('does not match across source apps', () => {
    const rows = [asset({ id: 'v1', source_app: 'figma', source_ref: 'x' })]
    expect(
      findVersionTarget(rows, { source_app: 'illustrator', source_ref: 'x' })
    ).toBeNull()
  })

  it('shows only chain heads', () => {
    const rows = [
      asset({ id: 'v1' }),
      asset({ id: 'v2', replaces_id: 'v1' }),
      asset({ id: 'other' }),
    ]
    expect(currentAssets(rows).map((a) => a.id).sort()).toEqual(['other', 'v2'])
  })

  it('keeps superseded versions reachable', () => {
    // The whole reason this is a chain and not an upsert: §17's argument is
    // about which version the client approved.
    const rows = [
      asset({ id: 'v1' }),
      asset({ id: 'v2', replaces_id: 'v1' }),
      asset({ id: 'v3', replaces_id: 'v2' }),
    ]
    expect(versionChain(rows, 'v3').map((a) => a.id)).toEqual(['v3', 'v2', 'v1'])
    expect(versionNumber(rows, 'v3')).toBe(3)
    expect(versionNumber(rows, 'v1')).toBe(1)
  })

  it('terminates on a cycle instead of hanging the browser', () => {
    // Unreachable through the schema. Asserted anyway: the cost of trusting
    // a constraint in another system is the designer's tab locking up on
    // their own asset panel.
    const rows = [
      asset({ id: 'v1', replaces_id: 'v2' }),
      asset({ id: 'v2', replaces_id: 'v1' }),
    ]
    expect(versionChain(rows, 'v1').map((a) => a.id)).toEqual(['v1', 'v2'])
  })

  it('survives empty and malformed input', () => {
    expect(currentAssets(undefined)).toEqual([])
    expect(currentAssets([null, undefined])).toEqual([])
    expect(versionChain(null, 'x')).toEqual([])
  })
})

describe('colour trust', () => {
  it('trusts a vector push from a vector tool', () => {
    expect(carriesTrueColour(asset({ source_app: 'illustrator', mime_type: 'image/svg+xml' })))
      .toBe(true)
    expect(carriesTrueColour(asset({ source_app: 'figma', mime_type: 'application/pdf' })))
      .toBe(true)
  })

  it('does not trust a raster export, whatever drew it', () => {
    // Phase 6's warning: a checker that cries wolf is worse than none. A PNG
    // from Illustrator has been through a rasteriser and may be colour-managed
    // on the way out.
    expect(carriesTrueColour(asset({ source_app: 'illustrator', mime_type: 'image/png' })))
      .toBe(false)
  })

  it('does not trust a photographic mockup', () => {
    expect(carriesTrueColour(asset({ source_app: 'photoshop', mime_type: 'image/jpeg' })))
      .toBe(false)
  })

  it('defaults to distrust for an unknown source', () => {
    // Asymmetric costs: trusting wrongly produces confident false findings on
    // every upload, distrusting wrongly produces one missing finding.
    expect(carriesTrueColour(asset({ source_app: 'sketch', mime_type: 'image/svg+xml' })))
      .toBe(false)
    expect(carriesTrueColour({})).toBe(false)
    expect(carriesTrueColour(null)).toBe(false)
  })
})

describe('vocabulary', () => {
  it('offers the four trimmed-MVP categories plus unfiled', () => {
    expect(ASSET_CATEGORIES.map((c) => c.id)).toEqual([
      'logo',
      'color',
      'type',
      'application',
      'other',
    ])
  })

  it('keeps every id slug-shaped, matching the CHECK constraints', () => {
    const slug = /^[a-z0-9][a-z0-9_-]{0,39}$/
    for (const c of ASSET_CATEGORIES) expect(c.id).toMatch(slug)
    for (const a of SOURCE_APPS) expect(a.id).toMatch(slug)
  })

  it('labels every source app, so no raw slug reaches the screen', () => {
    for (const a of SOURCE_APPS) expect(a.label).toBeTruthy()
  })
})
