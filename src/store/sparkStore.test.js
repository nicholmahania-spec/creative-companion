import { describe, expect, it, beforeEach } from 'vitest'
import useAppStore, {
  sparkPrompts,
  oppositeSparks,
  blankWorkspaceState,
} from './useAppStore'

describe('spark / ideate store', () => {
  beforeEach(() => {
    useAppStore.setState({
      ...blankWorkspaceState(),
      sparkIndex: 0,
      oppositeIndex: 0,
      sparksTried: 0,
      currentSpark: sparkPrompts[0],
    })
  })

  it('nextSpark wraps sparkPrompts and bumps sparksTried', () => {
    const s0 = useAppStore.getState()
    expect(s0.currentSpark).toBe(sparkPrompts[0])
    s0.nextSpark()
    const s1 = useAppStore.getState()
    expect(s1.sparkIndex).toBe(1)
    expect(s1.currentSpark).toBe(sparkPrompts[1])
    expect(s1.sparksTried).toBe(1)
    // wrap
    useAppStore.setState({ sparkIndex: sparkPrompts.length - 1 })
    useAppStore.getState().nextSpark()
    expect(useAppStore.getState().sparkIndex).toBe(0)
  })

  it('oppositeSpark wraps opposite list without unbounded sparkIndex', () => {
    const before = useAppStore.getState().sparkIndex
    useAppStore.getState().oppositeSpark()
    let s = useAppStore.getState()
    expect(s.sparkIndex).toBe(before)
    expect(s.oppositeIndex).toBe(1)
    expect(s.currentSpark).toBe(oppositeSparks[1])
    expect(s.sparksTried).toBe(1)
    // wrap opposite list
    useAppStore.setState({ oppositeIndex: oppositeSparks.length - 1 })
    useAppStore.getState().oppositeSpark()
    s = useAppStore.getState()
    expect(s.oppositeIndex).toBe(0)
    expect(s.currentSpark).toBe(oppositeSparks[0])
    expect(s.sparkIndex).toBe(before)
  })

  it('updateDirection Choose is exclusive', () => {
    const p = useAppStore.getState().createNewProject('Dirs', '')
    useAppStore.setState({ currentProjectId: p.id })
    useAppStore.getState().updateDirection('a', { title: 'Quiet', chosen: true })
    useAppStore.getState().updateDirection('b', { title: 'Bold', chosen: true })
    const proj = useAppStore
      .getState()
      .projects.find((x) => x.id === p.id)
    const a = proj.directions.find((d) => d.id === 'a')
    const b = proj.directions.find((d) => d.id === 'b')
    expect(a.chosen).toBe(false)
    expect(b.chosen).toBe(true)
    expect(b.title).toBe('Bold')
  })

  it('choosing a direction writes decisionLog', () => {
    const p = useAppStore.getState().createNewProject('Decide', '')
    useAppStore.setState({ currentProjectId: p.id })
    useAppStore.getState().updateDirection('b', {
      title: 'Quiet teal clinic',
      note: 'calm not cold',
      chosen: true,
    })
    const proj = useAppStore
      .getState()
      .projects.find((x) => x.id === p.id)
    expect(proj.decisionLog?.length).toBe(1)
    expect(proj.decisionLog[0].label).toBe('B')
    expect(proj.decisionLog[0].why).toBe('calm not cold')
  })
})
