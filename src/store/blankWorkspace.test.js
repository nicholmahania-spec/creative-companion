import { describe, expect, it } from 'vitest'
import {
  blankWorkspaceState,
  createBlankProject,
  seedProjects,
  seedTasks,
  seedMoodItems,
  blankDetective,
} from './useAppStore'
import useAppStore from './useAppStore'

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
    // Stone defaults — not indigo SaaS residue
    expect(p.palette[0].toUpperCase()).toBe('#1C1917')
    expect(p.palette.join(' ').toUpperCase()).not.toMatch(/#4F46E5/)
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

  it('createBlankProject has detective sheet + designVersion', () => {
    const p = createBlankProject('Demo', '')
    expect(p.detective).toEqual(blankDetective())
    expect(p.designVersion).toBe('v1')
    expect(p.directions).toHaveLength(3)
  })

  it('bumpDesignVersion increments vN', () => {
    const p = useAppStore.getState().createNewProject('Bump Co', 'Brief')
    useAppStore.setState({
      projects: useAppStore.getState().projects.map((proj) =>
        proj.id === p.id ? { ...proj, designVersion: 'v1' } : proj
      ),
      currentProjectId: p.id,
    })
    const r1 = useAppStore.getState().bumpDesignVersion()
    expect(r1.ok).toBe(true)
    expect(r1.version).toBe('v2')
    const r2 = useAppStore.getState().bumpDesignVersion()
    expect(r2.version).toBe('v3')
  })

  it('bumpDesignVersionIfV1 only bumps once from v1', () => {
    const p = useAppStore.getState().createNewProject('Kit Co', 'Brief')
    useAppStore.setState({
      projects: useAppStore.getState().projects.map((proj) =>
        proj.id === p.id ? { ...proj, designVersion: 'v1' } : proj
      ),
      currentProjectId: p.id,
    })
    const a = useAppStore.getState().bumpDesignVersionIfV1()
    expect(a.bumped).toBe(true)
    expect(a.version).toBe('v2')
    const b = useAppStore.getState().bumpDesignVersionIfV1()
    expect(b.bumped).toBe(false)
    expect(b.version).toBe('v2')
  })
})
