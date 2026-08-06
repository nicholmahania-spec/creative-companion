/**
 * An undo that does not fully restore is worse than the dialog it replaced.
 *
 * `deleteProject` and `removeTask` now return a `restore` closure so their
 * callers can offer a 5-second undo instead of a confirmation whose copy read
 * "You cannot undo this." That trade is only honest if restore actually puts
 * everything back — the user has been told the action was safe, so they have
 * no reason to check, which means a partial restore loses work silently.
 *
 * Both of these delete MORE than the row you name:
 *   - deleting a project also drops its tasks and its mood items
 *   - removing a step also drops its sub-steps (`parentId === id`)
 *
 * So the tests below delete something with dependents and assert the whole
 * neighbourhood comes back, not just the headline row. That is the specific
 * bug this file exists to prevent, and it is the one a hand-written restore
 * would most plausibly have.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import useAppStore from './useAppStore.js'

const baseProject = (id, name) => ({
  id,
  name,
  client: '',
  archived: false,
  active: false,
})

function seed() {
  useAppStore.setState({
    projects: [baseProject('p1', 'Sparrow'), baseProject('p2', 'Harbour')],
    currentProjectId: 'p1',
    tasks: [
      { id: 't1', projectId: 'p1', title: 'Parent step', completed: false },
      { id: 't2', projectId: 'p1', parentId: 't1', title: 'Sub A' },
      { id: 't3', projectId: 'p1', parentId: 't1', title: 'Sub B' },
      { id: 't4', projectId: 'p2', title: 'Other project step' },
    ],
    moodItems: [
      { id: 'm1', projectId: 'p1', note: 'pin one' },
      { id: 'm2', projectId: 'p2', note: 'pin two' },
    ],
  })
}

describe('deleteProject can be undone completely', () => {
  beforeEach(seed)

  it('takes the project, its tasks and its pins', () => {
    const { deleteProject } = useAppStore.getState()
    const res = deleteProject('p1')
    expect(res.ok).toBe(true)

    const s = useAppStore.getState()
    expect(s.projects.map((p) => p.id)).toEqual(['p2'])
    expect(s.tasks.map((t) => t.id)).toEqual(['t4'])
    expect(s.moodItems.map((m) => m.id)).toEqual(['m2'])
  })

  it('puts all three back, not just the project row', () => {
    /* The plausible wrong implementation restores `projects` and forgets that
       tasks and pins were filtered out in the same set(). The project would
       reappear looking intact and empty, which is the worst version of this
       bug: it looks like it worked. */
    const res = useAppStore.getState().deleteProject('p1')
    res.restore()

    const s = useAppStore.getState()
    expect(s.projects.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(s.tasks.map((t) => t.id)).toEqual(['t1', 't2', 't3', 't4'])
    expect(s.moodItems.map((m) => m.id)).toEqual(['m1', 'm2'])
  })

  it('restores the original ordering and the original selection', () => {
    // Deleting p1 moves the selection to p2. Undo has to hand back the
    // selection too, or the user lands somewhere they never chose.
    useAppStore.getState().deleteProject('p1').restore()
    const s = useAppStore.getState()
    expect(s.projects[0].id).toBe('p1')
    expect(s.currentProjectId).toBe('p1')
  })

  it('can undo deleting the LAST project, back to a non-empty desk', () => {
    /* The empty case takes a different branch in the store, so it gets its
       own test — a restore that only covered the common path would leave the
       user staring at Create with their only project gone. */
    const st = useAppStore.getState()
    st.deleteProject('p1')
    const res = useAppStore.getState().deleteProject('p2')
    expect(res.empty).toBe(true)
    expect(useAppStore.getState().projects).toEqual([])

    res.restore()
    expect(useAppStore.getState().projects.map((p) => p.id)).toEqual(['p2'])
  })

  it('reports failure and offers no restore for an unknown id', () => {
    const res = useAppStore.getState().deleteProject('nope')
    expect(res.ok).toBe(false)
    expect(res.restore).toBeUndefined()
  })
})

describe('removeTask can be undone completely', () => {
  beforeEach(seed)

  it('removes the step and its sub-steps', () => {
    const res = useAppStore.getState().removeTask('t1')
    expect(res.ok).toBe(true)
    expect(useAppStore.getState().tasks.map((t) => t.id)).toEqual(['t4'])
  })

  it('brings the sub-steps back too', () => {
    // The headline row is easy to remember; the children are what a
    // hand-rolled restore drops.
    useAppStore.getState().removeTask('t1').restore()
    expect(useAppStore.getState().tasks.map((t) => t.id)).toEqual([
      't1',
      't2',
      't3',
      't4',
    ])
  })

  it('leaves other projects untouched in both directions', () => {
    const res = useAppStore.getState().removeTask('t1')
    expect(useAppStore.getState().tasks.some((t) => t.id === 't4')).toBe(true)
    res.restore()
    expect(useAppStore.getState().tasks.filter((t) => t.id === 't4')).toHaveLength(
      1
    )
  })

  it('says so when there was nothing to remove', () => {
    const res = useAppStore.getState().removeTask('missing')
    expect(res.ok).toBe(false)
    expect(res.restore).toBeUndefined()
  })
})
