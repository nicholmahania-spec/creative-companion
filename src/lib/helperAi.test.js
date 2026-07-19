import { describe, expect, it } from 'vitest'
import { scriptedCoachReply, isHelperAiConfigured } from './helperAi'

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

  it('reports AI not configured in node/test without Vite key', () => {
    expect(isHelperAiConfigured()).toBe(false)
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
    for (const phase of ['clarify', 'structure', 'visual', 'refine']) {
      const t = scriptedCoachReply(phase, activity)
      expect(t.length).toBeGreaterThan(15)
    }
  })
})
