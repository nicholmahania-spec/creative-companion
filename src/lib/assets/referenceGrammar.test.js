import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ARTIFACT_KINDS,
  ARTIFACT_KIND_IDS,
  isArtifactKind,
  isRef,
  makeRef,
  parseRefKey,
  resolveRef,
} from '../artifacts/artifactRef.js'

/**
 * TWO REFERENCE GRAMMARS, HELD APART ON PURPOSE.
 *
 * `{ kind, id }` appears twice in this tree. `artifactRef` uses it for creative
 * material a Direction or a brand book composes; `adoptBriefAttachments` uses
 * `{ kind: 'asset', id }` for a file in the Asset Library. They look alike
 * enough that merging them reads as tidying up, and the audit flagged the
 * divergence as a finding.
 *
 * It was investigated and the answer is that they must NOT converge. The
 * reasoning is in artifactRef's header; the consequence worth restating here is
 * the one with teeth: every kind in the artifact grammar is addressable by the
 * composition surfaces, so an `asset` kind would make Asset Library files
 * composable — and from there packageable. The ownership contract is explicit
 * that the library must never become a second production or delivery system,
 * and this is the door that would open it.
 *
 * So this file is a GUARD against accidental convergence, not a description of
 * a bug. If a product decision ever makes assets composable, these tests should
 * be deleted deliberately, by someone who has changed the Directions and Brand
 * Book contracts to match — not adjusted to make a merge pass.
 */

describe('the artifact grammar does not name Asset Library files', () => {
  it('has no `asset` kind', () => {
    expect(isArtifactKind('asset')).toBe(false)
    expect(ARTIFACT_KIND_IDS).not.toContain('asset')
    expect(Object.hasOwn(ARTIFACT_KINDS, 'asset')).toBe(false)
  })

  it('refuses to mint an asset ref', () => {
    expect(() => makeRef('asset', 'a-1')).toThrow(/Unknown artifact kind/)
  })

  it('does not validate an assetRef as an artifact ref', () => {
    /* The shape `adoptBriefAttachments` actually writes. It must stay
       unrecognised here, so no composer can accept one by accident. */
    expect(isRef({ kind: 'asset', id: 'a-1' })).toBe(false)
  })

  it('does not parse an asset refKey', () => {
    expect(parseRefKey('asset:a-1')).toBeNull()
  })

  it('resolves nothing for an asset ref, even against a project holding assets', () => {
    /* `resolveRef` falls through to `project.artifacts[id]` for unknown kinds.
       An asset id must not collide into that bag. */
    const project = { artifacts: { 'a-1': { id: 'a-1', kind: 'palette' } } }
    expect(resolveRef(project, { kind: 'asset', id: 'a-1' })).toBeNull()
  })

  it('names no kind that resolves out of the workspace asset list', () => {
    /* The structural reason, asserted rather than trusted: every declared kind
       reads from project state, studio state or the sample registry. None
       reads `state.assets`, so there is no path from a valid artifact ref to
       an Asset Library row. */
    const sources = new Set(Object.values(ARTIFACT_KINDS).map((k) => k.from))
    expect([...sources].sort()).toEqual(['artifacts', 'logoConcepts', 'moodItems', 'samples', 'studio'])
    expect(sources.has('assets')).toBe(false)
  })
})

describe('the asset grammar stays inside the Asset Library', () => {
  it('is produced only by the adoption path', () => {
    /* If a third producer appears, the two grammars have started to merge in
       practice whatever the type says — and this is where that shows up. */
    const adopt = readFileSync(new URL('./adoptBriefAttachments.js', import.meta.url), 'utf8')
    expect(adopt).toContain("kind: 'asset'")
  })

  it('is consumed only where an asset is being identified, never composed', () => {
    /* The store's brief-attachment link and the durable brief lookup. Neither
       feeds a Direction, a book or a package. */
    const store = readFileSync(new URL('../../store/useAppStore.js', import.meta.url), 'utf8')
    const link = store.slice(
      store.indexOf('linkBriefAttachmentToAsset:'),
      store.indexOf('toggleBodyDoubling:')
    )
    expect(link).toContain("assetRef?.kind === 'asset'")

    const storage = readFileSync(new URL('./assetStorage.js', import.meta.url), 'utf8')
    expect(storage).toContain("assetRef?.kind === 'asset'")
  })

  it('never reaches package or delivery truth', () => {
    /* The ownership boundary, checked at the only place the two vocabularies
       could meet: nothing in the Asset Library reads or writes package state.
       Comments are stripped first — these files discuss deliverables in prose
       constantly, and a prose match would make this test loud and worthless
       instead of quiet and true. */
    const strip = (src) =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

    for (const file of [
      './adoptBriefAttachments.js',
      './assetStorage.js',
      './assetLibrary.js',
      './assetShelf.js',
      './assetBytes.js',
      './ingestFiles.js',
    ]) {
      const code = strip(readFileSync(new URL(file, import.meta.url), 'utf8'))
      expect(code, `${file} reaches package state`).not.toMatch(
        /packageAssets|packagePlan|addPackageAsset|packageFiles/
      )
    }
  })

  it('and no package module reaches back into the Asset Library', () => {
    /* The boundary has two sides. Delivery reading `state.assets` would make
       the library an input to package truth just as surely as the reverse. */
    for (const file of [
      '../deliver/packagePlan.js',
      '../deliver/packageFiles.js',
      '../brand/applicationPackageAssets.js',
    ]) {
      const src = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(src, `${file} imports the Asset Library`).not.toMatch(
        /from '.*assets\/(assetLibrary|assetShelf|assetStorage|assetBytes|ingestFiles)/
      )
    }
  })
})
