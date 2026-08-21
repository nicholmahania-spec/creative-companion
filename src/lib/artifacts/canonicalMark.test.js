import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore from '../../store/useAppStore'
import { resolveRef } from './artifactRef'
import { withCanonicalMark } from '../../store/useAppStore'

/**
 * THE CHOSEN MARK GETS A NAME, THE SAME WAY THE PALETTE AND THE TYPE DO.
 *
 * Phase 0 gave `palette` and `typeHeading`/`typeBody` canonical references —
 * `currentPaletteRef` and `currentTypePairingRef` — so a consumer can point at
 * the decision instead of re-deriving it. The mark was left out: it is
 * canonical through `logoConcepts[].chosen`, but nothing could NAME it, so
 * every consumer re-ran `.find(c => c.chosen)` and any of them could disagree.
 *
 * WHAT THIS REF IS, AND WHAT IT DELIBERATELY IS NOT. It is a stable pointer to
 * the chosen concept's id. It is NOT content-addressed the way a palette
 * snapshot is, because the thing that would have to be hashed is the artwork —
 * and the artwork legitimately exists twice: `logoConcepts[].image` keeps the
 * data URL it was uploaded from while `logoImage` may already hold a Supabase
 * Storage URL after `applyImageUrlReplacements`. Hashing either would force one
 * of them back into the other and undo the offload. That difference is F1c and
 * is deliberately deferred; keying on `chosen.id` is what makes this pass safe.
 */

const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)

const PNG = 'data:image/png;base64,AAAA'
const PNG2 = 'data:image/png;base64,BBBB'

function fresh() {
  s().clearToEmpty()
  return s().createNewProject('Mark ref')
}

describe('withCanonicalMark', () => {
  it('names the chosen concept and nothing else', () => {
    const p = withCanonicalMark({
      logoConcepts: [
        { id: 'a', image: PNG },
        { id: 'b', image: PNG2, chosen: true },
      ],
    })
    expect(p.currentMarkRef).toEqual({ kind: 'markConcept', id: 'b' })
  })

  it('does not fabricate a reference when nothing is chosen', () => {
    const p = withCanonicalMark({ logoConcepts: [{ id: 'a', image: PNG }] })
    expect(p.currentMarkRef).toBeUndefined()
  })

  /* THE LEGACY SHAPE, AND THE ONE THAT MATTERS MOST. Artwork in `logoImage`
     with no concepts at all says nothing about whether it was a mark or an old
     cover drop — `setLogoConcepts` already refuses to guess. Minting a ref off
     it would be the same guess with a canonical name on it. */
  it('never manufactures a mark from logoImage alone', () => {
    const p = withCanonicalMark({ logoImage: PNG, logoConcepts: [] })
    expect(p.currentMarkRef).toBeUndefined()
    expect(p.logoImage).toBe(PNG)
  })

  it('is idempotent and returns the same object when nothing moved', () => {
    const a = withCanonicalMark({ logoConcepts: [{ id: 'b', chosen: true }] })
    const b = withCanonicalMark(a)
    expect(b).toBe(a)
  })

  /* A ref whose target has gone is worse than no ref: it resolves to null
     while still claiming the project has a mark. */
  it('clears a reference the list can no longer answer for', () => {
    const p = withCanonicalMark({
      currentMarkRef: { kind: 'markConcept', id: 'gone' },
      logoConcepts: [{ id: 'a' }],
    })
    expect(p.currentMarkRef).toBeUndefined()
  })

  it('leaves a project with no concepts untouched', () => {
    const before = { logoImage: PNG }
    expect(withCanonicalMark(before)).toBe(before)
  })
})

describe('the store keeps the reference true through every mark writer', () => {
  beforeEach(fresh)

  const ref = () => cur().currentMarkRef
  const chosen = () => (cur().logoConcepts || []).find((c) => c.chosen)

  it('addLogoConcept — the first concept is chosen and named', () => {
    s().addLogoConcept(PNG)
    expect(ref()).toEqual({ kind: 'markConcept', id: chosen().id })
    expect(resolveRef(cur(), ref())).toBe(chosen())
  })

  it('chooseLogoConcept — selecting another moves the reference', () => {
    s().addLogoConcept(PNG)
    s().addLogoConcept(PNG2)
    const second = cur().logoConcepts[1]
    s().chooseLogoConcept(second.id)
    expect(ref().id).toBe(second.id)
    expect(resolveRef(cur(), ref()).id).toBe(second.id)
  })

  /* Editing does NOT mint a new id — the concept is the same decision with a
     new picture on it. That is the documented difference from palette, where an
     edit mints a new content id. */
  it('updateLogoConcept — editing the chosen concept keeps the same reference', () => {
    s().addLogoConcept(PNG)
    const before = ref()
    s().updateLogoConcept(chosen().id, { image: PNG2, why: 'reworked' })
    expect(ref()).toEqual(before)
    expect(resolveRef(cur(), ref()).image).toBe(PNG2)
  })

  /**
   * A PRE-EXISTING DEFECT, PINNED RATHER THAN FIXED.
   *
   * `updateLogoConcept` spreads the patch onto the concept (`{...c, ...patch}`),
   * so a caller passing `chosen: true` gets a SECOND starred concept — the app
   * has no single-selection guard on this path. That is a mark-selection bug and
   * it predates this reference; fixing it is a change to what "chosen" means and
   * belongs to whoever owns Mark, not to a pass whose job is to add a name.
   *
   * What this test does assert is that the reference stays DETERMINISTIC and
   * resolvable under that condition: it names the first starred concept, the
   * same one `logoImage`'s own mirror logic and every existing
   * `.find(c => c.chosen)` consumer picks. The ref cannot be blamed for
   * disagreeing with the rest of the app, because it does not.
   */
  it('stays deterministic when the list somehow holds two chosen concepts', () => {
    s().addLogoConcept(PNG)
    s().addLogoConcept(PNG2)
    const [first, second] = cur().logoConcepts
    s().updateLogoConcept(second.id, { chosen: true })

    const starred = cur().logoConcepts.filter((c) => c.chosen)
    expect(starred, 'single-selection is now enforced — retire this test').toHaveLength(2)

    expect(ref().id).toBe(first.id)
    expect(resolveRef(cur(), ref())).toBeTruthy()
    /* And it agrees with what every other consumer resolves. */
    expect(cur().logoConcepts.find((c) => c.chosen).id).toBe(ref().id)
  })

  it('removeLogoConcept — removing the chosen one follows the promotion', () => {
    s().addLogoConcept(PNG)
    s().addLogoConcept(PNG2)
    const first = cur().logoConcepts[0]
    s().removeLogoConcept(first.id)
    expect(chosen(), 'nothing was promoted').toBeTruthy()
    expect(ref().id).toBe(chosen().id)
  })

  it('removeLogoConcept — removing the last one leaves no reference', () => {
    s().addLogoConcept(PNG)
    s().removeLogoConcept(cur().logoConcepts[0].id)
    expect(cur().logoConcepts).toHaveLength(0)
    expect(ref()).toBeUndefined()
  })

  it('setLogoConcepts — restoring a list restores the reference', () => {
    s().addLogoConcept(PNG)
    s().addLogoConcept(PNG2)
    const saved = JSON.parse(JSON.stringify(cur().logoConcepts))
    s().setLogoConcepts([], cur().id)
    expect(ref()).toBeUndefined()
    s().setLogoConcepts(saved, cur().id)
    expect(ref().id).toBe(saved.find((c) => c.chosen).id)
  })

  /* THE OFFLOAD MUST SURVIVE. After a cloud push `logoImage` holds a Storage
     URL while the concept still holds the data URL it was uploaded from. The
     reference keys on the concept's ID, so it is indifferent to both — and
     nothing here may drag the data URL back over the Storage URL. */
  it('a Storage URL in logoImage is left exactly where it is', () => {
    s().addLogoConcept(PNG)
    const id = chosen().id
    const STORAGE = 'https://example.supabase.co/storage/v1/object/sign/marks/x.png'
    useAppStore.setState((st) => ({
      projects: st.projects.map((p) =>
        p.id === st.currentProjectId ? { ...p, logoImage: STORAGE } : p
      ),
    }))
    const after = withCanonicalMark(cur())
    expect(after.logoImage).toBe(STORAGE)
    expect(after.currentMarkRef).toEqual({ kind: 'markConcept', id })
    expect(after.logoConcepts[0].image).toBe(PNG)
  })

  it('does not introduce a second mark author', () => {
    s().addLogoConcept(PNG)
    const before = JSON.parse(JSON.stringify(cur().logoConcepts))
    const after = withCanonicalMark(cur())
    expect(after.logoConcepts).toEqual(before)
    expect(after.logoImage).toBe(cur().logoImage)
  })
})

describe('the reference survives persistence', () => {
  beforeEach(fresh)

  it('export then hydrate keeps currentMarkRef', () => {
    s().addLogoConcept(PNG)
    const id = cur().currentMarkRef.id
    const blob = JSON.parse(JSON.stringify({ projects: s().projects }))
    const round = blob.projects.find((p) => p.id === s().currentProjectId)
    expect(round.currentMarkRef).toEqual({ kind: 'markConcept', id })
    expect(resolveRef(round, round.currentMarkRef).id).toBe(id)
  })
})
