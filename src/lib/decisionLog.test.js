import { describe, it, expect } from 'vitest'
import {
  appendDecision,
  latestDecision,
  formatDecisionLine,
  decisionFromDirection,
  chosenDirection,
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

  it('replaces prior direction pick (one active)', () => {
    const a = appendDecision([], {
      kind: 'direction',
      directionId: 'a',
      label: 'A',
      title: 'Bold',
      why: 'loud',
    })
    const b = appendDecision(a, {
      kind: 'direction',
      directionId: 'b',
      label: 'B',
      title: 'Soft',
      why: 'quiet',
    })
    expect(b).toHaveLength(1)
    expect(b[0].label).toBe('B')
  })

  it('ignores empty', () => {
    expect(appendDecision([{ id: 1, title: 'x', kind: 'note' }], {})).toHaveLength(
      1
    )
  })
})

describe('formatDecisionLine', () => {
  it('formats chose + because', () => {
    const line = formatDecisionLine({
      label: 'B',
      title: 'Quiet teal',
      why: 'calm clinic',
    })
    expect(line).toBe('Chose B: Quiet teal — because calm clinic')
  })
})

describe('decisionFromDirection / chosenDirection', () => {
  it('maps card fields', () => {
    const e = decisionFromDirection({
      id: 'c',
      label: 'C',
      title: 'Warm paper',
      note: 'editorial',
    })
    expect(e.why).toBe('editorial')
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
    expect(other[0].directionId).toBe('b')
    expect(other[0].at).not.toBe(1000)
  })
})
