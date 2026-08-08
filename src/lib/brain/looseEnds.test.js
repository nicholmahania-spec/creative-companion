import { describe, expect, it } from 'vitest'
import { clearLine, looseEnds } from './looseEnds'

/** A brief with every required answer given — the baseline for "clear". */
const filledBrief = {
  clientName: 'Sparrow’s Promise',
  engagementType: 'new',
  goal: 'stop looking smaller than we are',
  audience: 'new parents buying gifts',
  deliverablesPicked: ['logoPrimary'],
}

const project = (over = {}) => ({
  id: 'p1',
  detective: { ...filledBrief },
  ...over,
})

describe('the clear state', () => {
  it('is reachable on a real, finished project', () => {
    const r = looseEnds({ project: project() })
    expect(r.clear).toBe(true)
    expect(r.headline).toMatch(/clear/i)
  })

  it('says what it looked at rather than promising everything', () => {
    const r = looseEnds({ project: project() })
    expect(clearLine(r)).toMatch(/client messages/)
    expect(clearLine(r)).toMatch(/revision rounds/)
  })

  it('offers no clear line when there is something open', () => {
    const r = looseEnds({
      project: project({ revisionRounds: [{ id: 1 }] }),
    })
    expect(clearLine(r)).toBe('')
  })

  it('is not congratulatory', () => {
    const r = looseEnds({ project: project() })
    expect(`${r.headline} ${clearLine(r)}`).not.toMatch(
      /well done|great job|amazing|congrat/i
    )
  })
})

describe('what counts as waiting', () => {
  /**
   * Changed 2026-08-08. This used to assert that open tasks ARE loose ends.
   * They are not waiting on anybody — they are your own plan, they already
   * have a panel on this screen and a queue on Touchpoints, and counting
   * them here meant the number went UP as work got broken into steps. A
   * readout that punishes planning is worse than no readout.
   */
  it('does not count your own to-do list', () => {
    const r = looseEnds({
      project: project(),
      tasks: [
        { id: 1, completed: false },
        { id: 2, completed: false },
      ],
    })
    expect(r.ends.find((e) => e.id === 'tasks')).toBeUndefined()
    expect(r.clear).toBe(true)
  })

  it('counts unread client rows for THIS project only', () => {
    const r = looseEnds({
      project: project(),
      clientRows: [
        { id: 'a', unread: true, projectLocalId: 'p1' },
        { id: 'b', unread: true, projectLocalId: 'other' },
        { id: 'c', unread: false, projectLocalId: 'p1' },
      ],
    })
    expect(r.ends.find((e) => e.id === 'client').count).toBe(1)
  })

  it('matches a numeric project id against a string one', () => {
    const r = looseEnds({
      project: project({ id: 7 }),
      clientRows: [{ id: 'a', unread: true, projectLocalId: '7' }],
    })
    expect(r.ends.some((e) => e.id === 'client')).toBe(true)
  })

  it('counts a revision round only while it is open', () => {
    const open = looseEnds({ project: project({ revisionRounds: [{ id: 1 }] }) })
    expect(open.ends.some((e) => e.id === 'revisions')).toBe(true)

    const closed = looseEnds({
      project: project({ revisionRounds: [{ id: 1, closedAt: '2026-08-01' }] }),
    })
    expect(closed.ends.some((e) => e.id === 'revisions')).toBe(false)
  })

  it('counts feedback that was never decided', () => {
    const r = looseEnds({
      project: project({
        feedbackLog: [
          { id: 1, issue: 'icon too heavy' },
          { id: 2, issue: 'blue too cold', decision: 'warmed it' },
        ],
      }),
    })
    expect(r.ends.find((e) => e.id === 'feedback').count).toBe(1)
  })

  /**
   * The brief is the CLIENT's intake surface. An unanswered question on a
   * project that was never sent is work that has not started, and listing it
   * here turned the client's questions into the designer's chores on the
   * designer's own workspace ("Write the goal in the brief"). Strategy
   * already shows what is blank, without the framing.
   */
  it('does not make the client’s blank answers the designer’s chores', () => {
    const r = looseEnds({ project: { id: 'p1', detective: {} } })
    expect(r.ends.find((e) => e.id === 'brief')).toBeUndefined()
  })

  it('does report the client owing answers once the brief has been sent', () => {
    // Now it IS waiting on somebody, and says so.
    const r = looseEnds({
      project: {
        id: 'p1',
        detective: {},
        discoveryShareId: 'share-1',
        discoveryShareStatus: 'pending',
      },
    })
    const row = r.ends.find((e) => e.id === 'brief')
    expect(row.count).toBeGreaterThan(0)
    expect(row.label).toMatch(/waiting on the client/i)
  })

  it('stops reporting it once the client has submitted', () => {
    const r = looseEnds({
      project: {
        id: 'p1',
        detective: {},
        discoveryShareId: 'share-1',
        discoveryShareStatus: 'submitted',
      },
    })
    expect(r.ends.find((e) => e.id === 'brief')).toBeUndefined()
  })

  it('does not treat ordinary unfinished design work as a loose end', () => {
    /* No palette, no mark, no handoff note — none of that is WAITING on
       anyone, and counting it would make "clear" unreachable and the whole
       readout noise. The brand check is where undocumented work is stated. */
    const r = looseEnds({
      project: project({ palette: [], logoImage: '', handoffNote: '' }),
    })
    expect(r.clear).toBe(true)
  })
})

describe('robustness', () => {
  it('handles being called with nothing', () => {
    expect(() => looseEnds()).not.toThrow()
    // Nothing known means nothing is waiting on anyone — "clear" is honest
    // here, and inventing a gap for an empty argument would be the
    // ambient-reproach failure in miniature.
    expect(looseEnds().clear).toBe(true)
  })

  it('gives every end somewhere to go', () => {
    const r = looseEnds({
      project: project({
        revisionRounds: [{ id: 1 }],
        feedbackLog: [{ issue: 'Mark reads heavy', decision: '' }],
      }),
    })
    expect(r.ends.length).toBeGreaterThan(0)
    for (const e of r.ends) expect(e.view).toBeTruthy()
  })
})
