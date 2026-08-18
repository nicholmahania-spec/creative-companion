import { describe, it, expect } from 'vitest'
import {
  appendDecision,
  latestDecision,
  formatDecisionLine,
  decisionFromDirection,
  chosenDirection,
  directionForLogEntry,
  isDirectionRecordId,
} from './decisionLog'

describe('appendDecision', () => {
  it('adds a direction decision', () => {
    const next = appendDecision([], {
      kind: 'direction',
      directionId: 'b',
      label: 'B',
      title: 'Quiet teal clinic',
      why: 'calm not clinical cold',
    })
    expect(next).toHaveLength(1)
    expect(next[0].title).toMatch(/Quiet teal/)
  })

  it('replaces only the same identity, and leaves a different subject', () => {
    const a = appendDecision([], {
      kind: 'direction',
      directionId: 'dir_old',
      title: 'Bold',
      why: 'loud',
    })
    const b = appendDecision(a, {
      kind: 'direction',
      directionId: 'dir_new',
      title: 'Soft',
      why: 'quiet',
    })
    expect(b).toHaveLength(2)
    expect(b.map((d) => d.directionId)).toEqual(['dir_old', 'dir_new'])
    expect(latestDecision(b, 'direction').title).toBe('Soft')
  })

  it('ignores empty', () => {
    expect(appendDecision([{ id: 1, title: 'x', kind: 'note' }], {})).toHaveLength(
      1
    )
  })
})

describe('formatDecisionLine', () => {
  it('names the route and says why', () => {
    const line = formatDecisionLine({ title: 'Quiet teal', why: 'calm clinic' })
    expect(line).toBe('Quiet teal — because calm clinic')
  })

  it('never prints the A/B/C letter, even from old stored entries', () => {
    /* THE LETTER IS A POSITION, NOT A NAME. It is derived from where a route
       sits among the routes that exist, so deleting one reflows the rest — and
       a line reading "Chose B" then names a place C no longer holds. Entries
       written before this carry a frozen `label`; the reader drops it rather
       than the data being migrated, so an old log reads correctly too. */
    const line = formatDecisionLine({
      label: 'B',
      directionId: 'b',
      title: 'Quiet teal',
      why: 'calm clinic',
    })
    expect(line).toBe('Quiet teal — because calm clinic')
    expect(line).not.toMatch(/\bChose\b|\bB\b/)
  })

  it('falls back to the title alone, never to the id', () => {
    expect(formatDecisionLine({ directionId: 'c', title: 'Warm paper' })).toBe(
      'Warm paper'
    )
  })
})

describe('decisionFromDirection / chosenDirection', () => {
  it('maps card fields to the durable recordId, not the slot', () => {
    const e = decisionFromDirection({
      id: 'c',
      recordId: 'dir_warm',
      title: 'Warm paper',
      note: 'editorial',
    })
    expect(e.why).toBe('editorial')
    expect(e.directionId).toBe('dir_warm')
    expect(isDirectionRecordId(e.directionId)).toBe(true)
  })

  it('falls back to the slot only when a historical row has no recordId', () => {
    const e = decisionFromDirection({
      id: 'c',
      title: 'Warm paper',
      note: 'editorial',
    })
    expect(e.directionId).toBe('c')
  })

  it('finds chosen dir on project', () => {
    const d = chosenDirection({
      directions: [
        { id: 'a', chosen: false, title: 'A' },
        { id: 'b', chosen: true, title: 'Winner', note: 'why' },
      ],
    })
    expect(d.id).toBe('b')
  })
})

describe('latestDecision', () => {
  it('returns last matching kind', () => {
    const log = [
      { kind: 'note', title: 'n1' },
      { kind: 'direction', title: 'd1', label: 'A' },
      { kind: 'note', title: 'n2' },
    ]
    expect(latestDecision(log, 'direction').title).toBe('d1')
    expect(latestDecision(log).title).toBe('n2')
  })
})

describe('refining a decision keeps when it was made', () => {
  it('preserves the original timestamp while the wording changes', () => {
    /* The store re-appends on every keystroke in the chosen direction's title
       or why. Without this, "decided at" tracked the last edit instead of the
       decision — the one thing rewording does not change. */
    const first = appendDecision([], {
      kind: 'direction',
      directionId: 'a',
      title: 'Harbour',
      why: 'coastal',
      at: 1000,
    })
    expect(first).toHaveLength(1)

    const refined = appendDecision(first, {
      kind: 'direction',
      directionId: 'a',
      title: 'Harbour & Hearth',
      why: 'coastal, warm',
    })
    expect(refined).toHaveLength(1)
    expect(refined[0].title).toBe('Harbour & Hearth')
    expect(refined[0].at).toBe(1000)
  })

  it('still honours an explicit timestamp', () => {
    const first = appendDecision([], {
      kind: 'direction', directionId: 'a', title: 'A', at: 1000,
    })
    const moved = appendDecision(first, {
      kind: 'direction', directionId: 'a', title: 'A', at: 5000,
    })
    expect(moved[0].at).toBe(5000)
  })

  it('a different direction starts its own clock', () => {
    const first = appendDecision([], {
      kind: 'direction', directionId: 'a', title: 'A', at: 1000,
    })
    const other = appendDecision(first, {
      kind: 'direction', directionId: 'b', title: 'B',
    })
    expect(other[other.length - 1].directionId).toBe('b')
    expect(other[other.length - 1].at).not.toBe(1000)
    expect(other.find((d) => d.directionId === 'a').at).toBe(1000)
  })
})

describe('a log row names a durable subject', () => {
  it('a recordId row resolves the live Direction with that recordId', () => {
    const project = {
      directions: [
        { id: 'a', recordId: 'dir_one', title: 'First' },
        { id: 'b', recordId: 'dir_two', title: 'Second' },
      ],
    }
    const hit = directionForLogEntry(project, { directionId: 'dir_two' })
    expect(hit.title).toBe('Second')
    expect(hit.id).toBe('b')
  })

  it('a slot-id row does not resolve a recreated Direction that has a recordId', () => {
    const project = {
      directions: [{ id: 'a', recordId: 'dir_new', title: 'Fresh A' }],
    }
    expect(directionForLogEntry(project, { directionId: 'a' })).toBeNull()
    expect(
      directionForLogEntry(project, { directionId: 'dir_old' })
    ).toBeNull()
  })

  it('a legacy slot-id row still resolves a Direction that never had a recordId', () => {
    const project = {
      directions: [{ id: 'a', title: 'Legacy A' }],
    }
    expect(directionForLogEntry(project, { directionId: 'a' }).title).toBe(
      'Legacy A'
    )
  })

  it('leaves a stored slot-id row unread-rewritten', () => {
    const row = {
      kind: 'direction',
      directionId: 'a',
      title: 'Old A',
      why: 'coastal',
    }
    expect(formatDecisionLine(row)).toBe('Old A — because coastal')
    expect(row.directionId).toBe('a')
  })
})
