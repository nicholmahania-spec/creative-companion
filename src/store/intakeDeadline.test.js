import { describe, it, expect, beforeEach } from 'vitest'
import useAppStore from './useAppStore'

/**
 * A deadline typed on the New project form must survive into the brief.
 *
 * It did not. Creation wrote only `detective.projectDeadline`, while the
 * brief's date input reads `activeProject.deadline` — a different field. A
 * cold-start tester entered 19 Feb 2027, pressed Start project, and the
 * brief opened blank; they typed it again. Data the designer entered must
 * not disappear between the screen that asked for it and the screen that
 * shows it, and a silent loss is worse than a refusal: nothing tells them
 * it happened.
 */
describe('the deadline survives project creation', () => {
  beforeEach(() => {
    useAppStore.setState({ projects: [], currentProjectId: null })
  })

  it('writes BOTH fields, the way setProjectDeadline does', () => {
    const p = useAppStore.getState().createProjectFromIntake({
      clientName: 'Hollowbrook Tack',
      projectDeadline: '2027-02-19',
    })
    expect(p.deadline, 'the field the brief reads').toBe('2027-02-19')
    expect(p.detective.projectDeadline, 'the field progress reads').toBe(
      '2027-02-19'
    )
  })

  it('the two fields agree — one blank and one set is the bug', () => {
    const p = useAppStore.getState().createProjectFromIntake({
      clientName: 'Agree Co',
      projectDeadline: '2027-02-19',
    })
    expect(p.deadline).toBe(p.detective.projectDeadline)
  })

  it('no deadline stays empty on both, not undefined on one', () => {
    const p = useAppStore
      .getState()
      .createProjectFromIntake({ clientName: 'No Date Co' })
    expect(p.deadline || '').toBe('')
    expect(p.detective.projectDeadline || '').toBe('')
  })

  it('matches what setProjectDeadline produces, so the paths cannot drift', () => {
    /* Two ways to set the same thing is how they diverge. Pinning them to
       the same result means a change to one that skips the other fails
       here rather than in a designer's project. */
    const created = useAppStore.getState().createProjectFromIntake({
      clientName: 'Drift Co',
      projectDeadline: '2027-03-01',
    })
    useAppStore.setState({ currentProjectId: created.id })
    useAppStore.getState().setProjectDeadline('2027-04-02')
    const after = useAppStore
      .getState()
      .projects.find((x) => x.id === created.id)
    expect(after.deadline).toBe('2027-04-02')
    expect(after.detective.projectDeadline).toBe('2027-04-02')
  })
})
