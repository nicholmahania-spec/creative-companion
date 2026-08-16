import { describe, expect, it } from 'vitest'
import { JOURNEY_STEPS } from './journey.js'
import { PROJECT_TYPES } from './projectTypes.js'
import {
  STOP_GROUPS,
  STOPS_THAT_FIT,
  groupBreaksFor,
  groupIdForStep,
} from './stopGroups.js'

const ALL = JOURNEY_STEPS.map((s) => s.id)
const typeSteps = (id) => PROJECT_TYPES.find((t) => t.id === id).stepIds

describe('the groups themselves', () => {
  it('claims every journey stop exactly once', () => {
    const claimed = STOP_GROUPS.flatMap((g) => g.stepIds)
    expect([...claimed].sort()).toEqual([...ALL].sort())
    expect(claimed.length).toBe(new Set(claimed).size)
  })

  /* The seam is drawn from the journey's own order, so a group whose members
     are not contiguous in that order would ask for a break in the middle of
     itself and get a rail that reads as four groups, not three. */
  it('keeps each group contiguous in journey order', () => {
    for (const g of STOP_GROUPS) {
      const idx = g.stepIds.map((id) => ALL.indexOf(id))
      expect(idx).toEqual([...idx].sort((a, b) => a - b))
      expect(Math.max(...idx) - Math.min(...idx)).toBe(idx.length - 1)
    }
  })

  it('puts Directions in groundwork and Identity in design', () => {
    expect(groupIdForStep('ideate')).toBe('groundwork')
    expect(groupIdForStep('design')).toBe('design')
    expect(groupIdForStep('sketch')).toBe('design')
    expect(groupIdForStep('unknown-step')).toBe(null)
  })
})

describe('where the seams fall', () => {
  it('breaks before Identity and Brand book on the full path', () => {
    expect([...groupBreaksFor(ALL)]).toEqual(['design', 'book'])
  })

  it('never opens a seam above the first stop', () => {
    for (const t of PROJECT_TYPES) {
      const breaks = groupBreaksFor(t.stepIds)
      expect(breaks.has(t.stepIds[0])).toBe(false)
    }
  })

  /* A group with nothing active contributes no seam, so a reduced rail does
     not carry a gap where its missing stops would have been. */
  it('collapses an empty group rather than leaving its seam behind', () => {
    // logo: no Directions, no Touchpoints, no Brand book
    expect([...groupBreaksFor(typeSteps('logo'))]).toEqual(['design', 'deliver'])
    // design group entirely absent — one seam, not two
    expect([...groupBreaksFor(['define', 'research', 'ideate', 'book', 'deliver'])]).toEqual(['book'])
    // groundwork entirely absent — the rail opens on design, which is not a seam
    expect([...groupBreaksFor(['design', 'sketch', 'book', 'deliver'])]).toEqual(['book'])
  })

  /* expansion is Brief / Touchpoints / Delivery — three stops, measured 252px
     against a 266px ceiling. It has no collision to solve, so it gets no gap. */
  it('adds nothing to a rail short enough to already fit', () => {
    expect([...groupBreaksFor(typeSteps('expansion'))]).toEqual([])
    expect(groupBreaksFor(ALL.slice(0, STOPS_THAT_FIT)).size).toBe(0)
    expect(groupBreaksFor([]).size).toBe(0)
    expect(groupBreaksFor(null).size).toBe(0)
  })

  it('adds a seam as soon as the rail is one stop past fitting', () => {
    const four = ALL.slice(0, STOPS_THAT_FIT + 1)
    expect(groupBreaksFor(four).size).toBeGreaterThan(0)
  })

  it('handles arbitrary custom subsets without inventing a group', () => {
    const custom = ['define', 'ideate', 'sketch', 'deliver']
    expect([...groupBreaksFor(custom)]).toEqual(['sketch', 'deliver'])
    // an id no group claims cannot open one
    expect([...groupBreaksFor(['define', 'research', 'ideate', 'review', 'design'])]).toEqual(['design'])
  })

  it('never marks a stop that is not on the rail', () => {
    for (const t of PROJECT_TYPES) {
      for (const id of groupBreaksFor(t.stepIds)) {
        expect(t.stepIds).toContain(id)
      }
    }
  })
})
