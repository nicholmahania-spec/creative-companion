/**
 * ONE PORTAL, ONE PROJECT — the lifecycle that makes that true.
 *
 * `client_portals.project_local_id` records which project a link was made for.
 * Owner RLS stops another studio writing the row at all, and that was taken as
 * sufficient — but it says nothing about WHICH of this studio's projects is
 * publishing through the link, and the inbox's reconnect makes the two diverge
 * by design: it attaches an existing portal to whatever project is open, for a
 * link orphaned by a workspace import or a second machine.
 *
 * Before this pass the reconnect wrote only the local `clientPortalId`. The
 * server row went on naming a project that no longer existed here, and nothing
 * downstream could tell a legitimate reconnect from picking the wrong project
 * at the prompt — so `publishDelivery` would send one client's brand book
 * through another client's live link with no error anywhere.
 *
 * The fix is a lifecycle, not a check: reconnecting RE-STAMPS the row, and
 * publishing is scoped to both ids in one statement. A rebind that did not
 * happen shows up as a refused publish naming the fix, rather than as a
 * delivery to the wrong person.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockState = { configured: true, calls: [], result: { data: [{ id: 'p1' }], error: null } }

vi.mock('../supabase', () => {
  /* A PostgREST-shaped stub that RECORDS the chain. The assertions below are
     about which filters were applied, so a builder that quietly swallowed one
     would make this suite meaningless. */
  const builder = (table) => {
    const record = { table, filters: [], payload: null, op: '' }
    mockState.calls.push(record)
    const b = {
      update: (payload) => {
        record.op = 'update'
        record.payload = payload
        return b
      },
      insert: (payload) => {
        record.op = 'insert'
        record.payload = payload
        return b
      },
      select: () => b,
      single: () => Promise.resolve(mockState.result),
      eq: (col, val) => {
        record.filters.push([col, val])
        return b
      },
      then: (resolve, reject) =>
        Promise.resolve(mockState.result).then(resolve, reject),
    }
    return b
  }
  return {
    isSupabaseConfigured: () => mockState.configured,
    supabase: {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'owner-1' } } }) },
      from: (table) => builder(table),
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  }
})

const { publishDelivery } = await import('./brandDelivery')
const { rebindPortalToProject, createClientPortal } = await import('./clientPortal')

const filtersOf = (i = 0) => Object.fromEntries(mockState.calls[i].filters)
const PACK = { projectName: 'Sparrow', palette: ['#1B4C7E'] }

beforeEach(() => {
  mockState.configured = true
  mockState.calls = []
  mockState.result = { data: [{ id: 'portal-1' }], error: null }
})

describe('a portal is stamped with its project from the start', () => {
  it('records the project it was created for', async () => {
    mockState.result = { data: { id: 'portal-1' }, error: null }
    await createClientPortal({
      projectLocalId: '1699-abc',
      clientName: 'Dana',
      detectiveAnswers: {},
    })
    expect(mockState.calls[0].payload.project_local_id).toBe('1699-abc')
  })
})

describe('publishing is scoped to the project, not only the link', () => {
  it('sends when the portal belongs to the project', async () => {
    const r = await publishDelivery('portal-1', { pack: PACK, projectLocalId: '1699-abc' })
    expect(r.ok).toBe(true)
    expect(filtersOf()).toEqual({ id: 'portal-1', project_local_id: '1699-abc' })
  })

  /* The row exists and the studio owns it — RLS is satisfied — and the write
     still matches nothing, because the second filter does not. Postgres decides
     this, not a JavaScript comparison that could be skipped. */
  it('refuses when the link belongs to a different project', async () => {
    mockState.result = { data: [], error: null }
    const r = await publishDelivery('portal-1', { pack: PACK, projectLocalId: 'other-project' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/belongs to a different project/i)
    /* And it says what to do about it — "try again" would be false here,
       because trying again does exactly nothing. */
    expect(r.error).toMatch(/Client activity/i)
  })

  it('refuses rather than publishing unguarded when no project is given', async () => {
    const r = await publishDelivery('portal-1', { pack: PACK })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/no project is open/i)
    // Nothing was sent — the refusal is before the write, not after it.
    expect(mockState.calls).toHaveLength(0)
  })

  it('scopes both ids in one statement, not read-then-write', async () => {
    await publishDelivery('portal-1', { pack: PACK, projectLocalId: '1699-abc' })
    expect(mockState.calls).toHaveLength(1)
    expect(mockState.calls[0].op).toBe('update')
    expect(mockState.calls[0].filters).toEqual([
      ['id', 'portal-1'],
      ['project_local_id', '1699-abc'],
    ])
  })

  /* Cross-account is not this layer's job and must not become it. The write
     carries no owner_id and no service-role escape — it is an ordinary
     authenticated update, so `Owners can update own client portals` is what
     stops another studio's row being touched. Asserting the absence keeps a
     future "fix" from smuggling in a bypass. */
  it('leaves cross-account isolation to RLS and does not reach around it', async () => {
    await publishDelivery('portal-1', { pack: PACK, projectLocalId: '1699-abc' })
    const { payload, filters } = mockState.calls[0]
    expect(payload).not.toHaveProperty('owner_id')
    expect(filters.map(([col]) => col)).not.toContain('owner_id')
  })
})

describe('reconnecting an orphaned portal rebinds it', () => {
  it('re-stamps the row to the chosen project', async () => {
    const r = await rebindPortalToProject('portal-1', '1699-abc')
    expect(r.ok).toBe(true)
    expect(mockState.calls[0].payload.project_local_id).toBe('1699-abc')
    expect(filtersOf()).toEqual({ id: 'portal-1' })
  })

  it('makes the portal publishable by the project it was linked to', async () => {
    await rebindPortalToProject('portal-1', 'new-project')
    const stamped = mockState.calls[0].payload.project_local_id
    mockState.calls = []
    const r = await publishDelivery('portal-1', { pack: PACK, projectLocalId: stamped })
    expect(r.ok).toBe(true)
    expect(filtersOf().project_local_id).toBe('new-project')
  })

  /* The rebind is the ONLY thing that moves a portal between projects, and it
     needs a project to move it to. A silent attach — the old behavior, local
     only — is what left the row disagreeing with the app. */
  it('cannot attach a portal with no project chosen', async () => {
    for (const bad of [null, undefined, '']) {
      const r = await rebindPortalToProject('portal-1', bad)
      expect(r.ok).toBe(false)
      expect(r.error).toMatch(/no project is open/i)
    }
    expect(mockState.calls, 'a rebind was attempted without a target').toHaveLength(0)
  })

  it('cannot attach without a portal to attach', async () => {
    const r = await rebindPortalToProject('', '1699-abc')
    expect(r.ok).toBe(false)
    expect(mockState.calls).toHaveLength(0)
  })

  /* A failed rebind must not read as success: the inbox handler aborts on it
     and leaves the local link alone, so the app never claims a binding the
     server did not record. */
  it('reports a server refusal rather than swallowing it', async () => {
    mockState.result = { data: null, error: { message: 'permission denied' } }
    const r = await rebindPortalToProject('portal-1', '1699-abc')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Couldn’t link it/i)
  })

  it('needs an account — an offline rebind is refused, not queued', async () => {
    mockState.configured = false
    const r = await rebindPortalToProject('portal-1', '1699-abc')
    expect(r.ok).toBe(false)
    expect(mockState.calls).toHaveLength(0)
  })
})
