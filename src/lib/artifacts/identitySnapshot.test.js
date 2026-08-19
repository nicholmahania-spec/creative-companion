import { describe, expect, it, beforeEach } from 'vitest'
import {
  buildIdentitySnapshot,
  frozenPresentedMarkImage,
  isIdentitySnapshot,
  packForPublishedIdentity,
  withPresentedMarks,
} from './identitySnapshot'
import useAppStore, { createBlankProject } from '../../store/useAppStore'
import { buildBrandPackSnapshot } from '../book/exportFiles'
import { buildDeliveryPack, readDeliveryEnvelope } from '../client/brandDelivery'

const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)

function fresh() {
  s().clearToEmpty()
  s().createNewProject('Published identity')
  s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
  s().updateBrandField('typeHeading', 'Fraunces SemiBold')
  s().updateBrandField('typeBody', 'Inter Regular')
  s().updateBrandField('typeWhy', 'Quiet')
  s().updateBrandField('logoWordmark', 'Sparrow')
  const id = s().addLogoConcept('data:image/png;base64,MARK')
  s().chooseLogoConcept(id)
}

describe('buildIdentitySnapshot', () => {
  beforeEach(fresh)

  it('creates a snapshot with a unique id from live Identity', () => {
    const snap = buildIdentitySnapshot(cur())
    expect(isIdentitySnapshot(snap)).toBe(true)
    expect(snap.snapshotId).toMatch(/^idsnap_/)
    expect(snap.payload.palette.hexes).toEqual(['#1B4C7E', '#FAFAF9'])
    expect(snap.payload.type.heading).toBe('Fraunces SemiBold')
    expect(snap.payload.type.body).toBe('Inter Regular')
    expect(snap.payload.mark.image).toBe('data:image/png;base64,MARK')
    expect(snap.payload.wordmark).toBe('Sparrow')
    expect(snap.refs.some((r) => r.startsWith('palette:'))).toBe(true)
    expect(snap.refs.some((r) => r.startsWith('typePairing:'))).toBe(true)
    expect(snap.refs.some((r) => r.startsWith('markConcept:'))).toBe(true)
    expect(snap.payload).not.toHaveProperty('presentedMarks')
  })

  it('gives every snapshot its own identity', () => {
    const a = buildIdentitySnapshot(cur())
    const b = buildIdentitySnapshot(cur())
    expect(a.snapshotId).not.toBe(b.snapshotId)
  })

  it('does not change when live Identity is edited later', () => {
    const snap = buildIdentitySnapshot(cur())
    s().setProjectPalette(['#000000'])
    s().updateBrandField('typeHeading', 'Inter Bold')
    expect(snap.payload.palette.hexes).toEqual(['#1B4C7E', '#FAFAF9'])
    expect(snap.payload.type.heading).toBe('Fraunces SemiBold')
    expect(cur().palette).toEqual(['#000000'])
  })
})

describe('recordPublishedIdentity', () => {
  beforeEach(fresh)

  it('appends a snapshot and never rewrites an earlier one', () => {
    const first = buildIdentitySnapshot(cur())
    s().recordPublishedIdentity(first, cur().id)
    s().setProjectPalette(['#111111'])
    const second = buildIdentitySnapshot(cur())
    s().recordPublishedIdentity(second, cur().id)

    const list = cur().identitySnapshots
    expect(list).toHaveLength(2)
    expect(list[0].snapshotId).toBe(first.snapshotId)
    expect(list[1].snapshotId).toBe(second.snapshotId)
    expect(list[0].snapshotId).not.toBe(list[1].snapshotId)
    expect(list[0].payload.palette.hexes).toEqual(['#1B4C7E', '#FAFAF9'])
    expect(list[1].payload.palette.hexes).toEqual(['#111111'])

    first.payload.palette.hexes[0] = '#BEEF'
    expect(cur().identitySnapshots[0].payload.palette.hexes[0]).toBe('#1B4C7E')
    expect(() => {
      cur().identitySnapshots[0].payload.palette.hexes[0] = '#DEAD'
    }).toThrow()
  })

  it('does not invent a snapshot for a project that never published', () => {
    expect(cur().identitySnapshots).toEqual([])
    const opts = useAppStore.persist.getOptions()
    const out = opts.migrate(
      {
        moodItems: [],
        projects: [{ id: 'old', name: 'Legacy', directions: [] }],
      },
      6
    )
    expect(out.projects[0].identitySnapshots).toEqual([])
  })
})

describe('delivery envelope and pack stay themselves', () => {
  beforeEach(fresh)

  it('an old envelope without identity still loads as pack + book', () => {
    expect(
      readDeliveryEnvelope({
        v: 1,
        pack: { projectName: 'X', palette: ['#111'] },
        book: { pageSize: 'a4' },
      })
    ).toEqual({
      pack: { projectName: 'X', palette: ['#111'] },
      book: { pageSize: 'a4' },
    })
  })

  it('a new envelope carries the snapshot beside the pack', () => {
    const identity = buildIdentitySnapshot(cur())
    const stored = {
      v: 1,
      pack: { projectName: 'X', palette: ['#111'] },
      book: null,
      identity,
    }
    const env = readDeliveryEnvelope(stored)
    expect(env.identity.snapshotId).toBe(identity.snapshotId)
    expect(env.pack.projectName).toBe('X')
  })

  it('applying a snapshot does not mutate the stored pack object', () => {
    const pack = { palette: ['#111'], typeHeading: 'Old', logoImage: 'old' }
    const snap = buildIdentitySnapshot(cur())
    const next = packForPublishedIdentity(pack, snap)
    expect(next.palette).toEqual(['#1B4C7E', '#FAFAF9'])
    expect(next.typeHeading).toBe('Fraunces SemiBold')
    expect(next.logoImage).toBe('data:image/png;base64,MARK')
    expect(pack.palette).toEqual(['#111'])
    expect(packForPublishedIdentity(pack, null)).toBe(pack)
  })

  it('the pack snapshot and delivery allow-list still omit identitySnapshots', () => {
    const first = buildIdentitySnapshot(cur())
    s().recordPublishedIdentity(first, cur().id)
    const pack = buildBrandPackSnapshot({
      project: cur(),
      tasks: [],
      moodItems: [],
    })
    expect(pack.identitySnapshots).toBeUndefined()
    expect(buildDeliveryPack(pack).pack.identitySnapshots).toBeUndefined()
  })
})

describe('Presentation-only presentedMarks', () => {
  beforeEach(fresh)

  it('Book snapshot stays without presentedMarks after withPresentedMarks is unused', () => {
    const snap = buildIdentitySnapshot(cur())
    expect(snap.payload.presentedMarks).toBeUndefined()
  })

  it('attaches presentedMarks without changing snapshotId or chosen mark', () => {
    const snap = buildIdentitySnapshot(cur())
    const next = withPresentedMarks(snap, [
      { id: snap.payload.mark.id, image: snap.payload.mark.image },
      { id: 'other', image: 'data:image/png;base64,OTHER' },
    ])
    expect(next.snapshotId).toBe(snap.snapshotId)
    expect(next.payload.mark.image).toBe(snap.payload.mark.image)
    expect(next.payload.presentedMarks).toHaveLength(2)
    expect(frozenPresentedMarkImage(next, 'other')).toBe('data:image/png;base64,OTHER')
    expect(frozenPresentedMarkImage(next, 'missing')).toBe('')
    expect(frozenPresentedMarkImage(snap, snap.payload.mark.id)).toBe('')
  })
})

describe('createBlankProject starts with no published Identity', () => {
  it('is an empty list, not absent', () => {
    expect(createBlankProject('X').identitySnapshots).toEqual([])
  })
})
