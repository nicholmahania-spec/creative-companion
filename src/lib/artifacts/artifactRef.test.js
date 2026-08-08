import { describe, expect, it } from 'vitest'
import {
  ARTIFACT_KINDS, ARTIFACT_KIND_IDS, isArtifactKind, makeRef, isRef,
  refKey, parseRefKey, sameRef, resolveRef, resolveEvidenceRef,
} from './artifactRef'
import { paletteSnapshot, typePairingSnapshot, refForSnapshot } from './artifactSnapshot'

/**
 * A reference names an artifact. It never carries one.
 *
 * Directions, Presentations, Books, Templates, Approvals and Collections all
 * need to say "this one" before any of them can be built. Every one of them
 * would otherwise copy the content — which is how the same brand fact ends up
 * in two places, the defect this codebase keeps paying for.
 */

describe('the grammar', () => {
  it('rejects a kind nobody declared, loudly', () => {
    // A typo'd kind that quietly became a dangling reference would surface
    // months later as a blank page in a client's brand book.
    expect(() => makeRef('palete', 'x')).toThrow(/Unknown artifact kind/)
    expect(() => makeRef('palette', '')).toThrow(/needs an id/)
    expect(isArtifactKind('palette')).toBe(true)
    expect(isArtifactKind('nope')).toBe(false)
  })

  it('round-trips through a string key', () => {
    const ref = makeRef('markConcept', 'abc-1')
    expect(refKey(ref)).toBe('markConcept:abc-1')
    expect(parseRefKey('markConcept:abc-1')).toEqual(ref)
  })

  it('survives an id containing a colon', () => {
    const ref = makeRef('evidence', '1700000000000:2')
    expect(parseRefKey(refKey(ref))).toEqual(ref)
  })

  it('never half-parses', () => {
    for (const bad of ['', 'palette', ':x', 'nope:x', 'palette:'])
      expect(parseRefKey(bad), bad).toBeNull()
  })

  it('is safe on untrusted data', () => {
    for (const bad of [null, undefined, {}, { kind: 'palette' }, 'palette:x'])
      expect(isRef(bad)).toBe(false)
    expect(refKey(null)).toBe('')
  })

  it('compares by identity, not by object', () => {
    expect(sameRef(makeRef('palette', 'p1'), { kind: 'palette', id: 'p1' })).toBe(true)
    expect(sameRef(makeRef('palette', 'p1'), makeRef('typePairing', 'p1'))).toBe(false)
  })

  it('declares the kinds later phases will write', () => {
    // Declared now so a ref written by Directions is valid the day it ships
    // and `refKey` strings never change meaning under saved data.
    for (const k of ['direction', 'presentation', 'book', 'template'])
      expect(ARTIFACT_KIND_IDS).toContain(k)
    expect(ARTIFACT_KINDS.direction.stored).toBe(false)
    expect(ARTIFACT_KINDS.palette.stored).toBe(true)
  })
})

describe('resolving', () => {
  const project = {
    logoConcepts: [{ id: 'c1', why: 'stamp' }],
    artifacts: { pal_x: { id: 'pal_x', kind: 'palette', hexes: ['#111111'] } },
  }

  it('finds what is there', () => {
    expect(resolveRef(project, makeRef('markConcept', 'c1')).why).toBe('stamp')
    expect(resolveRef(project, makeRef('palette', 'pal_x')).hexes).toEqual(['#111111'])
  })

  it('returns null rather than inventing a placeholder', () => {
    // A referenced concept can be deleted. A placeholder here would put
    // content nobody made into a client's brand book.
    expect(resolveRef(project, makeRef('markConcept', 'gone'))).toBeNull()
    expect(resolveRef(project, makeRef('direction', 'later'))).toBeNull()
    expect(resolveRef(null, makeRef('palette', 'pal_x'))).toBeNull()
    expect(resolveRef(project, { kind: 'bogus', id: 'x' })).toBeNull()
  })

  it('resolves evidence from the workspace, where pins live', () => {
    const pins = [{ id: 7, note: 'a' }]
    expect(resolveEvidenceRef(pins, makeRef('evidence', '7')).note).toBe('a')
    expect(resolveEvidenceRef(pins, makeRef('evidence', '8'))).toBeNull()
    expect(resolveEvidenceRef(pins, makeRef('palette', '7'))).toBeNull()
  })
})

describe('snapshots are content-addressed', () => {
  const project = {
    palette: ['#1C1917', '#0F766E'],
    colorRoles: { cover: '#1C1917', text: '#0F766E' },
    typeHeading: 'Fraunces SemiBold',
    typeBody: 'Plus Jakarta Sans Regular',
  }

  it('gives the same palette the same id, so it is stored once', () => {
    expect(paletteSnapshot(project).id).toBe(paletteSnapshot({ ...project }).id)
  })

  it('does not care what order the roles were written in', () => {
    const flipped = { ...project, colorRoles: { text: '#0F766E', cover: '#1C1917' } }
    expect(paletteSnapshot(flipped).id).toBe(paletteSnapshot(project).id)
  })

  it('gives an edited palette a different id, so an old reference still means what it meant', () => {
    const edited = { ...project, palette: ['#1C1917', '#B91C1C'] }
    expect(paletteSnapshot(edited).id).not.toBe(paletteSnapshot(project).id)
  })

  it('normalizes hexes before comparing', () => {
    const same = { ...project, palette: ['#1c1917', '#0f766e'] }
    expect(paletteSnapshot(same).id).toBe(paletteSnapshot(project).id)
  })

  it('always returns a record, even with nothing chosen', () => {
    const empty = paletteSnapshot({})
    expect(empty.hexes).toEqual([])
    expect(empty.id).toMatch(/^pal_/)
    expect(typePairingSnapshot({}).id).toMatch(/^type_/)
  })

  it('keeps type as the label shape every existing reader understands', () => {
    const t = typePairingSnapshot(project)
    expect(t.heading).toBe('Fraunces SemiBold')
    expect(t.body).toBe('Plus Jakarta Sans Regular')
  })

  it('carries no bytes — this object is inside the persisted blob', () => {
    const json = JSON.stringify(paletteSnapshot(project))
    expect(json).not.toMatch(/data:/)
    expect(json.length).toBeLessThan(400)
  })

  it('hands back a usable reference', () => {
    expect(refForSnapshot(paletteSnapshot(project)).kind).toBe('palette')
  })
})
