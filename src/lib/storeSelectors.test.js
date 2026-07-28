import { describe, expect, it } from 'vitest'
import { projectShellEqual, projectsShellEqual } from './storeSelectors'

describe('projectShellEqual', () => {
  it('ignores detective changes', () => {
    const a = { id: '1', name: 'A', detective: { goal: 'x' } }
    const b = { id: '1', name: 'A', detective: { goal: 'y' } }
    expect(projectShellEqual(a, b)).toBe(true)
  })

  it('notices name changes', () => {
    const a = { id: '1', name: 'A', detective: { goal: 'x' } }
    const b = { id: '1', name: 'B', detective: { goal: 'x' } }
    expect(projectShellEqual(a, b)).toBe(false)
  })
})

describe('projectsShellEqual', () => {
  it('treats detective-only updates as equal', () => {
    const a = [{ id: '1', name: 'A', detective: { goal: '1' } }]
    const b = [{ id: '1', name: 'A', detective: { goal: '2' } }]
    expect(projectsShellEqual(a, b)).toBe(true)
  })
})
