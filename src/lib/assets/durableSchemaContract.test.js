import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { createAssetStorage } from './assetStorage.js'
import { assetStorageKey, MAX_ASSET_BYTES } from './assetLibrary.js'

/**
 * WHAT THE APP SENDS versus WHAT THE DATABASE DECLARES.
 *
 * The durable Asset Library boundary is tested elsewhere against a mock
 * Supabase client, and a mock accepts every column name it is handed. That is
 * how the only production-wired durable asset path came to be incapable of a
 * single successful write while the suite stayed green: nothing in the tree
 * had ever compared the insert to the migration.
 *
 * So this file makes that comparison mechanically, by reading the SQL. It
 * started as a characterization test recording the divergence; remediation
 * pass 1 closed it, and the assertions are now the contract. They still read
 * the migrations rather than restating them, which is the point — a column
 * dropped from the schema, or added to the writer, turns this red without
 * anyone having to remember that these two files are related.
 */

const MIGRATION = new URL(
  '../../../supabase/migrations/20260806120000_asset_library.sql',
  import.meta.url
)
/**
 * Where `role` and `origin` were actually added.
 *
 * This file is the RECOVERED canonical migration, not a later re-statement of
 * it. The audit found the two columns missing from the repo and a Pass 1
 * migration was written to add them — then a provenance investigation found
 * they had already been applied to the live database on 2026-08-10 by
 * `20260810110000_asset_roles`, which had never been committed. Its DDL was
 * recovered verbatim from `supabase_migrations.schema_migrations` and adopted;
 * the Pass 1 migration was deleted rather than reconciled, because two
 * migrations authoring one schema change is how a schema acquires two
 * histories.
 *
 * So the repo now records what the database actually did, and these tests
 * assert THAT — not what a second author would have preferred.
 */
const ROLE_ORIGIN_MIGRATION = new URL(
  '../../../supabase/migrations/20260810110000_asset_roles.sql',
  import.meta.url
)
const PROJECTS_MIGRATION = new URL(
  '../../../supabase/migrations/20260805120000_clients_brands_projects.sql',
  import.meta.url
)

const TYPES = 'uuid|text|bigint|integer|timestamptz'

/**
 * Every column `public.assets` has after all migrations that touch it.
 *
 * Reads the create-table body AND the later `alter table … add column`, so a
 * column added in a follow-up migration counts exactly as much as one declared
 * at the start. Anything less would have made this test pass again the moment
 * someone declared the columns in the wrong place.
 */
function declaredAssetColumns() {
  const columns = new Set()

  const sql = readFileSync(MIGRATION, 'utf8')
  const start = sql.indexOf('create table public.assets (')
  expect(start).toBeGreaterThan(-1)
  const body = sql.slice(start, sql.indexOf('\n);', start))
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('--')) continue
    /* A column definition opens a line with an identifier followed by a type.
       `constraint …` and `create table …` are not columns. */
    const m = new RegExp(`^([a-z_][a-z0-9_]*)\\s+(${TYPES})\\b`).exec(line)
    if (m && m[1] !== 'constraint') columns.add(m[1])
  }

  const altered = readFileSync(ROLE_ORIGIN_MIGRATION, 'utf8')
  const alterAt = altered.indexOf('alter table public.assets')
  expect(alterAt).toBeGreaterThan(-1)
  const alterBody = altered.slice(alterAt, altered.indexOf(';', alterAt))
  for (const m of alterBody.matchAll(
    new RegExp(`add column if not exists\\s+([a-z_][a-z0-9_]*)\\s+(${TYPES})\\b`, 'g')
  )) {
    columns.add(m[1])
  }

  return columns
}

const LOCAL_PROJECT_ID = '1754000000000-ab12x'
const PROJECT_UUID = '22222222-2222-4222-8222-222222222222'

/** The row `createAssetStorage().save()` actually inserts. */
async function insertedRow() {
  let inserted = null
  const bucket = {
    upload: async () => ({ error: null }),
    remove: async () => ({ error: null }),
  }
  const chain = (name) => {
    const self = {
      select: () => self,
      eq: () => self,
      maybeSingle: async () =>
        name === 'projects' ? { data: { id: PROJECT_UUID }, error: null } : { data: null, error: null },
      insert: async (row) => {
        inserted = row
        return { error: null }
      },
    }
    return self
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'owner-1' } }, error: null }) },
    storage: { from: () => bucket },
    from: (name) => chain(name),
  }
  await createAssetStorage(client).save(
    {
      id: '11111111-1111-4111-8111-111111111111',
      project_id: LOCAL_PROJECT_ID,
      name: 'Client logo',
      category: 'logo',
      source_app: 'brief',
      source_ref: 'https://example.test/logo.png',
      mime_type: 'image/png',
      byte_size: 10,
      width: null,
      height: null,
      status: 'draft',
      approved_at: null,
      replaces_id: null,
      role: 'source',
      origin: 'client',
    },
    { name: 'logo.png' }
  )
  return inserted || {}
}

describe('the durable insert against the shipped schema', () => {
  it('names only columns the assets table declares', async () => {
    const declared = declaredAssetColumns()
    const sent = Object.keys(await insertedRow())
    /* PostgREST answers an unknown column with PGRST204 rather than ignoring
       it, so a divergence here is a hard insert failure — and one that
       happens AFTER the bytes are uploaded, so it also leaves an orphan
       object behind. `role` and `origin` were the two that diverged. */
    expect(sent.filter((c) => !declared.has(c))).toEqual([])
    expect(sent).toContain('role')
    expect(sent).toContain('origin')
  })

  it('role and origin carry the same closed vocabularies on both sides', () => {
    /* A CHECK the app does not know about turns a normal push into a 23514;
       an app vocabulary the CHECK does not know about turns it into rejected
       work. Read from both files rather than restated here, so widening one
       side alone fails. */
    const sql = readFileSync(ROLE_ORIGIN_MIGRATION, 'utf8')
    const lib = readFileSync(new URL('./assetLibrary.js', import.meta.url), 'utf8')

    const roles = /check \(role in \(([^)]*)\)\)/.exec(sql)[1]
    for (const value of ['source', 'produced']) {
      expect(roles).toContain(`'${value}'`)
      expect(lib).toContain(`'${value}'`)
    }
    const origins = /check \(origin in \(([^)]*)\)\)/.exec(sql)[1]
    for (const value of ['client', 'designer', 'imported']) {
      expect(origins).toContain(`'${value}'`)
      expect(lib).toContain(`'${value}'`)
    }
  })

  it('keeps the canonical column defaults: source, and imported', () => {
    /* THE ONE VALUE THIS FILE EXISTS TO PIN.

       `origin` defaults to 'imported', NOT 'client', and the live migration
       says why in its own words: "Preserve them conservatively as imported
       source material so no legacy upload can become deliverable merely by
       receiving a schema default." A row whose provenance nobody can prove is
       not attributed to the client — it is marked as having come from
       somewhere, which is the only honest thing a default can say about a row
       it has never seen.

       A Pass 1 migration briefly declared 'client' here, reasoning that such a
       row would have come through `normaliseIngest`. That reasoning is not
       wrong about the app; it is wrong about the column, whose default exists
       precisely for rows the app did not write. This test fails if anyone
       moves it back. */
    const sql = readFileSync(ROLE_ORIGIN_MIGRATION, 'utf8')
    expect(sql).toMatch(/role text not null default 'source'/)
    expect(sql).toMatch(/origin text not null default 'imported'/)
    expect(sql).not.toMatch(/origin text not null default 'client'/)
  })

  it('preserves the conservative backfill for rows that predate the columns', () => {
    /* `not null default` alone would classify existing rows silently. The
       explicit UPDATE is what makes the classification a decision on the
       record rather than a side effect of DDL. */
    const sql = readFileSync(ROLE_ORIGIN_MIGRATION, 'utf8')
    expect(sql).toMatch(/update public\.assets/)
    expect(sql).toMatch(/set role = 'source', origin = 'imported'/)
    expect(sql).toMatch(/where role is null or origin is null/)
  })

  it('authors the checks inline, which is what produced the live constraint names', () => {
    /* Live carries `assets_role_check` and `assets_origin_check` — Postgres's
       automatic names for a CHECK written inline on the column. Naming them
       explicitly would produce DIFFERENT constraints, so a repo migration that
       "tidied" them would author a second pair alongside the live ones rather
       than describing them. The historical form is the correct form. */
    const sql = readFileSync(ROLE_ORIGIN_MIGRATION, 'utf8')
    expect(sql).toMatch(/add column if not exists role text not null default 'source'\s*\n\s*check \(role in/)
    expect(sql).toMatch(/add column if not exists origin text not null default 'imported'\s*\n\s*check \(origin in/)
    /* No separately-named constraints, and no second implementation of the
       same change anywhere in the migration set. */
    expect(sql).not.toMatch(/add constraint/)
    expect(sql).not.toMatch(/assets_role_known|assets_origin_known/)
  })

  it('carries the brand-assets mime update that shipped with it', () => {
    /* Part of the same applied migration. Dropping it from the repo copy would
       make the file a partial account of what the database did. */
    const sql = readFileSync(ROLE_ORIGIN_MIGRATION, 'utf8')
    expect(sql).toMatch(/update storage\.buckets/)
    expect(sql).toMatch(/where id = 'brand-assets'/)
    expect(sql).toMatch(/'image\/svg\+xml', 'application\/pdf'/)
  })

  it('is the only migration that adds role or origin to assets', () => {
    /* The reconciliation this file records: one schema change, one migration.
       A second file adding the same columns — however guarded — gives the
       schema two histories and, on a database that already has the columns,
       authors duplicate CHECK constraints. */
    const dir = new URL('../../../supabase/migrations/', import.meta.url)
    const authors = readdirSync(dir).filter((name) => {
      if (!name.endsWith('.sql')) return false
      const sql = readFileSync(new URL(name, dir), 'utf8')
      return /add column if not exists (role|origin) text/.test(sql)
    })
    expect(authors).toEqual(['20260810110000_asset_roles.sql'])
  })

  it('the app default and the column default answer different questions', () => {
    /* They DIVERGE, deliberately, and that is worth pinning so neither side
       drifts on the assumption they should match.

       `DEFAULT_ASSET_ORIGIN` is what `normaliseIngest` stamps when a PUSH does
       not say — and a push that does not say came through this app's own
       intake, where 'client' is the honest reading. The COLUMN default is what
       a row inserted without the field means, which is a row this app did not
       write; there, 'imported' is the honest reading. The app never omits the
       column, so the two never contend at runtime.

       `role` agrees on both sides at 'source', and that is not an
       inconsistency — it is the same answer to both questions. */
    const sql = readFileSync(ROLE_ORIGIN_MIGRATION, 'utf8')
    const lib = readFileSync(new URL('./assetLibrary.js', import.meta.url), 'utf8')

    expect(sql).toMatch(/role text not null default 'source'/)
    expect(lib).toContain("DEFAULT_ASSET_ROLE = 'source'")

    expect(sql).toMatch(/origin text not null default 'imported'/)
    expect(lib).toContain("DEFAULT_ASSET_ORIGIN = 'client'")

    /* And the divergence is only ever between two members of one vocabulary. */
    expect(lib).toContain("ASSET_ORIGINS = ['client', 'designer', 'imported']")
  })

  it('the narrow Brief lookup filters on columns that now exist', () => {
    const src = readFileSync(new URL('./assetStorage.js', import.meta.url), 'utf8')
    const declared = declaredAssetColumns()
    const filtered = [...src.matchAll(/\.eq\('([a-z_]+)'/g)].map((m) => m[1])
    expect(filtered).toContain('role')
    expect(filtered).toContain('origin')
    /* `local_id` and `owner_id` are filters against `projects`, not `assets`,
       so they are excluded before the comparison. */
    const onAssets = filtered.filter((c) => !['local_id', 'owner_id'].includes(c))
    expect(onAssets.filter((c) => !declared.has(c))).toEqual([])
  })

  it('sends the cloud project uuid, never the local project id', async () => {
    const sql = readFileSync(MIGRATION, 'utf8')
    expect(sql).toMatch(/project_id\s+uuid\s+not null/)

    /* Local ids are `${Date.now()}-${base36}` (createBlankProject), which is
       not a uuid — Postgres answers 22P02 before RLS is even consulted. The
       cloud keeps the local value in `projects.local_id`, and that mapping is
       the one the writer now resolves through. */
    const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    expect(uuidShape.test(LOCAL_PROJECT_ID)).toBe(false)

    const row = await insertedRow()
    expect(row.project_id).toBe(PROJECT_UUID)
    expect(uuidShape.test(row.project_id)).toBe(true)

    const projectsSql = readFileSync(PROJECTS_MIGRATION, 'utf8')
    expect(projectsSql).toMatch(/local_id text/)
  })

  it('scopes the durable lookup by owner as well as local id', () => {
    /* `projects.local_id` is unique per OWNER, not globally. A lookup that
       forgot the owner would be a client-side authorization decision, and
       could resolve another account's project id. */
    const src = readFileSync(new URL('./assetStorage.js', import.meta.url), 'utf8')
    const lookup = src.slice(src.indexOf('async function durableProjectId'))
    expect(lookup).toContain(".eq('owner_id', ownerId)")
    expect(lookup).toContain(".eq('local_id', key)")
  })

  it('keeps the client-side ceiling in step with the bucket ceiling', () => {
    /* The module header names the database as the real limit and this file as
       the fast readable one — "a client-side check that a server does not also
       enforce is decoration". That only holds while the two numbers agree, and
       they can drift silently in either direction: raise the constant alone
       and the designer is told a 60 MB file is fine right up until Storage
       refuses it; raise the bucket alone and the app turns away a file the
       server would have taken.

       Parsed from the SQL rather than string-matched, so this compares the
       actual bucket ceiling to the actual constant instead of noticing that
       the same digits appear in two files. */
    const sql = readFileSync(MIGRATION, 'utf8')
    const insert = sql.slice(sql.indexOf('insert into storage.buckets'))
    const declared = Number(/^\s*(\d{6,})\s*,\s*$/m.exec(insert)?.[1])

    expect(Number.isFinite(declared)).toBe(true)
    expect(MAX_ASSET_BYTES).toBe(declared)
    expect(MAX_ASSET_BYTES).toBe(50 * 1024 * 1024)
  })

  it('does not share its ceiling with the package panel, which owns a different one', () => {
    /* `ClientPackagePanel` declares its own `MAX_ASSET_BYTES` at 4 MB. Same
       name, different system, different reason: package bytes are data URLs
       inside the single localStorage blob, so their ceiling is a browser
       limit, while an Asset Library file goes to a bucket and its ceiling is
       the bucket's.

       They are NOT collapsed, and this test exists so nobody collapses them
       as a tidy-up. Importing one into the other would make the Asset Library
       govern what may enter a client package — the exact coupling the
       ownership contract forbids, arriving disguised as de-duplication. If
       the duplication is ever resolved it has to be by the workstream that
       owns packageAssets, and it has to keep the two numbers independent. */
    const panel = readFileSync(
      new URL('../../components/ClientPackagePanel.jsx', import.meta.url),
      'utf8'
    )
    expect(panel).toContain('const MAX_ASSET_BYTES = 4 * 1024 * 1024')
    expect(panel).not.toMatch(/from '.*assets\/assetLibrary/)
    expect(MAX_ASSET_BYTES).not.toBe(4 * 1024 * 1024)
  })

  it('builds the object key with the owner first, as every storage policy assumes', () => {
    const sql = readFileSync(MIGRATION, 'utf8')
    expect(sql).toContain("(storage.foldername(name))[1] = (auth.uid())::text")
    /* Asserted through the function rather than through its source text: the
       shape is what the policy depends on, and a source-string match breaks
       on any refactor while proving nothing about the output. */
    expect(
      assetStorageKey({
        ownerId: 'owner-1',
        projectId: PROJECT_UUID,
        assetId: '11111111-1111-4111-8111-111111111111',
        mimeType: 'image/png',
      })
    ).toBe(`owner-1/${PROJECT_UUID}/11111111-1111-4111-8111-111111111111.png`)
  })
})

describe('adoption is reported, not swallowed', () => {
  it('the call site says what happened', () => {
    /* Every failure lands in `failed[]` with a sentence explaining it. The
       single call site used to read `hydratedAssets`, `assets` and `links`
       and never `failed`, so the designer accepted a Brief, was told nothing,
       and kept a client's artwork on a public URL believing it had been filed
       privately. Silence is the one outcome the ingest path's own header
       forbids. */
    const app = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8')
    const call = app.slice(
      app.indexOf('const adopted = await adoptBriefAttachments('),
      app.indexOf('const portalSeen =')
    )
    expect(call).toContain('adoptionSummary(adopted)')
    expect(call).toContain('flashToast')
    /* `important: true` — a durable operation that did not complete is never
       a micro success, and it must survive quiet mode and batching. */
    expect(call).toContain('important: true')
  })
})
