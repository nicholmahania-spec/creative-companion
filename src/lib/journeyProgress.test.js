import { describe, expect, it } from 'vitest'
import {
  pathStepHasContent,
  pathProgressSummary,
  pathMissingLabels,
  pathFirstGap,
  pathGapFocusSelector,
  pathStepFillHint,
  buildPathProgressCtx,
  isStockProjectPalette,
  STOCK_PROJECT_PALETTE,
} from './journeyProgress'
import { JOURNEY_STEPS } from './journey'

describe('pathStepHasContent', () => {
  it('define needs name, brief, or detective', () => {
    expect(pathStepHasContent('define', { project: {} })).toBe(false)
    expect(
      pathStepHasContent('define', {
        project: { detective: { goal: 'Help families' } },
      })
    ).toBe(true)
  })

  it('research prefers ★ pin or 2+ refs (single unstarred is thin)', () => {
    expect(pathStepHasContent('research', { moodItems: [] })).toBe(false)
    expect(
      pathStepHasContent('research', { moodItems: [{ id: 1 }] })
    ).toBe(false)
    expect(
      pathStepHasContent('research', {
        moodItems: [{ id: 1, inPack: true }],
      })
    ).toBe(true)
    expect(
      pathStepHasContent('research', {
        moodItems: [{ id: 1 }, { id: 2 }],
      })
    ).toBe(true)
  })

  it('ideate needs direction title or spark pin — not bare sparkIndex', () => {
    expect(pathStepHasContent('ideate', { sparkIndex: 0 })).toBe(false)
    expect(pathStepHasContent('ideate', { sparkIndex: 5 })).toBe(false)
    expect(
      pathStepHasContent('ideate', {
        project: { directions: [{ title: 'Quiet' }] },
      })
    ).toBe(true)
    expect(
      pathStepHasContent('ideate', {
        moodItems: [{ type: 'quote', note: 'Research note only' }],
      })
    ).toBe(false)
    expect(
      pathStepHasContent('ideate', {
        moodItems: [{ type: 'spark', note: 'A spark', fromSpark: true }],
      })
    ).toBe(true)
  })

  it('design ignores stock default palette alone', () => {
    expect(isStockProjectPalette(STOCK_PROJECT_PALETTE)).toBe(true)
    expect(
      pathStepHasContent('design', {
        project: {},
        palette: [...STOCK_PROJECT_PALETTE],
      })
    ).toBe(false)
    expect(
      pathStepHasContent('design', {
        project: { tagline: 'Hello' },
        palette: [...STOCK_PROJECT_PALETTE],
      })
    ).toBe(true)
    expect(
      pathStepHasContent('design', {
        project: {},
        palette: ['#111111', '#222222'],
      })
    ).toBe(true)
    // version alone is not craft
    expect(
      pathStepHasContent('design', {
        project: { designVersion: 'v2' },
        palette: [...STOCK_PROJECT_PALETTE],
      })
    ).toBe(false)
  })

  it('pathProgressSummary counts done steps', () => {
    const rows = pathProgressSummary(JOURNEY_STEPS, {
      project: {
        name: 'Co',
        detective: { goal: 'G', audience: 'A' },
        tagline: 'T',
        designVersion: 'v2',
        feedbackNotes: 'ok',
        handoffNote: 'hi',
        learnings: 'yay',
        directions: [{ id: 'a', title: 'Quiet' }],
      },
      moodItems: [{ id: 1, inPack: true, type: 'quote', note: 'ref' }],
      tasks: [{ id: 1 }],
      sparkIndex: 3,
      palette: ['#111', '#222'],
    })
    expect(rows).toHaveLength(7)
    expect(rows.every((r) => r.done)).toBe(true)
  })

  it('pathMissingLabels lists empty steps', () => {
    const missing = pathMissingLabels(JOURNEY_STEPS, {
      project: { name: 'Only name' },
      moodItems: [],
      tasks: [],
      sparkIndex: 0,
      palette: [],
    })
    expect(missing.length).toBeGreaterThan(3)
    expect(missing).toContain('Research')
    expect(missing).toContain('Ideate')
  })

  it('pathFirstGap returns earliest incomplete step', () => {
    const gap = pathFirstGap(JOURNEY_STEPS, {
      project: {
        name: 'Co',
        detective: { goal: 'G', audience: 'A' },
      },
      moodItems: [],
      tasks: [],
      sparkIndex: 0,
    })
    expect(gap?.id).toBe('research')
    expect(gap?.view).toBe('studio')
  })

  it('pathGapFocusSelector maps steps to fields', () => {
    expect(pathGapFocusSelector('define')).toMatch(/detective/)
    expect(pathGapFocusSelector('review')).toMatch(/feedback/)
    expect(pathGapFocusSelector('deliver')).toMatch(/handoff/)
  })

  it('pathStepFillHint returns short how-to for each step', () => {
    expect(pathStepFillHint('research')).toMatch(/star|pin|ref/i)
    expect(pathStepFillHint('sketch')).toMatch(/step/i)
    expect(pathStepFillHint('design')).toMatch(/tagline|palette|version/i)
    expect(pathStepFillHint('unknown')).toMatch(/content/i)
  })

  it('buildPathProgressCtx scopes mood/tasks to active project', () => {
    const ctx = buildPathProgressCtx({
      currentProjectId: 'a',
      projects: [{ id: 'a', name: 'A', palette: ['#111'] }],
      moodItems: [
        { id: 1, projectId: 'a' },
        { id: 2, projectId: 'b' },
      ],
      tasks: [
        { id: 1, projectId: 'a' },
        { id: 2, projectId: 'b' },
      ],
      sparkIndex: 2,
    })
    expect(ctx.moodItems).toHaveLength(1)
    expect(ctx.tasks).toHaveLength(1)
    expect(ctx.sparkIndex).toBe(2)
    expect(ctx.palette).toEqual(['#111'])
  })

  it('buildPathProgressCtx matches string/number projectIds', () => {
    const ctx = buildPathProgressCtx({
      currentProjectId: '9001',
      projects: [{ id: 9001, name: 'Soft', palette: ['#111'] }],
      moodItems: [
        { id: 1, projectId: 9001, inPack: true },
        { id: 2, projectId: 9002 },
      ],
      tasks: [{ id: 1, projectId: 9001 }],
    })
    expect(ctx.project?.name).toBe('Soft')
    expect(ctx.moodItems).toHaveLength(1)
    expect(ctx.tasks).toHaveLength(1)
    expect(pathStepHasContent('research', ctx)).toBe(true)
  })
})
