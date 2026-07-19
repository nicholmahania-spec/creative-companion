import { describe, expect, it } from 'vitest'
import {
  blankWorkspaceState,
  createBlankProject,
} from '../store/useAppStore'
import {
  buildBrandPackSnapshot,
  packReadiness,
  selectPackPins,
} from './exportFiles'

describe('backup / pack smoke (logic)', () => {
  it('blank workspace serializes and restores shape', () => {
    const a = blankWorkspaceState()
    const json = JSON.stringify({
      projects: a.projects,
      tasks: a.tasks,
      moodItems: a.moodItems,
      prefs: a.prefs,
    })
    const b = JSON.parse(json)
    expect(b.projects).toHaveLength(1)
    expect(b.tasks).toEqual([])
    expect(b.moodItems).toEqual([])
  })

  it('selectPackPins ignores unstarred pins', () => {
    const { pins } = selectPackPins([
      { id: 1, inPack: false, note: 'no' },
      { id: 2, inPack: true, note: 'yes', packOrder: 0 },
    ])
    expect(pins).toHaveLength(1)
    expect(pins[0].note).toBe('yes')
  })

  it('packReadiness deep-links missing tagline to Design essentials', () => {
    const pack = buildBrandPackSnapshot({
      project: createBlankProject('Demo', 'Brief here'),
      tasks: [],
      moodItems: [],
    })
    const r = packReadiness(pack)
    const tag = r.checks.find((c) => c.id === 'tagline')
    expect(tag.ok).toBe(false)
    expect(tag.view).toBe('brand')
    expect(tag.section).toBe('essentials')
    // Brief fills detective + positioning; still missing pins/tagline/voice
    expect(r.checks.find((c) => c.id === 'detective')?.ok).toBe(true)
    expect(r.checks.find((c) => c.id === 'pins')?.ok).toBe(false)
    expect(r.checks.find((c) => c.id === 'handoff')?.view).toBe('finish')
  })
})
