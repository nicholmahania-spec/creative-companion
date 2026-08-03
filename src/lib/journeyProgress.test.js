import { describe, expect, it } from 'vitest'
import {
  pathStepHasContent,
  pathStepMeetsCondition,
  pathProgressSummary,
  pathMissingLabels,
  pathFirstGap,
  pathGapFocusSelector,
  buildPathProgressCtx,
  isStockProjectPalette,
  STOCK_PROJECT_PALETTE,
} from './journeyProgress'
import { JOURNEY_STEPS } from './journey'

describe('pathStepHasContent', () => {
  it('define needs detective required core — not display name alone', () => {
    expect(pathStepHasContent('define', { project: {} })).toBe(false)
    expect(
      pathStepHasContent('define', {
        project: { name: 'Acme Studio' },
      })
    ).toBe(false)
    expect(
      pathStepHasContent('define', {
        project: { detective: { goal: 'Help families' } },
      })
    ).toBe(false)
    expect(
      pathStepHasContent('define', {
        project: {
          detective: {
            clientName: 'Acme',
            engagementType: 'new',
            goal: 'Help families',
            audience: 'Parents',
            deliverablesPicked: ['logoPrimary'],
          },
        },
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
        moodItems: [{ id: 1, inPack: true, note: 'why' }],
      })
    ).toBe(true)
    expect(
      pathStepHasContent('research', {
        moodItems: [{ id: 1 }, { id: 2 }],
      })
    ).toBe(true)
  })

  it('ideate needs titled direction, rough idea, or spark pin — not bare sparkIndex', () => {
    expect(pathStepHasContent('ideate', { sparkIndex: 0 })).toBe(false)
    expect(pathStepHasContent('ideate', { sparkIndex: 5 })).toBe(false)
    expect(
      pathStepHasContent('ideate', {
        project: { directions: [{ title: 'Quiet' }] },
      })
    ).toBe(true)
    expect(
      pathStepHasContent('ideate', {
        project: { directions: [{ title: '', note: 'why only' }] },
      })
    ).toBe(false)
    expect(
      pathStepHasContent('ideate', {
        project: { roughIdeas: ['messy dump'] },
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

  /* Touchpoints is done when work on that stop is finished — not when the
     Strategy brief names surfaces/deliverables (those auto-ticked the stop). */
  it('sketch is not done just because a task exists or the brief names surfaces', () => {
    expect(
      pathStepHasContent('sketch', {
        project: {},
        tasks: [{ id: 1, title: 'Draft logo', why: '', completed: false }],
      })
    ).toBe(false)
    expect(
      pathStepHasContent('sketch', {
        project: { detective: { brandSurfaces: ['website', 'social'] } },
      })
    ).toBe(false)
    expect(
      pathStepHasContent('sketch', {
        project: { detective: { deliverablesPicked: ['businessCard'] } },
      })
    ).toBe(false)
  })

  it('sketch is done when at least one titled task is completed', () => {
    expect(pathStepHasContent('sketch', { project: {}, tasks: [] })).toBe(
      false
    )
    expect(
      pathStepHasContent('sketch', {
        project: {},
        tasks: [{ id: 1, title: 'Apply lockup to card', completed: true }],
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
        detective: {
          clientName: 'Co',
          engagementType: 'new',
          goal: 'G',
          audience: 'A',
          deliverablesPicked: ['logoPrimary'],
        },
        tagline: 'T',
        designVersion: 'v2',
        feedbackNotes: 'ok',
        handoffNote: 'hi',
        learnings: 'yay',
        directions: [{ id: 'a', title: 'Quiet', note: 'Fits the goal' }],
      },
      moodItems: [{ id: 1, inPack: true, type: 'quote', note: 'ref' }],
      tasks: [
        { id: 1, title: 'Apply lockup', why: 'Fits the goal', completed: true },
      ],
      sparkIndex: 3,
      palette: ['#111', '#222'],
    })
    expect(rows).toHaveLength(5)
    expect(rows.every((r) => r.done)).toBe(true)
  })

  it('pathMissingLabels lists empty path steps', () => {
    const missing = pathMissingLabels(JOURNEY_STEPS, {
      project: { name: 'Only name' },
      moodItems: [],
      tasks: [],
      sparkIndex: 0,
      palette: [],
    })
    expect(missing.length).toBe(5)
    expect(missing).toContain('Research')
    expect(missing).toContain('Strategy')
    expect(missing).toContain('Identity')
    expect(missing).toContain('Touchpoints')
    expect(missing).toContain('Assets')
    expect(missing).not.toContain('Ideate')
  })

  it('pathFirstGap returns earliest incomplete path step', () => {
    const gap = pathFirstGap(JOURNEY_STEPS, {
      project: {
        name: 'Co',
        detective: {
          clientName: 'Co',
          engagementType: 'new',
          goal: 'G',
          audience: 'A',
          deliverablesPicked: ['logoPrimary'],
        },
      },
      moodItems: [],
      tasks: [],
      sparkIndex: 0,
    })
    // Path order: Strategy → Research → … Strategy is filled, next gap is Research
    expect(gap?.id).toBe('research')
    expect(gap?.view).toBe('studio')
  })

  it('pathGapFocusSelector maps steps to fields', () => {
    expect(pathGapFocusSelector('define')).toMatch(/clientName/)
    expect(pathGapFocusSelector('review')).toMatch(/feedback/)
    expect(pathGapFocusSelector('deliver')).toMatch(/handoff/)
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
        { id: 1, projectId: 9001, inPack: true, note: 'why' },
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

describe('completion latches', () => {
  /**
   * Two conditions could go from true back to false through ordinary work,
   * and the tick vanished from the sidebar, the step rail and the home dots
   * at once, with no message and no local cause to attach it to.
   */
  it('research does not un-tick when you star another pin', () => {
    const withNote = [{ id: 1, inPack: true, note: 'why this one' }]
    const ctx = { project: { id: 'p' }, moodItems: withNote }
    expect(pathStepMeetsCondition('research', ctx)).toBe(true)

    // Star a second pin — the live condition now fails...
    const plusBare = [...withNote, { id: 2, inPack: true, note: '' }]
    expect(
      pathStepMeetsCondition('research', { project: { id: 'p' }, moodItems: plusBare })
    ).toBe(false)

    // ...but once latched, the tick holds.
    expect(
      pathStepHasContent('research', {
        project: { id: 'p', pathReached: { research: true } },
        moodItems: plusBare,
      })
    ).toBe(true)
  })

  /* Assets path-done is handoff/learnings only — brand-word checkboxes no
     longer gate the tick (they live under collapsed UI and could un-tick
     after a client re-submits brandWords). Latch still holds once reached. */
  it('assets stays met from handoff even if brand words change', () => {
    const done = {
      id: 'p',
      handoffNote: 'files sent',
      detective: { brandWords: 'honest, solid' },
    }
    expect(pathStepMeetsCondition('deliver', { project: done })).toBe(true)

    const afterClientEdit = {
      ...done,
      detective: { brandWords: 'honest, solid, warm' },
    }
    expect(pathStepMeetsCondition('deliver', { project: afterClientEdit })).toBe(
      true
    )
    expect(
      pathStepHasContent('deliver', {
        project: { ...afterClientEdit, pathReached: { deliver: true } },
      })
    ).toBe(true)
  })

  /* The latch must not invent progress that never happened — it only holds
     what was genuinely reached. */
  it('does not tick a stop that was never met', () => {
    expect(
      pathStepHasContent('research', {
        project: { id: 'p', pathReached: { deliver: true } },
        moodItems: [],
      })
    ).toBe(false)
  })
})
