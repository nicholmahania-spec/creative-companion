import { describe, expect, it } from 'vitest'
import {
  blankWorkspaceState,
  createBlankProject,
  seedProjects,
  seedTasks,
  seedMoodItems,
} from './useAppStore'

describe('blank workspace defaults', () => {
  it('starts with no fake clients or seed fiction', () => {
    expect(seedProjects).toEqual([])
    expect(seedTasks).toEqual([])
    expect(seedMoodItems).toEqual([])
  })

  it('createBlankProject has empty brand fields', () => {
    const p = createBlankProject('My work', 'Brief here')
    expect(p.name).toBe('My work')
    expect(p.brief).toBe('Brief here')
    expect(p.tagline).toBe('')
    expect(p.voice).toBe('')
    expect(p.doUse).toBe('')
    expect(p.dontUse).toBe('')
    expect(p.tasks).toEqual([])
    expect(p.palette.length).toBeGreaterThan(0)
  })

  it('blankWorkspaceState is empty desk with one blank project', () => {
    const s = blankWorkspaceState()
    expect(s.projects).toHaveLength(1)
    expect(s.projects[0].name).toBe('My project')
    expect(s.tasks).toEqual([])
    expect(s.moodItems).toEqual([])
    expect(s.breakKit).toEqual([])
    expect(s.onboarded).toBe(false)
    expect(s.currentProjectId).toBe(s.projects[0].id)
  })
})
