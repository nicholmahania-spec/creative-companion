import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import useAppStore, {
  isTombstoned,
  withTombstone,
  PERSISTED_KEYS,
} from './useAppStore'
import versionService from '../services/versionService'

/**
 * DELETE MEANS DELETE EVERYWHERE.
 *
 * Removing a project from `projects` records only that THIS DEVICE does not
 * have it, which is indistinguishable from "this device has not received it
 * yet" — and the sync resolved that ambiguity in the project's favour. So the
 * deletion is stored as a fact of its own: a tombstone.
 *
 * It rides the workspace payload every other setting already travels in, so
 * there is no second transport and no schema change. The remote row is left
 * where it is; it is simply unreachable while its id is tombstoned.
 *
 * The one rule that makes it work: a tombstone is lifted by an explicit undo
 * and by nothing else. Not a pull, not a push, not a reload, not a migration.
 */

const s = () => useAppStore.getState()
const cur = () => s().deletedProjects || []
const tombIds = () => cur().map((d) => String(d.id))
const names = () => s().projects.map((p) => p.name)

function fakeLS() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}
const opts = () => useAppStore.persist.getOptions()
const rehydrate = (state) => opts().onRehydrateStorage()(state)
/** Everything persist does between a write and the next boot. */
const reload = (fromVersion = 9) => {
  const stored = JSON.parse(JSON.stringify(opts().partialize(s())))
  const next = { ...opts().migrate(stored, fromVersion) }
  rehydrate(next)
  return next
}

beforeEach(() => {
  globalThis.localStorage = fakeLS()
})
afterEach(() => {
  delete globalThis.localStorage
})

describe('the tombstone itself', () => {
  it('stores the id and the time, and nothing about the project', () => {
    const list = withTombstone([], 'p1', '2026-08-09T00:00:00.000Z')
    expect(list).toEqual([{ id: 'p1', at: '2026-08-09T00:00:00.000Z' }])
    /* No name, no brief, no contents. The project is being deleted, not
       archived — copying it here would be a second store of the thing we
       were asked to get rid of. */
    expect(Object.keys(list[0]).sort()).toEqual(['at', 'id'])
  })

  it('does not stack duplicates', () => {
    const once = withTombstone([], 'p1', 'a')
    expect(withTombstone(once, 'p1', 'b')).toBe(once)
  })

  it('compares ids the way the rest of the app does', () => {
    expect(isTombstoned([{ id: 1234 }], '1234')).toBe(true)
    expect(isTombstoned([{ id: '1234' }], 1234)).toBe(true)
    expect(isTombstoned([{ id: 'p1' }], 'p2')).toBe(false)
    expect(isTombstoned(undefined, 'p1')).toBe(false)
  })

  it('travels in the workspace payload', () => {
    /* Not a new transport — the list `partialize` and `exportAllData` share.
       workspaceRoundTrip.test.js fails if these two ever disagree. */
    expect(PERSISTED_KEYS).toContain('deletedProjects')
    s().clearToEmpty()
    expect(s().exportAllData()).toHaveProperty('deletedProjects')
  })
})

describe('deleting records the deletion', () => {
  beforeEach(() => {
    s().clearToEmpty()
  })

  it('tombstones the project it removed, and only that one', () => {
    s().createNewProject('Keep')
    const gone = s().createNewProject('Gone')
    s().deleteProject(gone.id)
    expect(names()).toEqual(['Keep'])
    expect(tombIds()).toEqual([String(gone.id)])
  })

  it('tombstones the last project too', () => {
    const only = s().createNewProject('Only')
    expect(s().deleteProject(only.id)).toMatchObject({ empty: true })
    expect(s().projects).toEqual([])
    expect(tombIds()).toEqual([String(only.id)])
  })

  it('survives a reload', () => {
    const gone = s().createNewProject('Gone')
    s().createNewProject('Keep')
    s().deleteProject(gone.id)
    const after = reload()
    expect(after.deletedProjects.map((d) => String(d.id))).toEqual([
      String(gone.id),
    ])
    expect(after.projects.map((p) => p.name)).toEqual(['Keep'])
  })

  it('survives repeated reloads', () => {
    const gone = s().createNewProject('Gone')
    s().createNewProject('Keep')
    s().deleteProject(gone.id)
    let out = reload()
    for (let i = 0; i < 3; i += 1) {
      useAppStore.setState({
        projects: out.projects,
        deletedProjects: out.deletedProjects,
        currentProjectId: out.currentProjectId ?? null,
      })
      out = reload()
    }
    expect(out.deletedProjects).toHaveLength(1)
  })

  it('records no tombstone when nothing was deleted', () => {
    s().createNewProject('Only')
    expect(s().deleteProject('no-such-id').ok).toBe(false)
    expect(cur()).toEqual([])
  })
})

describe('two devices', () => {
  beforeEach(() => {
    s().clearToEmpty()
  })

  /** Device A deletes; its payload is what B will pull. */
  function deviceADeletes() {
    s().createNewProject('Shared keep')
    const gone = s().createNewProject('Shared gone')
    s().deleteProject(gone.id)
    return {
      payload: JSON.parse(JSON.stringify(s().exportAllData())),
      goneId: String(gone.id),
    }
  }

  it('carries the deletion to the other device', () => {
    const { payload, goneId } = deviceADeletes()

    /* Device B: still has both projects and no tombstone. */
    s().clearToEmpty()
    s().createNewProject('Shared keep')
    s().createNewProject('Shared gone')
    expect(names()).toHaveLength(2)

    expect(s().hydrateFromPayload(payload).ok).toBe(true)
    expect(names()).toEqual(['Shared keep'])
    expect(tombIds()).toContain(goneId)
  })

  it('does not let a stale copy in the payload override a local tombstone', () => {
    /* The reverse direction: THIS device deleted the project, and the payload
       arriving from the other device still contains it because that device
       had not synced yet. A pull is not a restore. */
    s().clearToEmpty()
    s().createNewProject('Keep')
    const gone = s().createNewProject('Gone')
    const stale = JSON.parse(JSON.stringify(s().exportAllData()))
    s().deleteProject(gone.id)

    expect(s().hydrateFromPayload(stale).ok).toBe(true)
    expect(names()).toEqual(['Keep'])
    expect(tombIds()).toContain(String(gone.id))
  })

  it('unions tombstones rather than replacing them', () => {
    /* Each device deleted a different project while apart. Neither deletion
       may be lost when they meet. */
    s().clearToEmpty()
    s().createNewProject('A only')
    const aGone = s().createNewProject('A deleted')
    s().deleteProject(aGone.id)
    const fromA = JSON.parse(JSON.stringify(s().exportAllData()))

    s().clearToEmpty()
    s().createNewProject('B only')
    const bGone = s().createNewProject('B deleted')
    s().deleteProject(bGone.id)

    s().hydrateFromPayload(fromA)
    expect(tombIds().sort()).toEqual(
      [String(aGone.id), String(bGone.id)].sort()
    )
  })

  it('leaves a workspace with no tombstones working exactly as before', () => {
    s().clearToEmpty()
    s().createNewProject('One')
    s().createNewProject('Two')
    const payload = JSON.parse(JSON.stringify(s().exportAllData()))
    delete payload.deletedProjects

    s().clearToEmpty()
    expect(s().hydrateFromPayload(payload).ok).toBe(true)
    expect(names()).toEqual(['One', 'Two'])
    expect(cur()).toEqual([])
  })
})

describe('only an explicit undo lifts a tombstone', () => {
  beforeEach(() => {
    s().clearToEmpty()
  })

  it('undo removes it, and puts the project back', () => {
    /* The one deleted-project restore the app has. `restoreVersion` cannot do
       this — see the test below. */
    s().createNewProject('Keep')
    const gone = s().createNewProject('Gone')
    const r = s().deleteProject(gone.id)
    expect(tombIds()).toEqual([String(gone.id)])

    r.restore()
    expect(names()).toEqual(['Keep', 'Gone'])
    expect(cur()).toEqual([])
  })

  it('version restore cannot restore a deleted project, and is left alone', () => {
    /* `restoreVersion` requires the version's project to be the CURRENT one,
       and a deleted project cannot be current. So it is not a deleted-project
       restore path and no tombstone logic was added to it. */
    const src = versionService.restoreVersion.toString()
    expect(src).toContain('currentProjectId')
    expect(src).not.toContain('deletedProjects')
  })

  it('a migration never clears one', () => {
    const gone = s().createNewProject('Gone')
    s().createNewProject('Keep')
    s().deleteProject(gone.id)
    /* Every earlier version, so a workspace arriving from any older build
       keeps its deletions. */
    for (const from of [6, 7, 8]) {
      expect(reload(from).deletedProjects).toHaveLength(1)
    }
  })

  it('rehydration fills in an absent list without touching a real one', () => {
    const state = { projects: [], tasks: [], moodItems: [] }
    rehydrate(state)
    expect(state.deletedProjects).toEqual([])

    const held = {
      projects: [],
      tasks: [],
      moodItems: [],
      deletedProjects: [{ id: 'p1', at: 'x' }],
    }
    rehydrate(held)
    expect(held.deletedProjects).toEqual([{ id: 'p1', at: 'x' }])
  })

  it('the v9 migration backfills an empty list on an older workspace', () => {
    const out = opts().migrate(
      { moodItems: [], projects: [{ id: 'p1', name: 'Old' }] },
      8
    )
    expect(out.deletedProjects).toEqual([])
    /* …and does not disturb the project it found. */
    expect(out.projects[0].name).toBe('Old')
  })
})
