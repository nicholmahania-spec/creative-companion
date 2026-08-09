import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * A DELETED PROJECT IS NOT A SYNC CANDIDATE.
 *
 * `runSync` built its work set as the plain union of local and remote ids.
 * A project deleted on this desk is `local = null, remote = present`, which
 * `decideSyncAction` reads as "the cloud has something this desk has not
 * seen" and pulls straight back in — and since nothing anywhere deletes a
 * project row, the remote copy is permanent. The project returned on every
 * sync, three seconds after each delete, for ever.
 *
 * Filtering the RESULT would have closed the pull and left the push open: a
 * stale copy on a second device would keep re-uploading the project. So the
 * id is removed from the work set itself, which settles both directions with
 * one rule.
 *
 * These drive the REAL engine against a scripted Supabase, not a stand-in for
 * it — the decision logic under test is the shipped `runSync`.
 */

const mockState = { configured: true, user: { id: 'user-1' }, tables: {}, inserts: [] }

vi.mock('../lib/supabase.js', () => {
  const nextResult = (table) => {
    const script = mockState.tables[table] || []
    if (!script.length) throw new Error(`unscripted call to from("${table}")`)
    return script.shift()
  }
  const builder = (table) => {
    const b = {
      select: () => b,
      insert: (body) => { mockState.inserts.push({ table, body }); return b },
      upsert: (body) => { mockState.inserts.push({ table, body, upsert: true }); return b },
      eq: () => b, order: () => b, limit: () => b,
      maybeSingle: () => Promise.resolve(nextResult(table)),
      single: () => Promise.resolve(nextResult(table)),
      then: (res, rej) => Promise.resolve(nextResult(table)).then(res, rej),
    }
    return b
  }
  return {
    isSupabaseConfigured: () => mockState.configured,
    supabase: {
      auth: { getUser: () => Promise.resolve({ data: { user: mockState.user } }) },
      from: (table) => builder(table),
    },
  }
})

const { syncAllProjects } = await import('./syncEngine.js')

const store = new Map()
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
}
/* navigator exists in modern Node and its global is getter-only — redefine
   the property rather than assigning it, same as syncEngine.test.js. */
const setOnline = (v) =>
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: v },
    configurable: true,
  })
setOnline(true)

/** One remote row for `localId`, as the select returns it. */
const remoteRow = (localId, name = 'Cloud copy') => ({
  id: `row-${localId}`,
  local_id: localId,
  name,
  data: { id: localId, name },
  updated_at: 't2',
})

beforeEach(() => {
  store.clear()
  mockState.tables = {}
  mockState.inserts = []
  mockState.user = { id: 'user-1' }
  setOnline(true)
})

describe('a tombstoned project is pulled by nobody', () => {
  it('does not come back when the remote row still exists', async () => {
    /* The exact reported situation: deleted here, still in public.projects. */
    mockState.tables = { projects: [{ data: [remoteRow('p1')], error: null }] }
    const setProjects = vi.fn()

    const r = await syncAllProjects({
      getProjects: () => [],
      setProjects,
      getDeletedProjects: () => [{ id: 'p1', at: '2026-08-09T00:00:00.000Z' }],
    })

    expect(r.ok).toBe(true)
    expect(r.pulled).toBe(0)
    /* Not "pulled then filtered" — never a candidate, so nothing was written
       back to the desk at all. */
    expect(setProjects).not.toHaveBeenCalled()
  })

  it('DOES come back when there is no tombstone — the engine still works', async () => {
    mockState.tables = { projects: [{ data: [remoteRow('p1')], error: null }] }
    const setProjects = vi.fn()

    const r = await syncAllProjects({
      getProjects: () => [],
      setProjects,
      getDeletedProjects: () => [],
    })

    expect(r.pulled).toBe(1)
    expect(setProjects).toHaveBeenCalled()
    expect(setProjects.mock.calls[0][0].map((p) => p.id)).toEqual(['p1'])
  })

  it('matches a tombstone written with a different id type', async () => {
    /* Ids are numbers on old projects and strings on new ones, and the cloud
       round trip goes through JSON. */
    mockState.tables = { projects: [{ data: [remoteRow('1234')], error: null }] }
    const setProjects = vi.fn()
    const r = await syncAllProjects({
      getProjects: () => [],
      setProjects,
      getDeletedProjects: () => [{ id: 1234, at: 'x' }],
    })
    expect(r.pulled).toBe(0)
    expect(setProjects).not.toHaveBeenCalled()
  })
})

describe('a tombstoned project is pushed by nobody', () => {
  it('does not re-upload a stale local copy', async () => {
    /* Device B still holds the project locally and has just received the
       tombstone. Without the push side it would helpfully put the project
       back in the cloud, and Device A would pull it again. */
    mockState.tables = { projects: [{ data: [], error: null }] }
    const setProjects = vi.fn()

    const r = await syncAllProjects({
      getProjects: () => [{ id: 'p1', name: 'Stale local copy' }],
      setProjects,
      getDeletedProjects: () => [{ id: 'p1', at: 'x' }],
    })

    expect(r.ok).toBe(true)
    expect(r.pushed).toBe(0)
    /* No upsert reached the projects table — proof it never became a push
       candidate, rather than being pushed and then undone. */
    expect(mockState.inserts.filter((i) => i.table === 'projects')).toEqual([])
  })

  it('never opens a conflict for a deleted project', async () => {
    /* local present + remote present + both changed = 'conflict', which
       retains a copy and then pushes. A deleted project must not reach that
       branch at all: it would write a conflict row about a project the
       designer threw away. */
    mockState.tables = { projects: [{ data: [remoteRow('p1')], error: null }] }
    const r = await syncAllProjects({
      getProjects: () => [{ id: 'p1', name: 'Stale local' }],
      setProjects: vi.fn(),
      getDeletedProjects: () => [{ id: 'p1', at: 'x' }],
    })
    expect(r.conflicts).toBe(0)
    expect(mockState.inserts).toEqual([])
  })
})

describe('the deletion holds up over time', () => {
  it('survives sync after sync', async () => {
    const setProjects = vi.fn()
    for (let i = 0; i < 3; i += 1) {
      mockState.tables = { projects: [{ data: [remoteRow('p1')], error: null }] }
      const r = await syncAllProjects({
        getProjects: () => [],
        setProjects,
        getDeletedProjects: () => [{ id: 'p1', at: 'x' }],
      })
      expect(r.pulled).toBe(0)
    }
    expect(setProjects).not.toHaveBeenCalled()
  })

  it('leaves the surviving projects to sync normally', async () => {
    /* Deleting one project must not stop the others syncing. */
    mockState.tables = {
      projects: [{ data: [remoteRow('gone'), remoteRow('kept')], error: null }],
    }
    const setProjects = vi.fn()
    const r = await syncAllProjects({
      getProjects: () => [],
      setProjects,
      getDeletedProjects: () => [{ id: 'gone', at: 'x' }],
    })
    expect(r.pulled).toBe(1)
    expect(setProjects.mock.calls[0][0].map((p) => p.id)).toEqual(['kept'])
  })

  it('is safe when the caller passes no tombstones at all', async () => {
    /* An older caller — or SettingsView before it was wired — must not throw. */
    mockState.tables = { projects: [{ data: [], error: null }] }
    const r = await syncAllProjects({
      getProjects: () => [],
      setProjects: vi.fn(),
    })
    expect(r.ok).toBe(true)
  })
})

describe('offline deletion', () => {
  it('reports offline and changes nothing', async () => {
    setOnline(false)
    const setProjects = vi.fn()
    const r = await syncAllProjects({
      getProjects: () => [],
      setProjects,
      getDeletedProjects: () => [{ id: 'p1', at: 'x' }],
    })
    /* The deletion is already durable in local state; the engine simply has
       nothing to say until the connection returns. */
    expect(r.reason).toBe('offline')
    expect(setProjects).not.toHaveBeenCalled()
  })

  it('still refuses to resurrect once the connection returns', async () => {
    setOnline(true)
    mockState.tables = { projects: [{ data: [remoteRow('p1')], error: null }] }
    const setProjects = vi.fn()
    const r = await syncAllProjects({
      getProjects: () => [],
      setProjects,
      getDeletedProjects: () => [{ id: 'p1', at: 'x' }],
    })
    expect(r.pulled).toBe(0)
    expect(setProjects).not.toHaveBeenCalled()
  })
})
