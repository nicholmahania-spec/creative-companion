import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore from '../../store/useAppStore'
import { buildBrandPackSnapshot } from '../book/exportFiles'
import { TEMPLATE_STYLE_KEYS } from '../../store/useAppStore'

/**
 * Two or three marks, one starred, and only the starred one ever leaves.
 *
 * The routing rule is what makes this safe to add at all: starring copies the
 * concept into `logoImage`, the single field the pack, the book, the portal,
 * the touchpoint mocks and the stationery already read. Nothing downstream
 * learns about `logoConcepts`, and the last describe block below is the guard
 * that keeps it that way — a client seeing the two marks you rejected is the
 * one failure this feature could cause that the designer could not undo.
 */

const IMG_A = 'data:image/png;base64,AAAA'
const IMG_B = 'data:image/png;base64,BBBB'
const IMG_C = 'data:image/png;base64,CCCC'

const fresh = () => {
  useAppStore.getState().clearToEmpty()
  return useAppStore.getState().createNewProject('Concept test')
}

const current = () => {
  const s = useAppStore.getState()
  return s.projects.find((p) => p.id === s.currentProjectId)
}

const add = (img) => useAppStore.getState().addLogoConcept(img)

const byId = (id) => current().logoConcepts.find((c) => c.id === id)

describe('logo concepts', () => {
  beforeEach(() => {
    fresh()
  })

  it('starts empty', () => {
    expect(current().logoConcepts).toEqual([])
  })

  it('chooses the first concept automatically', () => {
    // A designer with one mark should not also have to press a star to say
    // "yes, that one" — the app can see it is the only candidate.
    add(IMG_A)
    const p = current()
    expect(p.logoConcepts).toHaveLength(1)
    expect(p.logoConcepts[0].chosen).toBe(true)
    expect(p.logoImage).toBe(IMG_A)
  })

  it('does not move the star when a second concept arrives', () => {
    add(IMG_A)
    add(IMG_B)
    const p = current()
    expect(p.logoConcepts.map((c) => c.chosen)).toEqual([true, false])
    expect(p.logoImage).toBe(IMG_A)
  })

  it('routes the chosen concept into logoImage', () => {
    add(IMG_A)
    add(IMG_B)
    const second = current().logoConcepts[1].id
    useAppStore.getState().chooseLogoConcept(second)
    const p = current()
    expect(p.logoImage).toBe(IMG_B)
    expect(p.logoConcepts.filter((c) => c.chosen)).toHaveLength(1)
  })

  it('keeps exactly one star, always', () => {
    add(IMG_A)
    add(IMG_B)
    add(IMG_C)
    for (const c of current().logoConcepts) {
      useAppStore.getState().chooseLogoConcept(c.id)
      expect(current().logoConcepts.filter((x) => x.chosen)).toHaveLength(1)
    }
  })

  it('carries the concept’s reasoning into the field the book prints', () => {
    add(IMG_A)
    add(IMG_B)
    const [a, b] = current().logoConcepts
    useAppStore
      .getState()
      .updateLogoConcept(b.id, { why: 'Survives a one-inch stamp' })
    // Not chosen yet — a note on a rejected route must not describe the mark
    // that ships.
    expect(current().logoDirection || '').not.toContain('one-inch')

    useAppStore.getState().chooseLogoConcept(b.id)
    expect(current().logoDirection).toBe('Survives a one-inch stamp')

    // Editing the chosen concept's why keeps the book field in step.
    useAppStore.getState().updateLogoConcept(b.id, { why: 'Reads at 12mm' })
    expect(current().logoDirection).toBe('Reads at 12mm')

    // Moving the star to a concept with no reasoning of its own empties the
    // book field rather than leaving the last concept's sentence behind it.
    // See the A/B test below for what the old "don't wipe" guard cost.
    useAppStore.getState().chooseLogoConcept(a.id)
    expect(current().logoDirection).toBe('')
  })

  /**
   * ONE CONCEPT → ONE RATIONALE.
   *
   * THE BUG. `chooseLogoConcept` only moved `logoDirection` when the newly
   * starred concept had a `why` of its own, and the card rendered
   * `logoDirection` rather than `concept.why` for whichever concept was
   * starred. Both halves point the same way: star A, write a reason, star B,
   * and B is displayed — and shipped in the brand book — carrying A's
   * sentence. The designer never typed it and has no way to see where it
   * came from.
   */
  it('never shows or ships one concept’s reasoning under another', () => {
    add(IMG_A)
    add(IMG_B)
    const [a, b] = current().logoConcepts
    useAppStore
      .getState()
      .updateLogoConcept(a.id, { why: 'Survives a 12mm stamp' })
    useAppStore
      .getState()
      .updateLogoConcept(b.id, { why: 'Works at tiny sizes' })

    useAppStore.getState().chooseLogoConcept(a.id)
    expect(byId(a.id).why).toBe('Survives a 12mm stamp')
    expect(current().logoDirection).toBe('Survives a 12mm stamp')

    useAppStore.getState().chooseLogoConcept(b.id)
    expect(byId(b.id).why).toBe('Works at tiny sizes')
    expect(current().logoDirection).toBe('Works at tiny sizes')

    // Switching the star left A's own reasoning exactly where the designer
    // wrote it — choosing is not editing.
    expect(byId(a.id).why).toBe('Survives a 12mm stamp')

    // Back to A, and nothing of B's has followed it.
    useAppStore.getState().chooseLogoConcept(a.id)
    expect(current().logoDirection).toBe('Survives a 12mm stamp')
    expect(byId(b.id).why).toBe('Works at tiny sizes')
  })

  it('adopts a pre-concept direction into the first concept added', () => {
    /* Legacy projects wrote `logoDirection` before concepts existed. It used
       to stay behind the mirror — printed by the brand book, editable
       nowhere. The first concept takes it, which is what lets the mirror be
       exact instead of guarded. */
    useAppStore.getState().setLogoDirection('Written before concepts existed')
    add(IMG_A)
    expect(current().logoConcepts[0].why).toBe('Written before concepts existed')
    expect(current().logoDirection).toBe('Written before concepts existed')

    // A second concept inherits nothing — the adoption is a one-time rescue.
    add(IMG_B)
    expect(current().logoConcepts[1].why).toBe('')
  })

  it('hands the promoted concept its own reasoning when one is removed', () => {
    add(IMG_A)
    add(IMG_B)
    const [a, b] = current().logoConcepts
    useAppStore.getState().updateLogoConcept(a.id, { why: 'The stamp one' })
    useAppStore.getState().updateLogoConcept(b.id, { why: 'The tiny one' })
    useAppStore.getState().chooseLogoConcept(a.id)
    expect(current().logoDirection).toBe('The stamp one')

    useAppStore.getState().removeLogoConcept(a.id)
    expect(current().logoConcepts[0].chosen).toBe(true)
    expect(current().logoDirection).toBe('The tiny one')
  })

  it('never leaves logoImage pointing at a removed concept', () => {
    add(IMG_A)
    add(IMG_B)
    const first = current().logoConcepts[0].id
    useAppStore.getState().removeLogoConcept(first)
    const p = current()
    expect(p.logoConcepts).toHaveLength(1)
    expect(p.logoConcepts[0].chosen).toBe(true)
    expect(p.logoImage).toBe(IMG_B)
  })

  it('clears the mark when the last concept goes', () => {
    add(IMG_A)
    useAppStore.getState().removeLogoConcept(current().logoConcepts[0].id)
    expect(current().logoConcepts).toEqual([])
    expect(current().logoImage).toBe('')
  })

  it('restores exactly, for undo', () => {
    add(IMG_A)
    add(IMG_B)
    const before = current().logoConcepts
    const beforeMark = current().logoImage
    useAppStore.getState().removeLogoConcept(before[0].id)
    useAppStore.getState().setLogoConcepts(before)
    useAppStore.getState().setLogoImage(beforeMark)
    expect(current().logoConcepts).toEqual(before)
    expect(current().logoImage).toBe(beforeMark)
  })
})

describe('projects saved before concepts existed', () => {
  /**
   * `logoConcepts` is read at every call site through
   * `Array.isArray(...) ? ... : []`, and `bookBuilderFor`-style read-time
   * defaults are why this codebase needs no migration for a new field. A
   * project persisted before 2026-08-08 has no key at all — it must render,
   * keep its mark, and be able to gain concepts without anything special
   * happening first.
   */
  const legacy = () => {
    fresh()
    const s = useAppStore.getState()
    // Simulate a persisted project from before the field existed.
    useAppStore.setState({
      projects: s.projects.map((p) => {
        const { logoConcepts, ...rest } = p
        void logoConcepts
        return { ...rest, logoImage: IMG_A }
      }),
    })
  }

  it('renders and keeps its existing mark', () => {
    legacy()
    expect(current().logoConcepts).toBeUndefined()
    expect(current().logoImage).toBe(IMG_A)
  })

  it('accepts its first concept without a migration', () => {
    legacy()
    add(IMG_B)
    const p = current()
    expect(p.logoConcepts).toHaveLength(1)
    // First concept added is chosen, so it takes over the mark — which is the
    // designer deliberately adding one, not a silent rewrite on load.
    expect(p.logoConcepts[0].chosen).toBe(true)
    expect(p.logoImage).toBe(IMG_B)
  })

  it('survives choose and remove with no concepts array', () => {
    legacy()
    expect(() => useAppStore.getState().chooseLogoConcept('nope')).not.toThrow()
    expect(() => useAppStore.getState().removeLogoConcept('nope')).not.toThrow()
    expect(current().logoImage).toBe(IMG_A)
  })
})

describe('the client only ever receives the chosen mark', () => {
  beforeEach(() => {
    fresh()
    add(IMG_A)
    add(IMG_B)
    add(IMG_C)
    useAppStore.getState().chooseLogoConcept(current().logoConcepts[1].id)
  })

  it('keeps concepts out of the pack snapshot entirely', () => {
    const pack = buildBrandPackSnapshot({
      project: current(),
      tasks: [],
      moodItems: [],
    })
    expect(pack.logoConcepts).toBeUndefined()
    expect(pack.logoImage).toBe(IMG_B)

    // Belt and braces: the rejected images must not appear anywhere in the
    // serialized pack, whatever key they might have arrived under.
    const serialized = JSON.stringify(pack)
    expect(serialized).not.toContain(IMG_A)
    expect(serialized).not.toContain(IMG_C)
    expect(serialized).toContain(IMG_B)
  })

  it('is not carried into a reusable template', () => {
    // A template is style for the NEXT client. Another client's rejected
    // marks are the clearest possible example of what must not ride along.
    expect(TEMPLATE_STYLE_KEYS).not.toContain('logoConcepts')
  })
})
