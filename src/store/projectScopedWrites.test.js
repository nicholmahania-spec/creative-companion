/**
 * An async result must land on the project it was started for.
 *
 * Several store actions resolve `state.currentProjectId` at the moment they
 * are applied, not when the work began. That is fine for a click, and wrong
 * for anything behind an `await`: OCR of a scanned client form takes seconds,
 * palette extraction decodes every pinned image. Switch project in that
 * window and the result is written to whichever project is on screen when the
 * promise settles.
 *
 * ResearchView already solved this — it captures `ownerProjectId` before the
 * await and passes it down — but the newer call sites did not, so the store
 * actions they use had no way to accept it.
 *
 * These tests reproduce the race directly: run the action while a DIFFERENT
 * project is current, and assert the data landed where the work started.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import useAppStore from './useAppStore'

const A = 'project-a'
const B = 'project-b'

const blank = (id) => ({
  id,
  name: id,
  detective: {},
  palette: [],
  directions: [],
  tasks: [],
})

describe('project-scoped writes', () => {
  beforeEach(() => {
    useAppStore.setState({
      projects: [blank(A), blank(B)],
      currentProjectId: A,
    })
  })

  const get = (id) => useAppStore.getState().projects.find((p) => p.id === id)

  it('merges scanned brief answers into the project the scan started on', () => {
    const { mergeDetectiveAnswers } = useAppStore.getState()
    /* The user scanned a paper form on A. OCR ran for several seconds; they
       switched to B while waiting, then pressed Apply. */
    useAppStore.setState({ currentProjectId: B })
    mergeDetectiveAnswers({ goal: 'Launch the harbour brand' }, A)

    expect(get(A).detective.goal).toBe('Launch the harbour brand')
    expect(get(B).detective.goal).toBeUndefined()
  })

  it('writes an extracted palette to the project whose pins it came from', () => {
    const { setProjectPalette } = useAppStore.getState()
    useAppStore.setState({ currentProjectId: B })
    setProjectPalette(['#112233', '#445566'], A)

    expect(get(A).palette).toEqual(['#112233', '#445566'])
    expect(get(B).palette).toEqual([])
  })

  it('still writes to the current project when no owner is given', () => {
    /* Every existing caller passes nothing and means "the project I am on".
       That has to keep working, or this fix breaks the common path to fix
       the rare one. */
    const { mergeDetectiveAnswers, setProjectPalette } = useAppStore.getState()
    mergeDetectiveAnswers({ goal: 'plain click' })
    setProjectPalette(['#000000', '#ffffff'])

    expect(get(A).detective.goal).toBe('plain click')
    expect(get(A).palette).toEqual(['#000000', '#ffffff'])
    expect(get(B).detective.goal).toBeUndefined()
  })

  it('ignores a write aimed at a project that no longer exists', () => {
    /* Deleting the project mid-scan must not resurrect it or throw. */
    const { mergeDetectiveAnswers } = useAppStore.getState()
    expect(() =>
      mergeDetectiveAnswers({ goal: 'gone' }, 'deleted-project')
    ).not.toThrow()
    expect(get(A).detective.goal).toBeUndefined()
    expect(useAppStore.getState().projects).toHaveLength(2)
  })
})
