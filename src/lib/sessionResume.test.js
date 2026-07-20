import { describe, it, expect, beforeEach } from 'vitest'
import {
  serializeForcedBreak,
  hydrateForcedBreak,
  tickForcedBreak,
  serializeFocus,
  hydrateFocus,
  buildResumeBanner,
  isPathView,
} from './sessionResume'

describe('forced break serialize / hydrate', () => {
  it('survives reload with remaining time', () => {
    const now = 1_000_000
    const snap = serializeForcedBreak(
      {
        leftSec: 120,
        totalSec: 300,
        workMinutes: 25,
        breakMinutes: 5,
        resumeView: 'brand',
        planItems: [],
        completedIds: [],
      },
      now
    )
    expect(snap.endsAt).toBe(now + 120_000)
    const h = hydrateForcedBreak(snap, now + 30_000)
    expect(h.active.leftSec).toBe(90)
    expect(h.active.resumeView).toBe('brand')
  })

  it('marks expired when endsAt passed', () => {
    const now = 1_000_000
    const snap = serializeForcedBreak(
      { leftSec: 10, totalSec: 60, resumeView: 'flow' },
      now
    )
    const h = hydrateForcedBreak(snap, now + 60_000)
    expect(h.expired).toBe(true)
    expect(h.resumeView).toBe('flow')
  })

  it('tickForcedBreak uses endsAt', () => {
    const now = 5_000_000
    const fb = {
      endsAt: now + 45_000,
      leftSec: 99,
      totalSec: 300,
      resumeView: 'spark',
    }
    const t = tickForcedBreak(fb, now)
    expect(t.leftSec).toBe(45)
  })
})

describe('focus hydrate', () => {
  it('restores running timer from endsAt', () => {
    const now = 2_000_000
    const snap = serializeFocus(
      { running: true, leftSec: 600, source: 'research' },
      now
    )
    const h = hydrateFocus(snap, now + 60_000)
    expect(h.running).toBe(true)
    expect(h.leftSec).toBe(540)
    expect(h.source).toBe('research')
  })

  it('marks ended when timer elapsed during reload', () => {
    const now = 2_000_000
    const snap = serializeFocus(
      { running: true, leftSec: 30, source: null },
      now
    )
    const h = hydrateFocus(snap, now + 120_000)
    expect(h.ended).toBe(true)
    expect(h.running).toBe(false)
  })
})

describe('buildResumeBanner', () => {
  it('includes decision line and path view', () => {
    const b = buildResumeBanner({
      session: { activeView: 'spark', forcedBreak: null, focus: null },
      projectName: 'Soft Signal',
      nextStepTitle: 'Draft logo mark',
      decisionLine: 'Chose B: Quiet teal — because calm clinic',
    })
    expect(b.view).toBe('spark')
    expect(b.viewLabel).toBe('Ideate')
    expect(b.decisionLine).toMatch(/Chose B/)
    expect(b.mode).toBe('reload')
  })

  it('mode break-done when break expired', () => {
    const now = Date.now()
    const b = buildResumeBanner({
      session: {
        activeView: 'flow',
        forcedBreak: {
          endsAt: now - 1000,
          resumeView: 'flow',
          totalSec: 300,
        },
      },
      projectName: 'X',
    })
    expect(b.afterBreak).toBe(true)
    expect(b.mode).toBe('break-done')
  })
})

describe('isPathView', () => {
  it('knows path vs tools', () => {
    expect(isPathView('brand')).toBe(true)
    expect(isPathView('settings')).toBe(false)
  })
})

describe('localStorage session roundtrip', () => {
  const mem = new Map()

  beforeEach(() => {
    mem.clear()
    globalThis.localStorage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => {
        mem.set(k, String(v))
      },
      removeItem: (k) => {
        mem.delete(k)
      },
      clear: () => mem.clear(),
    }
  })

  it('save/load merge', async () => {
    const mod = await import('./sessionResume')
    mod.saveDeskSession({ activeView: 'flow', projectId: 1 })
    mod.saveDeskSession({ focus: { running: false, leftSec: 100 } })
    const s = mod.loadDeskSession()
    expect(s.activeView).toBe('flow')
    expect(s.focus.leftSec).toBe(100)
    expect(s.projectId).toBe(1)
  })
})
