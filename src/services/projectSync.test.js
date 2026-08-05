import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The mock is hoisted, so the shape lives in a factory. Each test rewires
   `mockState` rather than re-mocking the module. */
const mockState = {
  configured: true,
  user: { id: 'user-1' },
  tables: {},
}

vi.mock('../lib/supabase.js', () => {
  /* A minimal PostgREST-shaped stub. Each from(table) call reads its script
     from mockState.tables[table] — an array of results consumed in order —
     so a test declares the conversation it expects and anything off-script
     fails loudly. */
  const nextResult = (table) => {
    const script = mockState.tables[table] || []
    if (!script.length) {
      throw new Error(`unscripted call to from("${table}")`)
    }
    return script.shift()
  }
  const builder = (table) => {
    const b = {
      select: () => b,
      insert: () => b,
      upsert: () => b,
      eq: () => b,
      limit: () => b,
      maybeSingle: () => Promise.resolve(nextResult(table)),
      single: () => Promise.resolve(nextResult(table)),
    }
    return b
  }
  return {
    isSupabaseConfigured: () => mockState.configured,
    supabase: {
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: mockState.user } }),
      },
      from: (table) => builder(table),
    },
  }
})

const { pushProject, projectToCloudData } = await import('./projectSync.js')

beforeEach(() => {
  mockState.configured = true
  mockState.user = { id: 'user-1' }
  mockState.tables = {}
})

describe('projectToCloudData', () => {
  it('strips the private work log and keeps everything else', () => {
    const p = { id: '1', name: 'X', workLog: [{ min: 90 }], tasks: [1] }
    const out = projectToCloudData(p)
    expect(out.workLog).toBeUndefined()
    expect(out.tasks).toEqual([1])
    // and the original is untouched — this is a copy, not a mutation
    expect(p.workLog).toEqual([{ min: 90 }])
  })
})

describe('pushProject failure paths', () => {
  it('refuses cleanly when cloud is not configured', async () => {
    mockState.configured = false
    const r = await pushProject({ id: 'p1', name: 'X' })
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/not configured/i)
  })

  it('refuses cleanly with no project', async () => {
    const r = await pushProject(null)
    expect(r.ok).toBe(false)
  })

  it('asks for sign-in rather than failing opaquely', async () => {
    mockState.user = null
    const r = await pushProject({ id: 'p1', name: 'X' })
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/sign in/i)
  })

  it('surfaces a database error as a reason, not a throw', async () => {
    mockState.tables = {
      clients: [{ data: null, error: { message: 'boom' } }],
    }
    const r = await pushProject({ id: 'p1', name: 'X' })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('boom')
  })
})

describe('pushProject round trip', () => {
  it('creates client → brand → project when none exist', async () => {
    mockState.tables = {
      clients: [
        { data: null, error: null }, // select finds nothing
        { data: { id: 'c1' }, error: null }, // insert
      ],
      brands: [
        { data: null, error: null },
        { data: { id: 'b1' }, error: null },
      ],
      projects: [{ data: { id: 'row-1' }, error: null }],
    }
    const r = await pushProject({ id: 'p1', name: 'Sparrow' })
    expect(r).toEqual({ ok: true, projectRowId: 'row-1' })
    // every scripted call was consumed — nothing skipped, nothing extra
    expect(mockState.tables.clients).toHaveLength(0)
    expect(mockState.tables.brands).toHaveLength(0)
    expect(mockState.tables.projects).toHaveLength(0)
  })

  it('reuses existing client and brand rows on a second push', async () => {
    mockState.tables = {
      clients: [{ data: { id: 'c1' }, error: null }],
      brands: [{ data: { id: 'b1' }, error: null }],
      projects: [{ data: { id: 'row-1' }, error: null }],
    }
    const r = await pushProject({ id: 'p1', name: 'Sparrow' })
    expect(r.ok).toBe(true)
    expect(mockState.tables.clients).toHaveLength(0)
  })
})
