/**
 * Revision rounds as the store actually runs them.
 *
 * `revisions.js` is pure and tested on its own; this covers the two things
 * only the store can get wrong, and both of them are about money:
 *
 *   1. billing is opt-in — going past the agreed count must never, on its
 *      own, put a line on an invoice a client will read
 *   2. a billed round lands in `timeLog`, the array the invoice bills from,
 *      and not in `workLog`, the private clock
 *
 * (2) matters because those two arrays were confused once already, and the
 * result was every idle page left open quietly becoming billable.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import useAppStore from './useAppStore'

const P = 'project-r'

const project = (over = {}) => ({
  id: P,
  name: P,
  detective: {},
  palette: [],
  directions: [],
  tasks: [],
  timeLog: [],
  workLog: [],
  revisionRounds: [],
  feedbackLog: [],
  scopeRevisionsIncluded: 2,
  scopeRevisionBilling: 'perRound',
  scopeRevisionRate: 150,
  ...over,
})

const cur = () => useAppStore.getState().projects.find((p) => p.id === P)

describe('revision rounds', () => {
  beforeEach(() => {
    useAppStore.setState({ projects: [project()], currentProjectId: P })
  })

  const runRounds = (n) => {
    const { startRevisionRound, closeRevisionRound } = useAppStore.getState()
    for (let i = 0; i < n; i += 1) {
      startRevisionRound('')
      closeRevisionRound()
    }
  }

  it('opens and closes a round', () => {
    const { startRevisionRound, closeRevisionRound } = useAppStore.getState()
    startRevisionRound('First pass')
    expect(cur().revisionRounds).toHaveLength(1)
    expect(cur().revisionRounds[0].closedAt).toBe('')
    expect(cur().revisionRounds[0].note).toBe('First pass')

    closeRevisionRound()
    expect(cur().revisionRounds[0].closedAt).toBeTruthy()
  })

  it('refuses a second open round', () => {
    const { startRevisionRound } = useAppStore.getState()
    startRevisionRound('a')
    startRevisionRound('b')
    // Two open rounds would make "which round am I on" unanswerable.
    expect(cur().revisionRounds).toHaveLength(1)
  })

  it('does not bill an extra round unless asked to', () => {
    runRounds(2) // both included
    const { startRevisionRound, closeRevisionRound } = useAppStore.getState()
    startRevisionRound('the third')
    closeRevisionRound() // no bill flag

    expect(cur().timeLog).toHaveLength(0)
    expect(cur().revisionRounds[2].billedAmount).toBe(0)
  })

  it('bills an extra round onto the invoice when asked', () => {
    runRounds(2)
    const { startRevisionRound, closeRevisionRound } = useAppStore.getState()
    startRevisionRound('the third')
    closeRevisionRound({ bill: true })

    const log = cur().timeLog
    expect(log).toHaveLength(1)
    expect(log[0].amount).toBe(150)
    expect(log[0].note).toMatch(/Revision round 3/)
    // A flat round is an amount, never invented hours.
    expect(log[0].hours).toBeUndefined()
    expect(cur().revisionRounds[2].billedAmount).toBe(150)

    // The private work clock is untouched — that separation is load-bearing.
    expect(cur().workLog).toHaveLength(0)
  })

  it('will not bill a round that was included, even if asked', () => {
    const { startRevisionRound, closeRevisionRound } = useAppStore.getState()
    startRevisionRound('the first')
    closeRevisionRound({ bill: true })
    // Round 1 of 2 is sold work. Ticking the box cannot make it extra.
    expect(cur().timeLog).toHaveLength(0)
  })

  it('bills hours x rate when the studio bills revisions hourly', () => {
    useAppStore.setState({
      projects: [
        project({ scopeRevisionBilling: 'hourly', scopeRevisionRate: 80 }),
      ],
      currentProjectId: P,
    })
    runRounds(2)
    const { startRevisionRound, closeRevisionRound } = useAppStore.getState()
    startRevisionRound('')
    closeRevisionRound({ bill: true, hours: 2.5 })

    expect(cur().timeLog[0].amount).toBe(200)
  })

  it('closing with nothing open changes nothing', () => {
    const before = cur()
    useAppStore.getState().closeRevisionRound({ bill: true })
    expect(cur()).toEqual(before)
  })
})

describe('feedback log', () => {
  beforeEach(() => {
    useAppStore.setState({ projects: [project()], currentProjectId: P })
  })

  it('logs an issue with its reviewer and decision', () => {
    useAppStore.getState().addFeedbackEntry({
      reviewer: 'Printer',
      issue: 'Gold foil patchy on Sage stock',
      decision: 'Pantone 871C on Cream',
    })
    const [f] = cur().feedbackLog
    expect(f.reviewer).toBe('Printer')
    expect(f.issue).toMatch(/Gold foil/)
    expect(f.status).toBe('open')
  })

  it('ignores an entry with no issue — the one field that carries meaning', () => {
    useAppStore.getState().addFeedbackEntry({ reviewer: 'Someone', issue: '  ' })
    expect(cur().feedbackLog).toHaveLength(0)
  })

  it('updates status and removes entries', () => {
    const { addFeedbackEntry, updateFeedbackEntry, removeFeedbackEntry } =
      useAppStore.getState()
    addFeedbackEntry({ issue: 'Logo too small on the card' })
    const id = cur().feedbackLog[0].id

    updateFeedbackEntry(id, { status: 'resolved', decision: 'Bumped to 14mm' })
    expect(cur().feedbackLog[0].status).toBe('resolved')
    expect(cur().feedbackLog[0].decision).toBe('Bumped to 14mm')

    removeFeedbackEntry(id)
    expect(cur().feedbackLog).toHaveLength(0)
  })
})

describe('deliberate rule-break marker', () => {
  beforeEach(() => {
    useAppStore.setState({
      projects: [
        project({
          decisionLog: [
            { id: 1, label: 'B', title: 'Quiet teal', why: 'calm' },
            { id: 2, label: 'C', title: 'No grid', why: 'chaos is the point' },
          ],
        }),
      ],
      currentProjectId: P,
    })
  })

  it('toggles on and back off', () => {
    const { toggleDecisionRuleBreak } = useAppStore.getState()
    toggleDecisionRuleBreak(2)
    expect(cur().decisionLog[1].breaksRule).toBe(true)
    toggleDecisionRuleBreak(2)
    expect(cur().decisionLog[1].breaksRule).toBe(false)
  })

  it('touches only the entry tapped', () => {
    useAppStore.getState().toggleDecisionRuleBreak(2)
    expect(cur().decisionLog[0].breaksRule).toBeUndefined()
  })

  it('adds nothing to the entry but the flag', () => {
    // The rejected design put a "which rule?" field on the capture form. The
    // marker must never grow one — the existing `why` is the explanation.
    useAppStore.getState().toggleDecisionRuleBreak(1)
    expect(Object.keys(cur().decisionLog[0]).sort()).toEqual([
      'breaksRule',
      'id',
      'label',
      'title',
      'why',
    ])
  })

  it('ignores an id that is not there', () => {
    const before = cur().decisionLog
    useAppStore.getState().toggleDecisionRuleBreak(999)
    expect(cur().decisionLog).toEqual(before)
  })
})
