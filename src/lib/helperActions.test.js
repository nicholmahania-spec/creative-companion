/**
 * The Helper proposes; the user applies.
 *
 * This is the only route from a model reply to project data, so the tests
 * that matter are the ones about what it CANNOT do.
 *
 * The failure being designed against is not "the model suggests something
 * silly" — you can read a silly button and not press it. It is the model
 * changing something while you read a paragraph, and you finding out later.
 * Silent state loss is the thing this app exists to be the opposite of, and
 * the brief is a client record with no undo.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  HELPER_ACTIONS,
  MAX_PROPOSALS,
  actionCatalogueForPrompt,
  applyProposal,
  parseProposals,
} from './helperActions.js'

describe('what the Helper may touch', () => {
  it('exposes only additive, reversible actions', () => {
    // A destructive mistake is a thing you no longer have; an additive one is
    // a row you delete. Widening this is a decision, so it fails loudly here.
    expect(Object.keys(HELPER_ACTIONS).sort()).toEqual(['add_task', 'split_task'])
  })

  it('cannot reach the brief or any client data', () => {
    const src = Object.values(HELPER_ACTIONS)
      .map((a) => a.hint + JSON.stringify(a))
      .join(' ')
    for (const forbidden of ['detective', 'brief', 'clientName', 'delete', 'archive']) {
      expect(src.toLowerCase()).not.toContain(forbidden.toLowerCase())
    }
  })

  it('every action can describe itself in the user\'s words', () => {
    // The button text is the only thing standing between a proposal and a
    // press. An action that cannot say what it does must not be offered.
    for (const a of Object.values(HELPER_ACTIONS)) {
      const args = a.parse({ title: 'Draft the logo brief' }) || {}
      const label = a.describe(args)
      expect(label, `${a.id} has no description`).toBeTruthy()
      expect(label).not.toMatch(/\b(add_task|split_task|args|null|undefined)\b/)
    }
  })
})

describe('parsing a reply', () => {
  it('strips the machinery out of what the user reads', () => {
    const { text, proposals } = parseProposals(
      'Try breaking it down.\n```json\n{"actions":[{"id":"add_task","args":{"title":"Sketch three marks"}}]}\n```'
    )
    expect(text).toBe('Try breaking it down.')
    expect(text).not.toMatch(/json|actions|add_task/)
    expect(proposals).toHaveLength(1)
    expect(proposals[0].label).toContain('Sketch three marks')
  })

  it('returns no proposals for an ordinary answer', () => {
    const { text, proposals } = parseProposals('Start with the smallest piece.')
    expect(text).toBe('Start with the smallest piece.')
    expect(proposals).toEqual([])
  })

  it('drops unknown actions rather than surfacing them', () => {
    // A model naming an action that does not exist must not produce a button
    // whose behaviour nobody has defined.
    const { proposals } = parseProposals(
      '```json\n{"actions":[{"id":"delete_project","args":{}},{"id":"add_task","args":{"title":"ok"}}]}\n```'
    )
    expect(proposals.map((p) => p.id)).toEqual(['add_task'])
  })

  it('drops an action whose arguments are unusable', () => {
    const { proposals } = parseProposals(
      '```json\n{"actions":[{"id":"add_task","args":{"title":"   "}}]}\n```'
    )
    expect(proposals).toEqual([])
  })

  it('survives malformed json without throwing', () => {
    const { text, proposals } = parseProposals('Here.\n```json\n{not json\n```')
    expect(text).toBe('Here.')
    expect(proposals).toEqual([])
  })

  it('caps how many proposals one reply may carry', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: 'add_task',
      args: { title: `task ${i}` },
    }))
    const { proposals } = parseProposals(
      '```json\n' + JSON.stringify({ actions: many }) + '\n```'
    )
    expect(proposals.length).toBe(MAX_PROPOSALS)
  })
})

describe('applying is the only thing that writes', () => {
  it('parsing a reply performs no writes at all', () => {
    const addTask = vi.fn()
    const breakIntoSteps = vi.fn()
    parseProposals(
      '```json\n{"actions":[{"id":"add_task","args":{"title":"x"}},{"id":"split_task","args":{}}]}\n```'
    )
    // The whole design in one assertion: reading a reply changes nothing.
    expect(addTask).not.toHaveBeenCalled()
    expect(breakIntoSteps).not.toHaveBeenCalled()
  })

  it('add_task writes one task with the proposed title', () => {
    const addTask = vi.fn()
    const res = applyProposal(
      { id: 'add_task', args: { title: 'Sketch three marks' } },
      { addTask, projectId: 'p1' }
    )
    expect(res.ok).toBe(true)
    expect(addTask).toHaveBeenCalledTimes(1)
    const task = addTask.mock.calls[0][0]
    expect(task.title).toBe('Sketch three marks')
    expect(task.projectId).toBe('p1')
    expect(task.completed).toBe(false)
  })

  it('split_task refuses when there is nothing to split', () => {
    const breakIntoSteps = vi.fn()
    const res = applyProposal({ id: 'split_task', args: {} }, { breakIntoSteps })
    expect(res.ok).toBe(false)
    expect(breakIntoSteps).not.toHaveBeenCalled()
    // And says so, rather than reporting a success that did nothing.
    expect(res.note).toMatch(/no open to-do/i)
  })

  it('an unknown action does nothing and says so', () => {
    const addTask = vi.fn()
    const res = applyProposal({ id: 'wipe_everything', args: {} }, { addTask })
    expect(res.ok).toBe(false)
    expect(addTask).not.toHaveBeenCalled()
  })
})

describe('the prompt tells the model the rules', () => {
  it('states that the user applies, not the model', () => {
    const p = actionCatalogueForPrompt()
    expect(p).toMatch(/user applies/i)
    expect(p).toMatch(/never claim/i)
  })

  it('offers only the catalogued actions', () => {
    const p = actionCatalogueForPrompt()
    for (const id of Object.keys(HELPER_ACTIONS)) expect(p).toContain(id)
    expect(p).not.toMatch(/updateDetective|updateProjectBrief/)
  })
})
