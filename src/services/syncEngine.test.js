import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockState = {
  configured: true,
  user: { id: 'user-1' },
  /** from(table) reads scripted results in order, keyed by table. */
  tables: {},
  /** every insert body lands here so tests can assert retention ORDER */
  inserts: [],
}

vi.mock('../lib/supabase.js', () => {
  const nextResult = (table) => {
    const script = mockState.tables[table] || []
    if (!script.length) throw new Error(`unscripted call to from("${table}")`)
    return script.shift()
  }
  const builder = (table) => {
    const b = {
      select: () => b,
      insert: (body) => {
        mockState.inserts.push({ table, body })
        return b
      },
      upsert: (body) => {
        mockState.inserts.push({ table, body, upsert: true })
        return b
      },
      eq: () => b,
      order: () => b,
      limit: () => b,
      maybeSingle: () => Promise.resolve(nextResult(table)),
      single: () => Promise.resolve(nextResult(table)),
      then: (res, rej) => Promise.resolve(nextResult(table)).then(res, rej),
    }
    return b
  }
  return {
    isSupabaseConfigured: () => mockState.configured,
    supabase: {
      auth: {
        getUser: () => Promise.resolve({ data: { user: mockState.user } }),
      },
      from: (table) => builder(table),
    },
  }
})

const { decideSyncAction, docHash, syncAllProjects } =
  await import('./syncEngine.js')
const { projectToCloudData } = await import('./projectSync.js')

/* The unit env is node — no jsdom (vitest.config sets environment: 'node').
   The engine itself only touches window/navigator behind guards, so a
   map-backed stand-in is all the tests need. */
const store = new Map()
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
}
const setMeta = (obj) =>
  window.localStorage.setItem('cc-project-sync-meta-v1', JSON.stringify(obj))

/* navigator exists in modern Node and its global is getter-only — redefine
   the property instead of assigning the global. */
const setOnline = (v) =>
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: v },
    configurable: true,
  })

beforeEach(() => {
  mockState.configured = true
  mockState.user = { id: 'user-1' }
  mockState.tables = {}
  mockState.inserts = []
  store.clear()
  setOnline(true)
})

describe('decideSyncAction — the four-way table', () => {
  const doc = { id: 'p1', name: 'X', brief: 'hello' }
  const metaFor = (d, updatedAt) => ({
    docHash: docHash(d),
    remoteUpdatedAt: updatedAt,
  })

  it('local only → push', () => {
    expect(decideSyncAction(doc, undefined, null)).toBe('push')
  })

  it('remote only → pull', () => {
    expect(decideSyncAction(null, undefined, { updated_at: 't1' })).toBe('pull')
  })

  it('neither → none', () => {
    expect(decideSyncAction(null, undefined, null)).toBe('none')
  })

  it('both, nothing changed → none', () => {
    expect(
      decideSyncAction(doc, metaFor(doc, 't1'), { updated_at: 't1' }),
    ).toBe('none')
  })

  it('desk edited, cloud still → push', () => {
    const edited = { ...doc, brief: 'edited' }
    expect(
      decideSyncAction(edited, metaFor(doc, 't1'), { updated_at: 't1' }),
    ).toBe('push')
  })

  it('cloud moved, desk clean → pull', () => {
    expect(
      decideSyncAction(doc, metaFor(doc, 't1'), { updated_at: 't2' }),
    ).toBe('pull')
  })

  it('both moved → conflict', () => {
    const edited = { ...doc, brief: 'edited' }
    expect(
      decideSyncAction(edited, metaFor(doc, 't1'), { updated_at: 't2' }),
    ).toBe('conflict')
  })

  it('no meta at all with both sides present → conflict (never guess)', () => {
    // First contact between an existing desk and an existing row: we cannot
    // know which is newer, so both count as changed and the cloud copy gets
    // retained before anything is overwritten.
    expect(decideSyncAction(doc, undefined, { updated_at: 't1' })).toBe(
      'conflict',
    )
  })
})

describe('syncAllProjects', () => {
  it('conflict: retains the cloud copy BEFORE pushing the desk copy', async () => {
    const local = { id: 'p1', name: 'Desk version', brief: 'local edit' }
    // meta says: last sync saw hash(other doc) and updated_at t1
    setMeta({ p1: { docHash: 'stale', remoteUpdatedAt: 't1' } })
    mockState.tables = {
      projects: [
        // 1. the select of remote rows
        {
          data: [
            {
              id: 'row-1',
              local_id: 'p1',
              name: 'Cloud version',
              data: { id: 'p1', name: 'Cloud version' },
              updated_at: 't2',
            },
          ],
          error: null,
        },
        // 4-6. pushProject: client select → brand select → upsert
        // (see clients/brands scripts below), then refreshedMeta select
      ],
      project_conflicts: [{ data: null, error: null }], // 2. retention insert
      clients: [{ data: { id: 'c1' }, error: null }],
      brands: [{ data: { id: 'b1' }, error: null }],
    }
    // pushProject's project upsert + refreshedMeta read
    mockState.tables.projects.push({ data: { id: 'row-1' }, error: null })
    mockState.tables.projects.push({ data: { updated_at: 't3' }, error: null })

    const setProjects = vi.fn()
    const r = await syncAllProjects({
      getProjects: () => [local],
      setProjects,
    })

    expect(r.ok).toBe(true)
    expect(r.conflicts).toBe(1)

    // THE ordering assertion: the retention insert must precede the winning
    // upsert. If this ever flips, the rule is lossy and the phase is failed.
    const tables = mockState.inserts.map((i) => i.table)
    expect(tables.indexOf('project_conflicts')).toBeGreaterThanOrEqual(0)
    expect(tables.indexOf('project_conflicts')).toBeLessThan(
      tables.findIndex(
        (t, i) => t === 'projects' && mockState.inserts[i].upsert,
      ),
    )
    // and the retained document is the CLOUD copy, marked as the loser
    const kept = mockState.inserts.find((i) => i.table === 'project_conflicts')
    expect(kept.body.losing_side).toBe('remote')
    expect(kept.body.data).toEqual({ id: 'p1', name: 'Cloud version' })
  })

  it('if retention fails, nothing is pushed — the desk does NOT overwrite', async () => {
    const local = { id: 'p1', name: 'Desk version' }
    setMeta({ p1: { docHash: 'stale', remoteUpdatedAt: 't1' } })
    mockState.tables = {
      projects: [
        {
          data: [
            {
              id: 'row-1',
              local_id: 'p1',
              name: 'Cloud',
              data: {},
              updated_at: 't2',
            },
          ],
          error: null,
        },
      ],
      project_conflicts: [{ data: null, error: { message: 'insert denied' } }],
    }
    const r = await syncAllProjects({
      getProjects: () => [local],
      setProjects: vi.fn(),
    })
    expect(r.ok).toBe(false)
    // no project upsert ever happened
    expect(
      mockState.inserts.filter((i) => i.table === 'projects'),
    ).toHaveLength(0)
  })

  it('pull keeps the device-local work log', async () => {
    const local = { id: 'p1', name: 'Old', workLog: [{ min: 45 }] }
    const cloudShape = projectToCloudData(local)
    setMeta({
      p1: { docHash: docHash(cloudShape), remoteUpdatedAt: 't1' },
    })
    mockState.tables = {
      projects: [
        {
          data: [
            {
              id: 'row-1',
              local_id: 'p1',
              name: 'Newer cloud',
              data: { id: 'p1', name: 'Newer cloud' },
              updated_at: 't2',
            },
          ],
          error: null,
        },
      ],
    }
    let applied
    const r = await syncAllProjects({
      getProjects: () => [local],
      setProjects: (p) => {
        applied = p
      },
    })
    expect(r.ok).toBe(true)
    expect(r.pulled).toBe(1)
    expect(applied[0].name).toBe('Newer cloud')
    expect(applied[0].workLog).toEqual([{ min: 45 }]) // never lost, never uploaded
  })

  it('a project that only exists in the cloud appears locally', async () => {
    mockState.tables = {
      projects: [
        {
          data: [
            {
              id: 'row-9',
              local_id: 'p9',
              name: 'From another desk',
              data: { id: 'p9', name: 'From another desk' },
              updated_at: 't5',
            },
          ],
          error: null,
        },
      ],
    }
    let applied
    const r = await syncAllProjects({
      getProjects: () => [],
      setProjects: (p) => {
        applied = p
      },
    })
    expect(r.ok).toBe(true)
    expect(applied).toHaveLength(1)
    expect(applied[0].id).toBe('p9')
  })

  it('reports offline as offline, not as failure', async () => {
    setOnline(false)
    const r = await syncAllProjects({
      getProjects: () => [],
      setProjects: vi.fn(),
    })
    expect(r.reason).toBe('offline')
  })
})

describe('retainCurrentVersion — the recovery path has a safety net too', () => {
  /* Regression guard for a defect found by review on 2026-08-05.
     "Bring back" replaces the local copy, which makes it dirty while the
     remote is unchanged — so the next sync decides `push`, not `conflict`,
     and the version being replaced was overwritten with NOTHING retained.
     The one operation offered as recovery was the only one with no safety
     net, which inverts the argument the whole conflict rule rests on. */
  it('keeps the current version as the local-side loser', async () => {
    mockState.tables = {
      projects: [{ data: { id: 'row-1' }, error: null }],
      project_conflicts: [{ data: null, error: null }],
    }
    const { retainCurrentVersion } = await import('./syncEngine.js')
    const r = await retainCurrentVersion({
      id: 'p1',
      name: 'About to be replaced',
      workLog: [{ min: 10 }],
    })
    expect(r.ok).toBe(true)
    const kept = mockState.inserts.find((i) => i.table === 'project_conflicts')
    expect(kept.body.losing_side).toBe('local')
    expect(kept.body.project_row_id).toBe('row-1')
    // the private work log is not uploaded, even onto the safety net
    expect(kept.body.data.workLog).toBeUndefined()
  })

  it('reports failure so the caller can refuse to replace anything', async () => {
    mockState.tables = {
      projects: [{ data: { id: 'row-1' }, error: null }],
      project_conflicts: [{ data: null, error: { message: 'denied' } }],
    }
    const { retainCurrentVersion } = await import('./syncEngine.js')
    const r = await retainCurrentVersion({ id: 'p1', name: 'X' })
    expect(r.ok).toBe(false)
  })
})
