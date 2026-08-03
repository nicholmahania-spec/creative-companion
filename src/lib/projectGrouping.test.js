import { describe, it, expect } from 'vitest'
import { groupProjectsByClient, showClientHeadings } from './projectGrouping'

// Build a summary the way App.jsx does: { project, pathFull }
const sum = (id, clientName, pathFull = false) => ({
  project: { id, detective: clientName ? { clientName } : {} },
  pathFull,
})
const projs = (...ids) => ids.map((id) => ({ id }))
const ids = (groups) =>
  groups.map((g) => [g.clientName, g.projects.map((s) => s.project.id)])

describe('groupProjectsByClient', () => {
  it('orders in-progress before completed, stable by store order', () => {
    const summary = [
      sum('a', 'Acme', true), // done
      sum('b', 'Acme', false), // in progress
      sum('c', 'Acme', false), // in progress
    ]
    const groups = groupProjectsByClient(summary, projs('a', 'b', 'c'))
    // one client → one group, in-progress first (store order b before c), done sunk
    expect(ids(groups)).toEqual([['Acme', ['b', 'c', 'a']]])
  })

  it('orders needs-you (unread) before other in-progress', () => {
    const summary = [
      { ...sum('a', 'Acme', false), hasUnreadClient: false },
      { ...sum('b', 'Acme', false), hasUnreadClient: true },
      { ...sum('c', 'Acme', true), hasUnreadClient: false },
    ]
    const groups = groupProjectsByClient(summary, projs('a', 'b', 'c'))
    expect(ids(groups)).toEqual([['Acme', ['b', 'a', 'c']]])
  })

  it('puts unclienten projects UNLABELED at the top, above named clients', () => {
    const summary = [
      sum('a', 'Acme'),
      sum('b', ''), // no client
      sum('c', 'Acme'),
    ]
    const groups = groupProjectsByClient(summary, projs('a', 'b', 'c'))
    expect(groups[0].clientName).toBeNull()
    expect(groups[0].projects.map((s) => s.project.id)).toEqual(['b'])
    expect(groups[1].clientName).toBe('Acme')
  })

  it('groups repeat clients together', () => {
    const summary = [
      sum('a', 'Acme'),
      sum('b', 'Beta'),
      sum('c', 'Acme'),
    ]
    const groups = groupProjectsByClient(summary, projs('a', 'b', 'c'))
    expect(ids(groups)).toEqual([
      ['Acme', ['a', 'c']],
      ['Beta', ['b']],
    ])
  })

  it('treats whitespace-only client names as unclienten', () => {
    const groups = groupProjectsByClient(
      [sum('a', '   ')],
      projs('a')
    )
    expect(groups).toEqual([
      { key: '__none__', clientName: null, projects: [expect.anything()] },
    ])
  })

  it('is deterministic — equal-status rows never swap on re-run', () => {
    const summary = [sum('a', 'Acme'), sum('b', 'Acme')]
    const once = ids(groupProjectsByClient(summary, projs('a', 'b')))
    const twice = ids(groupProjectsByClient(summary, projs('a', 'b')))
    expect(once).toEqual(twice)
    expect(once).toEqual([['Acme', ['a', 'b']]])
  })
})

describe('showClientHeadings', () => {
  it('is false for a single named client (flat list, no heading tax)', () => {
    const groups = groupProjectsByClient(
      [sum('a', 'Acme'), sum('b', 'Acme')],
      projs('a', 'b')
    )
    expect(showClientHeadings(groups)).toBe(false)
  })

  it('is false when there are no named clients', () => {
    const groups = groupProjectsByClient(
      [sum('a', ''), sum('b', '')],
      projs('a', 'b')
    )
    expect(showClientHeadings(groups)).toBe(false)
  })

  it('is true only when ≥2 named clients collide', () => {
    const groups = groupProjectsByClient(
      [sum('a', 'Acme'), sum('b', 'Beta')],
      projs('a', 'b')
    )
    expect(showClientHeadings(groups)).toBe(true)
  })

  it('a no-client bucket does not count toward the ≥2 threshold', () => {
    const groups = groupProjectsByClient(
      [sum('a', ''), sum('b', 'Acme')],
      projs('a', 'b')
    )
    // one named client + one no-client bucket → still flat
    expect(showClientHeadings(groups)).toBe(false)
  })
})
