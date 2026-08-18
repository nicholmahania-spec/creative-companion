import { describe, expect, it, beforeEach, vi } from 'vitest'
import { makeRef, resolveRef } from './artifactRef'
import { typePairingSnapshot } from './artifactSnapshot'
import { buildIdentitySnapshot } from './identitySnapshot'
import useAppStore, {
  createBlankProject,
  withCanonicalTypePairing,
  TEMPLATE_STYLE_KEYS,
} from '../../store/useAppStore'
import { buildBrandPackSnapshot } from '../book/exportFiles'
import { specifiedFonts, missingFonts } from '../brand/typeMetrics'
import { typeSpecimen } from '../brand/typeSpecimen'
import { FIELD_HOMES } from '../book/bookContent'
import { typePairIdFromLabels } from '../color'
import versionService from '../../services/versionService'

const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)

function fresh() {
  s().clearToEmpty()
  s().createNewProject('Canonical type pairing')
}

describe('canonical type pairing artifact', () => {
  beforeEach(fresh)

  it('exists after the store writes the live pairing', () => {
    expect(cur().currentTypePairingRef).toBeUndefined()
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Inter Regular')
    const p = cur()
    expect(p.currentTypePairingRef.kind).toBe('typePairing')
    const snap = resolveRef(p, p.currentTypePairingRef)
    expect(snap.kind).toBe('typePairing')
    expect(snap.id).toBe(p.currentTypePairingRef.id)
    expect(snap.heading).toBe('Fraunces SemiBold')
    expect(snap.body).toBe('Inter Regular')
    expect(snap.id).toBe(typePairingSnapshot(p).id)
    expect(snap.id).toMatch(/^type_/)
  })

  it('keeps project.typeHeading and project.typeBody as the compatibility view', () => {
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Source Serif 4 Regular')
    const p = cur()
    expect(p.typeHeading).toBe('Fraunces SemiBold')
    expect(p.typeBody).toBe('Source Serif 4 Regular')
  })

  it('mints a new id when the pairing is replaced, and keeps the old artifact', () => {
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Inter Regular')
    const first = cur().currentTypePairingRef.id
    const firstRow = cur().artifacts[first]
    s().updateBrandField('typeHeading', 'Instrument Serif Bold')
    const second = cur().currentTypePairingRef.id
    expect(second).not.toBe(first)
    expect(cur().artifacts[first]).toEqual(firstRow)
    expect(resolveRef(cur(), makeRef('typePairing', first)).heading).toBe(
      'Fraunces SemiBold'
    )
    expect(resolveRef(cur(), makeRef('typePairing', second)).heading).toBe(
      'Instrument Serif Bold'
    )
    expect(cur().typeHeading).toBe('Instrument Serif Bold')
    expect(cur().typeBody).toBe('Inter Regular')
  })

  it('a typePairing ref cannot resolve a palette or a mark at the same id', () => {
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Inter Regular')
    const typeId = cur().currentTypePairingRef.id
    expect(resolveRef(cur(), makeRef('palette', typeId))).toBeNull()
    expect(resolveRef(cur(), makeRef('markConcept', typeId))).toBeNull()
    expect(resolveRef(cur(), makeRef('direction', typeId))).toBeNull()
    expect(resolveRef(cur(), makeRef('typePairing', typeId)).kind).toBe(
      'typePairing'
    )
  })

  it('a palette planted at the same id cannot resolve as typePairing', () => {
    const shared = 'type_shared_collision'
    const planted = {
      ...createBlankProject('Collision'),
      artifacts: {
        [shared]: { id: shared, kind: 'palette', hexes: ['#111111'], roles: {} },
      },
    }
    expect(resolveRef(planted, makeRef('typePairing', shared))).toBeNull()
    expect(resolveRef(planted, makeRef('palette', shared)).kind).toBe('palette')
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
            typeHeading: 'Fraunces SemiBold',
            typeBody: 'Inter Regular',
          },
        ],
      },
      6
    )
    const p = out.projects[0]
    expect(p.typeHeading).toBe('Fraunces SemiBold')
    expect(p.typeBody).toBe('Inter Regular')
    expect(p.currentTypePairingRef).toBeUndefined()
    expect(p.artifacts).toEqual({})
  })

  it('does not invent an artifact until a writer runs', () => {
    const born = createBlankProject('Seeded')
    expect(born.typeHeading).toBeTruthy()
    expect(born.typeBody).toBeTruthy()
    expect(born.currentTypePairingRef).toBeUndefined()
    expect(Object.keys(born.artifacts || {})).toHaveLength(0)
  })

  it('does not mint a pairing from typeWhy or licence notes', () => {
    expect(cur().currentTypePairingRef).toBeUndefined()
    s().updateBrandField('typeWhy', 'Quiet, humanist')
    s().updateBrandField('typeSource', 'Google Fonts')
    s().updateBrandField('typeLicenceNote', 'OFL')
    expect(cur().currentTypePairingRef).toBeUndefined()
    expect(Object.keys(cur().artifacts || {})).toHaveLength(0)
  })

  it('existing Type consumers still read the live labels', () => {
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Inter Regular')
    const p = cur()
    expect(specifiedFonts(p)).toEqual(['Fraunces SemiBold', 'Inter Regular'])
    const spec = typeSpecimen(p)
    expect(spec.find((r) => r.face === 'heading').faceLabel).toBe(
      'Fraunces SemiBold'
    )
    expect(spec.find((r) => r.face === 'body').faceLabel).toBe('Inter Regular')
    expect(p.typeHeading).toBe('Fraunces SemiBold')
    expect(p.typeBody).toBe('Inter Regular')
  })

  it('font availability still checks the compatibility labels', () => {
    s().updateBrandField('typeHeading', 'Trade Gothic Next Condensed Bold')
    s().updateBrandField('typeBody', 'Freight Text Pro Book')
    const missing = missingFonts(cur(), {
      createElement: () => ({
        getContext: () => ({
          font: '',
          measureText: () => ({ width: 100 }),
        }),
      }),
    })
    expect(missing).toEqual([
      'Trade Gothic Next Condensed Bold',
      'Freight Text Pro Book',
    ])
  })

  it('export still reads the compatibility faces', () => {
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Inter Regular')
    const pack = buildBrandPackSnapshot({
      project: cur(),
      tasks: [],
      moodItems: [],
    })
    expect(pack.typeHeading).toBe('Fraunces SemiBold')
    expect(pack.typeBody).toBe('Inter Regular')
    expect(pack.currentTypePairingRef).toBeUndefined()
    expect(pack.artifacts).toBeUndefined()
  })

  it('Brand Book still homes type on Identity, not the book', () => {
    expect(FIELD_HOMES.typeHeading.view).toBe('brand')
    expect(FIELD_HOMES.typeHeading.section).toBe('type')
    expect(FIELD_HOMES.typeBody.view).toBe('brand')
    expect(FIELD_HOMES.typeBody.section).toBe('type')
  })

  it('Identity Type tooling still matches a catalog pair from live labels', () => {
    s().updateBrandField('typeHeading', 'Plus Jakarta Sans Bold')
    s().updateBrandField('typeBody', 'Plus Jakarta Sans Regular')
    expect(
      typePairIdFromLabels(cur().typeHeading, cur().typeBody)
    ).toBeTruthy()
    expect(cur().typeHeading).toBe('Plus Jakarta Sans Bold')
    expect(cur().typeBody).toBe('Plus Jakarta Sans Regular')
  })

  it('templates do not carry the artifact pointer', () => {
    expect(TEMPLATE_STYLE_KEYS).not.toContain('currentTypePairingRef')
    expect(TEMPLATE_STYLE_KEYS).not.toContain('artifacts')
    expect(TEMPLATE_STYLE_KEYS).toContain('typeHeading')
    expect(TEMPLATE_STYLE_KEYS).toContain('typeBody')
  })

  it('applying a template writes the pairing and the canonical artifact', async () => {
    useAppStore.setState({
      templates: [
        {
          id: 'tpl-type',
          name: 'Type house',
          data: {
            typeHeading: 'Fraunces SemiBold',
            typeBody: 'Source Serif 4 Regular',
          },
        },
      ],
    })
    await s().applyTemplate('tpl-type')
    const p = cur()
    expect(p.typeHeading).toBe('Fraunces SemiBold')
    expect(p.typeBody).toBe('Source Serif 4 Regular')
    expect(p.currentTypePairingRef.kind).toBe('typePairing')
    expect(resolveRef(p, p.currentTypePairingRef).heading).toBe(
      'Fraunces SemiBold'
    )
  })

  it('identity snapshot still copies the live pairing, not a new shape', () => {
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Inter Regular')
    s().updateBrandField('typeWhy', 'Quiet')
    const snap = buildIdentitySnapshot(cur())
    expect(snap.payload.type).toEqual({
      heading: 'Fraunces SemiBold',
      body: 'Inter Regular',
      why: 'Quiet',
    })
    expect(snap.refs.some((r) => r.startsWith('typePairing:'))).toBe(true)
    expect(snap.refs).toContain(
      `typePairing:${cur().currentTypePairingRef.id}`
    )
  })

  it('version restore writes the compatibility faces and updates the artifact', async () => {
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Inter Regular')
    const version = await versionService.createVersionSnapshot({
      changeType: 'test',
    })
    const first = cur().currentTypePairingRef.id
    s().updateBrandField('typeHeading', 'Instrument Serif Bold')
    expect(cur().typeHeading).toBe('Instrument Serif Bold')

    const spy = vi
      .spyOn(versionService, 'getVersionById')
      .mockResolvedValue(version)
    try {
      expect((await versionService.restoreVersion(version.id)).ok).toBe(true)
    } finally {
      spy.mockRestore()
    }
    expect(cur().typeHeading).toBe('Fraunces SemiBold')
    expect(cur().typeBody).toBe('Inter Regular')
    expect(cur().currentTypePairingRef.id).toBe(first)
    expect(resolveRef(cur(), cur().currentTypePairingRef).heading).toBe(
      'Fraunces SemiBold'
    )
  })
})

describe('withCanonicalTypePairing is idempotent for the same content', () => {
  it('does not clone the bag when the snapshot is already stored', () => {
    const project = {
      typeHeading: 'Fraunces SemiBold',
      typeBody: 'Inter Regular',
      artifacts: {},
    }
    const once = withCanonicalTypePairing(project)
    const twice = withCanonicalTypePairing(once)
    expect(twice).toBe(once)
    expect(twice.currentTypePairingRef.id).toBe(typePairingSnapshot(once).id)
  })

  it('does not invent a pairing when both faces are empty', () => {
    const empty = { typeHeading: '', typeBody: '', artifacts: {} }
    expect(withCanonicalTypePairing(empty)).toBe(empty)
  })
})
