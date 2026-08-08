import { describe, expect, it } from 'vitest'
import useAppStore, { TEMPLATE_STYLE_KEYS } from '../../store/useAppStore'
import { buildBrandPackSnapshot } from '../book/exportFiles'
import { buildJsonTokens } from '../brandSystem'
import { paletteSnapshot } from './artifactSnapshot'
import { refKey, resolveRef } from './artifactRef'

/**
 * An existing workspace must load, keep every value, and export the same
 * bytes. v6 adds three things and removes nothing:
 *
 *   moodItems[].favorite      — true where `inPack` was, because a pin already
 *                               on the client's shortlist was one the designer
 *                               liked. `inPack` itself is untouched; 51 call
 *                               sites read it.
 *   project.artifacts         — {} on every existing project.
 *   project.designerSurfaces  — [] on every existing project.
 */

/** A workspace persisted before any of this existed. */
const v5Workspace = () => ({
  moodItems: [
    { id: 1, projectId: 'p1', type: 'image', visual: 'a', inPack: true, boardOrder: 0, packOrder: 0 },
    { id: 2, projectId: 'p1', type: 'image', visual: 'b', inPack: false, boardOrder: 1 },
    { id: 3, projectId: 'p1', type: 'note', note: 'n', inPack: true, boardOrder: 2, packOrder: 1, packHero: true },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Old project',
      detective: { clientName: 'Harbor & Hearth', clientPhone: '0100 000 000' },
      palette: ['#1C1917', '#0F766E'],
      colorRoles: { cover: '#1C1917' },
      typeHeading: 'Fraunces SemiBold',
      tagline: 'Quiet confidence',
      feedbackNotes: '• tighten the mark',
    },
  ],
  currentProjectId: 'p1',
})

const migrate = (persisted, from = 5) => {
  const opts = useAppStore.persist.getOptions()
  return opts.migrate(persisted, from)
}

describe('an existing workspace still loads', () => {
  const out = migrate(v5Workspace())

  it('keeps every pin and every project', () => {
    expect(out.moodItems).toHaveLength(3)
    expect(out.projects).toHaveLength(1)
  })

  it('keeps every value the designer had typed', () => {
    const p = out.projects[0]
    expect(p.tagline).toBe('Quiet confidence')
    expect(p.typeHeading).toBe('Fraunces SemiBold')
    expect(p.palette).toEqual(['#1C1917', '#0F766E'])
    expect(p.feedbackNotes).toBe('• tighten the mark')
    expect(p.detective.clientName).toBe('Harbor & Hearth')
  })

  it('leaves the client pack exactly as it was', () => {
    const byId = Object.fromEntries(out.moodItems.map((m) => [m.id, m]))
    expect(byId[1].inPack).toBe(true)
    expect(byId[2].inPack).toBe(false)
    expect(byId[3].packHero).toBe(true)
    expect(byId[3].packOrder).toBe(1)
  })

  it('reads a shortlisted pin as one the designer liked', () => {
    const byId = Object.fromEntries(out.moodItems.map((m) => [m.id, m]))
    expect(byId[1].favorite).toBe(true)
    expect(byId[3].favorite).toBe(true)
    expect(byId[2].favorite).toBe(false)
  })

  it('gives every project the new containers, empty rather than absent', () => {
    expect(out.projects[0].artifacts).toEqual({})
    expect(out.projects[0].designerSurfaces).toEqual([])
  })

  it('is idempotent — running it again changes nothing', () => {
    expect(migrate(out, 6)).toEqual(out)
  })

  it('never overwrites a favorite the designer already set', () => {
    const held = v5Workspace()
    held.moodItems[0].favorite = false // liked the pack pin, then un-liked it
    expect(migrate(held).moodItems[0].favorite).toBe(false)
  })

  it('survives a workspace with no pins and no projects', () => {
    expect(() => migrate({ moodItems: [], projects: [] })).not.toThrow()
    expect(() => migrate(null)).not.toThrow()
  })
})

describe('exports are unchanged', () => {
  const project = migrate(v5Workspace()).projects[0]

  it('the pack snapshot carries no new keys', () => {
    const pack = buildBrandPackSnapshot({ project, tasks: [], moodItems: [] })
    expect(pack.artifacts).toBeUndefined()
    expect(pack.designerSurfaces).toBeUndefined()
    expect(pack.projectName).toBe('Harbor & Hearth')
    expect(pack.tagline).toBe('Quiet confidence')
  })

  it('tokens.json is untouched by any of this', () => {
    const json = buildJsonTokens(
      buildBrandPackSnapshot({ project, tasks: [], moodItems: [] })
    )
    expect(json.logo.defaults).toEqual(['clearspace', 'minSize', 'donts'])
    expect(JSON.stringify(json)).not.toMatch(/artifacts|designerSurfaces|favorite/)
  })
})

describe('artifacts are a project’s own working data', () => {
  it('a template may not carry them to another client', () => {
    // A template is a house STYLE. Another project's palette snapshots are
    // exactly the copy this whole phase exists to prevent.
    expect(TEMPLATE_STYLE_KEYS).not.toContain('artifacts')
    expect(TEMPLATE_STYLE_KEYS).not.toContain('designerSurfaces')
  })

  it('storing one twice stores it once', () => {
    useAppStore.getState().clearToEmpty()
    useAppStore.getState().createNewProject('Artifacts')
    const s = () => useAppStore.getState()
    const cur = () => s().projects.find((p) => p.id === s().currentProjectId)

    const snap = paletteSnapshot(cur())
    const a = s().putArtifact(snap)
    const b = s().putArtifact(paletteSnapshot(cur()))
    expect(refKey(a)).toBe(refKey(b))
    expect(Object.keys(cur().artifacts)).toHaveLength(1)
    expect(resolveRef(cur(), a).hexes).toEqual(snap.hexes)
  })

  it('refuses a record with no declared kind', () => {
    const s = useAppStore.getState()
    expect(s.putArtifact({ id: 'x', kind: 'bogus' })).toBeNull()
    expect(s.putArtifact(null)).toBeNull()
  })
})
