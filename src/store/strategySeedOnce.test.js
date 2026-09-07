import { describe, expect, it, beforeEach } from 'vitest'
import useAppStore, {
  blankWorkspaceState,
  createBlankProject,
} from './useAppStore'

/**
 * The brief seeds the strategy list ONCE PER ITEM. A later answer arrives
 * once; a word the designer removed never comes back; a placement they
 * adjusted is never overwritten. This is the contract that lets the list be
 * the designer's while still starting full.
 */

const seed = (detective = {}) => {
  const project = { ...createBlankProject('Seed test', ''), detective }
  useAppStore.setState({
    ...blankWorkspaceState(),
    projects: [project],
    currentProjectId: project.id,
  })
  return project.id
}

const current = () => {
  const s = useAppStore.getState()
  return s.projects.find((p) => p.id === s.currentProjectId)
}

const ids = () => (current().strategyAttributes || []).map((a) => a.id)

describe('seedStrategyAttributes — once per brief item', () => {
  beforeEach(() => seed())

  it('leaves an unanswered project untouched — undefined, not empty', () => {
    const r = useAppStore.getState().seedStrategyAttributes(current().id)
    expect(r).toEqual({ ok: true, seeded: 0 })
    expect(current().strategyAttributes).toBeUndefined()
  })

  it('hands over spectrums and the client’s words together', () => {
    seed({ spectrumBoldMinimalist: 'a', toneOfVoice: 'warm, honest' })
    const r = useAppStore.getState().seedStrategyAttributes(current().id)
    expect(r.seeded).toBe(3)
    expect(ids()).toEqual([
      'brief:spectrumBoldMinimalist',
      'brief:toneOfVoice:warm',
      'brief:toneOfVoice:honest',
    ])
  })

  it('a word removed by the designer does not return', () => {
    seed({ feel: 'calm, warm' })
    const s = useAppStore.getState()
    s.seedStrategyAttributes(current().id)
    s.setStrategyAttributes(
      current().id,
      current().strategyAttributes.filter((a) => a.id !== 'brief:feel:calm')
    )
    useAppStore.getState().seedStrategyAttributes(current().id)
    expect(ids()).toEqual(['brief:feel:warm'])
  })

  it('an adjusted placement is never overwritten', () => {
    seed({ feel: 'warm' })
    const s = useAppStore.getState()
    s.seedStrategyAttributes(current().id)
    s.setStrategyAttributes(current().id, [
      { ...current().strategyAttributes[0], warmth: 0.4, suggested: false },
    ])
    useAppStore.getState().seedStrategyAttributes(current().id)
    expect(current().strategyAttributes[0].warmth).toBe(0.4)
  })

  it('an answer that arrives later — the client filling the portal — seeds once', () => {
    seed({ spectrumBoldMinimalist: 'a' })
    const s = useAppStore.getState()
    s.seedStrategyAttributes(current().id)
    expect(ids()).toEqual(['brief:spectrumBoldMinimalist'])
    s.updateDetective('toneOfVoice', 'quick, honest')
    useAppStore.getState().seedStrategyAttributes(current().id)
    expect(ids()).toEqual([
      'brief:spectrumBoldMinimalist',
      'brief:toneOfVoice:quick',
      'brief:toneOfVoice:honest',
    ])
    useAppStore.getState().seedStrategyAttributes(current().id)
    expect(ids().length).toBe(3)
  })

  it('a cleared list stays cleared for what was already handed over', () => {
    seed({ feel: 'warm' })
    const s = useAppStore.getState()
    s.seedStrategyAttributes(current().id)
    s.setStrategyAttributes(current().id, [])
    useAppStore.getState().seedStrategyAttributes(current().id)
    expect(current().strategyAttributes).toEqual([])
  })

  it('a project seeded before the record existed does not regrow its spectrums', () => {
    /* Legacy shape: spectrums answered, list set (here cleared), no record. */
    const id = seed({ spectrumBoldMinimalist: 'a', feel: 'warm' })
    useAppStore.setState({
      projects: useAppStore.getState().projects.map((p) =>
        p.id === id ? { ...p, strategyAttributes: [] } : p
      ),
    })
    useAppStore.getState().seedStrategyAttributes(id)
    expect(ids()).toEqual(['brief:feel:warm'])
    expect(current().strategySeededFrom).toContain('brief:spectrumBoldMinimalist')
  })
})
