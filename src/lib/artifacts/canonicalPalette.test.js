import { describe, expect, it, beforeEach } from 'vitest'
import { makeRef, resolveRef } from './artifactRef'
import { paletteSnapshot } from './artifactSnapshot'
import useAppStore, {
  createBlankProject,
  withCanonicalPalette,
} from '../../store/useAppStore'
import { buildBrandPackSnapshot } from '../book/exportFiles'
import { buildColorSystem } from '../brandSystem'
import { TEMPLATE_STYLE_KEYS } from '../../store/useAppStore'

const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)

function fresh() {
  s().clearToEmpty()
  s().createNewProject('Canonical palette')
}

describe('canonical palette artifact', () => {
  beforeEach(fresh)

  it('exists after the store writes the live palette', () => {
    expect(cur().currentPaletteRef).toBeUndefined()
    s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    const p = cur()
    expect(p.palette).toEqual(['#1B4C7E', '#FAFAF9'])
    expect(p.currentPaletteRef.kind).toBe('palette')
    const snap = resolveRef(p, p.currentPaletteRef)
    expect(snap.kind).toBe('palette')
    expect(snap.id).toBe(p.currentPaletteRef.id)
    expect(snap.hexes).toEqual(['#1B4C7E', '#FAFAF9'])
    expect(snap.id).toBe(paletteSnapshot(p).id)
  })

  it('keeps project.palette as the compatibility view', () => {
    s().updatePaletteColor(0, '#123456')
    expect(Array.isArray(cur().palette)).toBe(true)
    expect(cur().palette[0].toUpperCase()).toBe('#123456')
  })

  it('mints a new id when the palette is replaced, and keeps the old artifact', () => {
    s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    const first = cur().currentPaletteRef.id
    const firstRow = cur().artifacts[first]
    s().setProjectPalette(['#111111', '#EEEEEE'])
    const second = cur().currentPaletteRef.id
    expect(second).not.toBe(first)
    expect(cur().artifacts[first]).toEqual(firstRow)
    expect(resolveRef(cur(), makeRef('palette', first)).hexes).toEqual([
      '#1B4C7E',
      '#FAFAF9',
    ])
    expect(resolveRef(cur(), makeRef('palette', second)).hexes).toEqual([
      '#111111',
      '#EEEEEE',
    ])
    expect(cur().palette).toEqual(['#111111', '#EEEEEE'])
  })

  it('a palette ref cannot resolve a typePairing or a mark', () => {
    s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    const palId = cur().currentPaletteRef.id
    expect(resolveRef(cur(), makeRef('typePairing', palId))).toBeNull()
    expect(resolveRef(cur(), makeRef('markConcept', palId))).toBeNull()
    expect(resolveRef(cur(), makeRef('direction', palId))).toBeNull()
    expect(resolveRef(cur(), makeRef('palette', palId)).kind).toBe('palette')
  })

  it('existing projects without the artifact still load', () => {
    const opts = useAppStore.persist.getOptions()
    const out = opts.migrate(
      {
        moodItems: [],
        projects: [
          {
            id: 'old',
            name: 'Legacy',
            palette: ['#0C0A09', '#FAFAF9'],
          },
        ],
      },
      6
    )
    const p = out.projects[0]
    expect(p.palette).toEqual(['#0C0A09', '#FAFAF9'])
    expect(p.currentPaletteRef).toBeUndefined()
    expect(p.artifacts).toEqual({})
  })

  it('does not invent an artifact until a writer runs', () => {
    const born = createBlankProject('Seeded')
    expect(born.palette.length).toBeGreaterThan(0)
    expect(born.currentPaletteRef).toBeUndefined()
    expect(Object.keys(born.artifacts || {})).toHaveLength(0)
  })

  it('export still reads the compatibility palette', () => {
    s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    const pack = buildBrandPackSnapshot({
      project: cur(),
      tasks: [],
      moodItems: [],
    })
    expect(pack.palette).toEqual(['#1B4C7E', '#FAFAF9'])
    expect(pack.currentPaletteRef).toBeUndefined()
    expect(pack.artifacts).toBeUndefined()
    const sys = buildColorSystem(pack.palette)
    expect(sys.swatches.length).toBeGreaterThan(0)
  })

  it('templates do not carry the artifact pointer', () => {
    expect(TEMPLATE_STYLE_KEYS).not.toContain('currentPaletteRef')
    expect(TEMPLATE_STYLE_KEYS).not.toContain('artifacts')
  })

  it('roles update the same canonical record family', () => {
    s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    const before = cur().currentPaletteRef.id
    s().setColorRole('accent', '#CA8A04')
    const after = cur().currentPaletteRef.id
    expect(after).not.toBe(before)
    expect(resolveRef(cur(), makeRef('palette', after)).roles.accent).toBe(
      '#CA8A04'
    )
    expect(cur().colorRoles.accent).toBe('#CA8A04')
  })
})

describe('withCanonicalPalette is idempotent for the same content', () => {
  it('does not clone the bag when the snapshot is already stored', () => {
    const project = {
      palette: ['#1B4C7E', '#FAFAF9'],
      artifacts: {},
    }
    const once = withCanonicalPalette(project)
    const twice = withCanonicalPalette(once)
    expect(twice).toBe(once)
    expect(twice.currentPaletteRef.id).toBe(paletteSnapshot(once).id)
  })
})
