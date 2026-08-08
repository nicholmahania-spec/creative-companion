import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore from '../../store/useAppStore'
import { buildBrandPackSnapshot } from '../book/exportFiles'
import { IDENTITY_FIELDS } from '../journey/identityStamp'

/**
 * Who owns the positioning line.
 *
 * THE BUG THESE PIN. Identity's "Positioning" box wrote `project.brief`. But
 * `updateDetective` recomposes `project.brief` from the client's answers on
 * every keystroke — including the client's own, through the portal — so a
 * positioning line written by the designer was destroyed the next time
 * anybody touched any brief question, silently, with no way back.
 *
 * The other half: `project.positioning` was READ by the pack snapshot,
 * `bookContent`, `bookDocument` and `brandBookPdf`, and WRITTEN by nothing in
 * `src/` except the brand book builder. The brand book printed a heading for
 * a field the identity workspace could not fill.
 *
 * Both halves close with the same edit, so both are tested here together.
 */

const fresh = (name = 'Positioning test') => {
  useAppStore.getState().clearToEmpty()
  return useAppStore.getState().createNewProject(name)
}

const current = () => {
  const s = useAppStore.getState()
  return s.projects.find((p) => p.id === s.currentProjectId)
}

describe('the positioning line survives the brief', () => {
  beforeEach(() => {
    fresh()
  })

  it('is a field of its own on a new project', () => {
    expect(current().positioning).toBe('')
  })

  it('is not touched when the client answers a brief question', () => {
    const store = useAppStore.getState()
    store.updateBrandField('positioning', 'For makers who ship on the date')

    // The client fills in the brief — this recomposes `project.brief`.
    useAppStore.getState().updateDetective('goal', 'We look too small')
    useAppStore.getState().updateDetective('audience', 'Independent makers')
    useAppStore.getState().updateDetective('clientName', 'Harbor & Hearth')

    const p = current()
    expect(p.positioning).toBe('For makers who ship on the date')
    // …and the composed summary still did its own job.
    expect(p.brief).toContain('Harbor & Hearth')
    expect(p.brief).toContain('We look too small')
  })

  it('is never overwritten by the composed summary', () => {
    useAppStore.getState().updateDetective('goal', 'Look established')
    useAppStore
      .getState()
      .updateBrandField('positioning', 'Quiet confidence, made local')
    useAppStore.getState().updateDetective('story', 'Started in a kitchen')

    const p = current()
    expect(p.positioning).toBe('Quiet confidence, made local')
    expect(p.positioning).not.toContain('Goal:')
    expect(p.positioning).not.toContain('Story:')
  })

  it('reaches the pack the client receives', () => {
    useAppStore
      .getState()
      .updateBrandField('positioning', 'The mark that survives a stamp')
    const pack = buildBrandPackSnapshot({
      project: current(),
      tasks: [],
      moodItems: [],
    })
    expect(pack.positioning).toBe('The mark that survives a stamp')
  })

  it('stays empty rather than inheriting the composed summary', () => {
    // A run-on "Client: X Goal: Y Story: Z" is a working artefact, not a
    // sentence anyone wrote to be read. Printing it under a heading that
    // promises a positioning statement is the defect exportFiles corrected
    // for the book; the artboard now follows the same rule.
    useAppStore.getState().updateDetective('goal', 'Look established')
    const pack = buildBrandPackSnapshot({
      project: current(),
      tasks: [],
      moodItems: [],
    })
    expect(pack.brief).toContain('Goal:')
    expect(pack.positioning).toBe('')
  })

  it('counts as identity work, so an edit marks the identity moved', () => {
    expect(IDENTITY_FIELDS).toContain('positioning')
    expect(current().identityEditedAt).toBeFalsy()
    useAppStore.getState().updateBrandField('positioning', 'A line')
    expect(current().identityEditedAt).toBeTruthy()
  })
})
