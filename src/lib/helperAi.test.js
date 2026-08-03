import { describe, expect, it } from 'vitest'
import {
  scriptedCoachReply,
  isHelperAiConfigured,
  helperAiStatus,
  askHelper,
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

  it('free-text without live AI does not blame the network', async () => {
    /* Pages / scripted hosts used to say "without a connection" — false when
       the host simply has no backend. Guard the honest line. */
    if (isHelperAiConfigured()) {
      /* Live env in CI — skip the unconfigured branch */
      return
    }
    const r = await askHelper('What should I do next?', [], activity)
    expect(r.source).toBe('scripted')
    expect(r.text.toLowerCase()).not.toMatch(/connection|offline|network/)
    expect(r.text.toLowerCase()).toMatch(/live ai|typed|button/)
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
