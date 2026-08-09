import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import useAppStore, { createBlankProject } from './useAppStore'

/**
 * DELETE MEANS DELETE.
 *
 * Three local defects, each of which made a project undeletable or brought
 * one back, and none of which needed the cloud:
 *
 *   The UI guard read `if (!id) return`. A project whose id is 0, '' or NaN
 *   is falsy, so Delete did nothing — no deletion, no toast, no undo, no
 *   error. A dead button that says nothing is indistinguishable from a
 *   broken app.
 *
 *   The store filtered with `p.id !== id`. `NaN !== NaN` is always true, so
 *   a project with a bad id survived its own deletion and the store then
 *   reported "Project not found" about a project sitting in the list. The
 *   same strictness meant a numeric id could not be matched by its string
 *   form, which is what a `<select>` or an import round trip produces.
 *
 *   Rehydration read a zero-length `projects` array as damage and reseeded a
 *   blank "My project" — putting a project back on the desk the designer had
 *   just cleared. Same defect as the direction slots: EMPTY IS VALID DATA.
 *
 * The cloud resurrection (syncEngine's union-of-ids pull) is a separate
 * mechanism and is not covered here.
 */

const s = () => useAppStore.getState()
const ids = () => s().projects.map((p) => String(p.id))
const names = () => s().projects.map((p) => p.name)

function fakeLS() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}
const rehydrate = (state) =>
  useAppStore.persist.getOptions().onRehydrateStorage()(state)
const reload = () => {
  const opts = useAppStore.persist.getOptions()
  const stored = JSON.parse(JSON.stringify(opts.partialize(s())))
  const migrated = opts.migrate(stored, 8)
  const next = { ...migrated }
  rehydrate(next)
  return next
}

beforeEach(() => {
  globalThis.localStorage = fakeLS()
})
afterEach(() => {
  delete globalThis.localStorage
})

describe('a normal project deletes and stays deleted', () => {
  it('survives persistence and rehydration', () => {
    s().clearToEmpty()
    s().createNewProject('Alpha Co')
    const b = s().createNewProject('Beta Co')
    /* Creating a project selects it, so Gamma is current here. */
    const gamma = s().createNewProject('Gamma Co')

    expect(s().deleteProject(b.id).ok).toBe(true)
    expect(names()).toEqual(['Alpha Co', 'Gamma Co'])

    const after = reload()
    expect(after.projects.map((p) => p.name)).toEqual(['Alpha Co', 'Gamma Co'])
    /* Deleting a project that was NOT current must not move the selection. */
    expect(String(after.currentProjectId)).toBe(String(gamma.id))
  })

  it('takes that project’s tasks and pins with it, and no others', () => {
    s().clearToEmpty()
    const a = s().createNewProject('Keep')
    const b = s().createNewProject('Drop')
    useAppStore.setState({
      tasks: [
        { id: 1, title: 'keep', projectId: a.id },
        { id: 2, title: 'drop', projectId: b.id },
      ],
      moodItems: [
        { id: 1, projectId: a.id },
        { id: 2, projectId: b.id },
      ],
    })
    s().deleteProject(b.id)
    expect(s().tasks.map((t) => t.title)).toEqual(['keep'])
    expect(s().moodItems).toHaveLength(1)
  })
})

describe('an id the app cannot compare strictly is still deletable', () => {
  it('matches a numeric id given as a string', () => {
    /* A `<select>` value is always a string; `unarchiveProject` already
       carries a `Number(id) || id` workaround for exactly this. */
    s().clearToEmpty()
    useAppStore.setState({
      projects: [
        { ...createBlankProject('Numeric', ''), id: 1234 },
        createBlankProject('Other', ''),
      ],
      currentProjectId: 1234,
    })
    expect(s().deleteProject('1234').ok).toBe(true)
    expect(names()).toEqual(['Other'])
  })

  it('matches a string id given as a number', () => {
    s().clearToEmpty()
    useAppStore.setState({
      projects: [
        { ...createBlankProject('Stringy', ''), id: '99' },
        createBlankProject('Other', ''),
      ],
      currentProjectId: '99',
    })
    expect(s().deleteProject(99).ok).toBe(true)
    expect(names()).toEqual(['Other'])
  })

  for (const bad of [0, '']) {
    it(`deletes a project whose id is ${JSON.stringify(bad)}`, () => {
      s().clearToEmpty()
      useAppStore.setState({
        projects: [
          { ...createBlankProject('Falsy id', ''), id: bad },
          createBlankProject('Other', ''),
        ],
        currentProjectId: bad,
      })
      expect(s().deleteProject(bad).ok).toBe(true)
      expect(names()).toEqual(['Other'])
      expect(reload().projects.map((p) => p.name)).toEqual(['Other'])
    })
  }

  it('does not silently fail on a NaN id', () => {
    /* `NaN !== NaN`, so the old filter kept the project AND reported it
       missing. It is removable now, and — the point — the app never claims a
       project is absent while showing it. */
    s().clearToEmpty()
    useAppStore.setState({
      projects: [
        { ...createBlankProject('Broken id', ''), id: NaN },
        createBlankProject('Other', ''),
      ],
      currentProjectId: NaN,
    })
    const r = s().deleteProject(NaN)
    expect(r.ok).toBe(true)
    expect(names()).toEqual(['Other'])
  })

  it('still reports honestly for an id that is genuinely not there', () => {
    s().clearToEmpty()
    s().createNewProject('Only')
    const r = s().deleteProject('no-such-project')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('Project not found')
    expect(names()).toEqual(['Only'])
  })
})

describe('deleting the last project leaves an empty desk', () => {
  it('does not reseed a blank project on reload', () => {
    s().clearToEmpty()
    const only = s().createNewProject('Sparrow’s Promise')
    expect(s().deleteProject(only.id)).toMatchObject({ ok: true, empty: true })
    expect(s().projects).toEqual([])

    const after = reload()
    /* This used to come back as a fresh "My project" — a project on a desk
       the designer had just cleared, with no action attached and no way to
       tell it was not theirs. */
    expect(after.projects).toEqual([])
    expect(after.currentProjectId).toBeNull()
  })

  it('stays empty across repeated loads', () => {
    s().clearToEmpty()
    const only = s().createNewProject('Once')
    s().deleteProject(only.id)
    let out = reload()
    for (let i = 0; i < 3; i += 1) {
      useAppStore.setState({
        projects: out.projects,
        currentProjectId: out.currentProjectId ?? null,
      })
      out = reload()
    }
    expect(out.projects).toEqual([])
  })

  it('still repairs a workspace whose projects key is absent or not an array', () => {
    /* Absent is different from empty. A malformed workspace still gets a
       desk to work on. */
    for (const broken of [undefined, null, 'nope', 42]) {
      const state = { projects: broken, tasks: [], moodItems: [] }
      rehydrate(state)
      expect(Array.isArray(state.projects)).toBe(true)
      expect(state.projects.length).toBe(1)
    }
  })
})

describe('undo puts back exactly what was removed', () => {
  it('restores the project, its tasks, its pins and the selection', () => {
    s().clearToEmpty()
    const a = s().createNewProject('Alpha')
    const b = s().createNewProject('Beta')
    useAppStore.setState({ tasks: [{ id: 1, title: 't', projectId: b.id }] })
    const before = { ids: ids(), current: String(s().currentProjectId) }

    const r = s().deleteProject(b.id)
    expect(ids()).not.toContain(String(b.id))
    r.restore()

    expect(ids()).toEqual(before.ids)
    expect(String(s().currentProjectId)).toBe(before.current)
    expect(s().tasks).toHaveLength(1)
    void a
  })
})
