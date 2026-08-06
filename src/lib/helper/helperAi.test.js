import { afterEach, describe, expect, it } from 'vitest'
import {
  scriptedCoachReply,
  isHelperAiConfigured,
  helperAiStatus,
  askHelper,
  noteHelperOutcome,
  resetHelperOutcome,
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

  it('status names which copy of the app you are on', () => {
    /* The badge used to describe a capability without saying where. Two copies
       that look identical and behave differently is only debuggable if the app
       says which one it is. */
    const status = helperAiStatus()
    expect(typeof status.deploy).toBe('string')
    expect(status.deploy.length).toBeGreaterThan(0)
    expect(status.detail.length).toBeGreaterThan(10)
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

/**
 * Configuration says what SHOULD happen; these lock the app to reporting what
 * DID. A badge reading "Live" while every reply comes from the lookup table is
 * the one Helper failure that cannot be seen from outside — it does not look
 * like a failure, it looks like a bad answer.
 */
describe('helperAi observed state', () => {
  afterEach(() => resetHelperOutcome())

  it('starts with nothing observed', () => {
    resetHelperOutcome()
    expect(helperAiStatus().observed).toBeNull()
  })

  it('a real model reply is recorded as ok', () => {
    noteHelperOutcome({ source: 'ai' })
    expect(helperAiStatus().observed).toBe('ok')
  })

  it('a scripted reply WITH an error means the live path failed', () => {
    noteHelperOutcome({ source: 'scripted', error: 'xAI 503: no capacity' })
    const status = helperAiStatus()
    expect(status.observed).toBe('failing')
    expect(status.detail).toContain('503')
  })

  it('ordinary scripted mode does not overwrite what we know', () => {
    /* A host with no live model returns scripted replies and no error. That
       says nothing about whether a live path works, so it must not be
       mistaken for a fault — or every offline copy would permanently accuse
       an API that was never called. */
    noteHelperOutcome({ source: 'ai' })
    noteHelperOutcome({ source: 'scripted' })
    expect(helperAiStatus().observed).toBe('ok')
  })

  it('a failure downgrades the badge but never the capability', () => {
    /* mode must stay `live` through a transient error, or one bad minute
       silently costs the rest of the session: isHelperAiConfigured() gates
       whether the next call is even attempted. */
    const before = helperAiStatus().mode
    noteHelperOutcome({ source: 'scripted', error: 'network' })
    const after = helperAiStatus()
    expect(after.mode).toBe(before)
    if (before === 'live') expect(after.short).not.toBe('Live')
  })
})
