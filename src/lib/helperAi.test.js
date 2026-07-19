import { describe, expect, it } from 'vitest'
import {
  scriptedCoachReply,
  isHelperAiConfigured,
  helperAiStatus,
} from './helperAi'

describe('helperAi scripted fallback', () => {
  const activity = {
    view: 'flow',
    projectName: 'Quiet Desk',
    nextTaskTitle: 'Lock type pair',
    nextTaskEnergy: 'med',
    queueCount: 2,
    doneCount: 1,
    pinsCount: 0,
  }

  it('reports configuration via proxy or key (scripted always works offline)', () => {
    // In node tests there is no browser proxy; without VITE_XAI_API_KEY this is false
    // unless a proxy env is set. Scripted coach still works either way.
    expect(typeof isHelperAiConfigured()).toBe('boolean')
    const status = helperAiStatus()
    expect(['live', 'scripted']).toContain(status.mode)
    expect(status.label.length).toBeGreaterThan(3)
  })

  it('recommend returns task-aware scripted coaching', () => {
    const text = scriptedCoachReply('recommend', activity)
    expect(text.toLowerCase()).toMatch(/recommend|type|typography|pair/)
    expect(text).toContain('Lock type pair')
  })

  it('critique and stuck always return non-empty strings', () => {
    expect(scriptedCoachReply('critique', activity).length).toBeGreaterThan(20)
    expect(scriptedCoachReply('stuck', activity).length).toBeGreaterThan(10)
  })

  it('process phases return design process tips', () => {
    for (const phase of [
      'define',
      'research',
      'ideate',
      'sketch',
      'design',
      'review',
      'deliver',
    ]) {
      const t = scriptedCoachReply(phase, activity)
      expect(t.length).toBeGreaterThan(15)
    }
  })
})
