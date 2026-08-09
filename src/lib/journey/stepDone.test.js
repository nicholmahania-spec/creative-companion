import { describe, expect, it } from 'vitest'
import { JOURNEY_STEPS } from './journey'
import {
  pathFirstGap,
  pathMissingLabels,
  pathProgressSummary,
  pathStepHasContent,
  pathStepMeetsCondition,
} from './journeyProgress'
import useAppStore from '../../store/useAppStore'

/** A ctx whose 'design' condition is genuinely false. */
const emptyCtx = (pathDone, pathReached) => ({
  project: { ...(pathDone ? { pathDone } : {}), ...(pathReached ? { pathReached } : {}) },
  moodItems: [],
  tasks: [],
})

/** A ctx whose 'design' condition is genuinely true (a real tagline). */
const filledCtx = (pathDone) => ({
  project: { tagline: 'Made to last', ...(pathDone ? { pathDone } : {}) },
  moodItems: [],
  tasks: [],
})

describe('manual Mark done — the flag outranks the app', () => {
  it('marks an empty stage done', () => {
    expect(pathStepMeetsCondition('design', emptyCtx())).toBe(false)
    expect(pathStepHasContent('design', emptyCtx())).toBe(false)
    expect(pathStepHasContent('design', emptyCtx({ design: true }))).toBe(true)
  })

  it('un-marks a stage whose live condition is true', () => {
    // Touchpoints has already shipped a bug where onboarding auto-ticked it
    // before any work existed. If the toggle only worked in one direction the
    // user could see a tick they disagree with and have no way to clear it.
    expect(pathStepHasContent('design', filledCtx())).toBe(true)
    expect(pathStepHasContent('design', filledCtx({ design: false }))).toBe(false)
  })

  it('un-marks a stage that the latch is holding', () => {
    const latched = emptyCtx(null, { design: true })
    expect(pathStepHasContent('design', latched)).toBe(true)
    const overridden = emptyCtx({ design: false }, { design: true })
    expect(pathStepHasContent('design', overridden)).toBe(false)
  })

  it('hands back to the app when the verdict is absent', () => {
    expect(pathStepHasContent('design', emptyCtx({}))).toBe(false)
    expect(pathStepHasContent('design', filledCtx({}))).toBe(true)
  })

  it('is scoped to the stage it names', () => {
    const ctx = emptyCtx({ design: true })
    expect(pathStepHasContent('design', ctx)).toBe(true)
    expect(pathStepHasContent('deliver', ctx)).toBe(false)
  })
})

describe('one tick, one meaning — the flag counts everywhere', () => {
  const ctx = emptyCtx({ design: true })

  it('shows done in the progress summary the rail and dots read', () => {
    const rows = pathProgressSummary(JOURNEY_STEPS, ctx)
    expect(rows.find((r) => r.id === 'design').done).toBe(true)
  })

  it('drops the stage from "what\'s missing"', () => {
    const missing = pathMissingLabels(JOURNEY_STEPS, ctx)
    expect(missing).not.toContain('Identity')
  })

  it('is skipped by the next-gap jump', () => {
    // A gap-finder that argues back gets ignored, and it is the app's main
    // task-initiation mechanism.
    /* Derived, not listed. Spelled out as four ids this silently stopped
       meaning "everything except design" the moment the path grew — Directions
       was simply absent from the map, so it read as an unreached gap and the
       assertion failed for a reason that had nothing to do with the flag. */
    const onlyDesignLeft = {
      project: {
        pathReached: Object.fromEntries(
          JOURNEY_STEPS.filter((s) => s.id !== 'design').map((s) => [s.id, true])
        ),
        pathDone: { design: true },
      },
      moodItems: [],
      tasks: [],
    }
    expect(pathFirstGap(JOURNEY_STEPS, onlyDesignLeft)).toBe(null)
  })

  it('a manually un-marked stage becomes the next gap', () => {
    const allDone = {
      project: {
        pathReached: Object.fromEntries(JOURNEY_STEPS.map((s) => [s.id, true])),
        pathDone: { design: false },
      },
      moodItems: [],
      tasks: [],
    }
    expect(pathFirstGap(JOURNEY_STEPS, allDone)?.id).toBe('design')
  })
})

describe('setStepDone store action', () => {
  const project = () => {
    const st = useAppStore.getState()
    return st.projects.find((p) => p.id === st.currentProjectId)
  }

  const fresh = () => {
    useAppStore.getState().clearToEmpty()
    useAppStore.getState().createNewProject('Done test')
  }

  it('starts with no verdict on any stage', () => {
    fresh()
    expect(project().pathDone).toEqual({})
  })

  it('records true, false, and clears back to auto', () => {
    fresh()
    useAppStore.getState().setStepDone('design', true)
    expect(project().pathDone.design).toBe(true)

    useAppStore.getState().setStepDone('design', false)
    expect(project().pathDone.design).toBe(false)

    useAppStore.getState().setStepDone('design', null)
    expect('design' in project().pathDone).toBe(false)
  })

  it('does not disturb other stages', () => {
    fresh()
    useAppStore.getState().setStepDone('design', true)
    useAppStore.getState().setStepDone('deliver', false)
    expect(project().pathDone).toEqual({ design: true, deliver: false })
  })

  it('ignores an empty stepId rather than writing a junk key', () => {
    fresh()
    useAppStore.getState().setStepDone('', true)
    expect(project().pathDone).toEqual({})
  })

  it('gives each project its own verdicts', () => {
    fresh()
    const first = project().id
    useAppStore.getState().setStepDone('design', true)
    const second = useAppStore.getState().createNewProject('Other')
    expect(project().pathDone).toEqual({})
    expect(
      useAppStore.getState().projects.find((p) => p.id === first).pathDone
    ).toEqual({ design: true })
    expect(second.id).not.toBe(first)
  })

  it('writes to the project named, not whichever is current', () => {
    fresh()
    const first = project().id
    useAppStore.getState().createNewProject('Other')
    useAppStore.getState().setStepDone('design', true, first)
    expect(
      useAppStore.getState().projects.find((p) => p.id === first).pathDone
    ).toEqual({ design: true })
    expect(project().pathDone).toEqual({})
  })
})
