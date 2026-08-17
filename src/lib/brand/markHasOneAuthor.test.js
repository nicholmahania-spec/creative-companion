import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import useAppStore from '../../store/useAppStore'
import { buildBrandPackSnapshot } from '../book/exportFiles'

/**
 * THE MARK HAS ONE AUTHOR: `logoConcepts`. `logoImage` MIRRORS IT.
 *
 * THE BUG THESE PIN (audit F1, the P0). The export preview had an image drop
 * whose hint called it "the cover", and it called `setLogoImage` directly —
 * so the export surface was a second author of the brand's mark.
 *
 *   drop an image        → logoImage = the drop, logoConcepts[chosen] unchanged
 *   star a concept       → mirror re-derived, the dropped image GONE
 *
 * …and in the other direction, `packagePlan` builds the client's logo file
 * from `logoImage`, so an image dropped on a preview shipped as the brand's
 * mark in the delivered package.
 *
 * THERE IS NO SEPARATE COVER-ART FIELD, and none was invented: nothing renders
 * one. The brand book's cover draws a monogram (`brandBookPdf.js`, the two
 * `addImage` calls are the Logo page and a mood pin), and its only cover-page
 * read of `logoImage` picks the status line. The dropped image IS a mark, so
 * the drop now writes a concept and selects it.
 *
 * The grep tests are the ones that hold the line, because the failure mode is
 * a direct `setLogoImage` being added back to an output surface in good faith
 * — it renders perfectly and quietly forks the mark in two.
 */

const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(here, '../..', p), 'utf8')
/** Strip comments — the history above is allowed to name what it removed. */
const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const fresh = (name = 'Mark ownership') => {
  useAppStore.getState().clearToEmpty()
  return useAppStore.getState().createNewProject(name)
}

const current = () => {
  const s = useAppStore.getState()
  return s.projects.find((p) => p.id === s.currentProjectId)
}

const chosen = () => (current().logoConcepts || []).find((c) => c.chosen) || null

/**
 * Exactly what `handleCoverImageDrop` does after the fix, minus the
 * FileReader: add a concept, select it. Kept in step with App.jsx by
 * `the export surface does not author the mark` below, which fails if that
 * handler ever calls `setLogoImage` again.
 */
const dropImage = (dataUrl) => {
  const s = useAppStore.getState()
  const id = s.addLogoConcept(dataUrl, current().id)
  if (id) useAppStore.getState().chooseLogoConcept(id, current().id)
  return id
}

describe('the export surface does not author the mark', () => {
  it('App.jsx never calls setLogoImage', () => {
    /* The one call site was the image drop. If this fails, an output surface
       has become the mark's second author again. */
    expect(code(read('App.jsx'))).not.toContain('setLogoImage')
  })

  it('the drop routes through the canonical concept operations', () => {
    const app = code(read('App.jsx'))
    expect(app).toContain('addLogoConcept')
    expect(app).toContain('chooseLogoConcept')
  })

  it('no cover-art field was invented to hold it', () => {
    /* The fix is that there is ONE semantic object here, not two. A
       `bookCoverImage` with no renderer would be a control that discards what
       you drop, which is worse than the collision it replaced. */
    for (const f of ['App.jsx', 'store/useAppStore.js', 'lib/book/brandBookPdf.js']) {
      expect(code(read(f))).not.toMatch(/bookCoverImage|coverArt/)
    }
  })
})

describe('a dropped image becomes the selected mark', () => {
  beforeEach(() => {
    fresh()
  })

  it('creates a logo concept', () => {
    expect(current().logoConcepts).toEqual([])
    dropImage('data:image/png;base64,DROPPED')
    expect(current().logoConcepts).toHaveLength(1)
    expect(current().logoConcepts[0].image).toBe('data:image/png;base64,DROPPED')
  })

  it('selects the concept it just created, even when others exist', () => {
    useAppStore.getState().addLogoConcept('data:image/png;base64,EXISTING')
    expect(chosen().image).toBe('data:image/png;base64,EXISTING')

    dropImage('data:image/png;base64,DROPPED')

    /* Without the explicit select, `addLogoConcept`'s "first one is chosen"
       rule leaves this unstarred and the drop looks like it did nothing. */
    expect(current().logoConcepts).toHaveLength(2)
    expect(chosen().image).toBe('data:image/png;base64,DROPPED')
  })

  it('leaves logoImage equal to the selected concept', () => {
    dropImage('data:image/png;base64,DROPPED')
    expect(current().logoImage).toBe(chosen().image)
  })
})

describe('THE OLD BUG: a dropped image survives the next concept edit', () => {
  beforeEach(() => {
    fresh()
  })

  /**
   * The exact sequence that used to destroy the drop. Against the old
   * implementation — `setLogoImage(dropped)` — the final assertion fails:
   * the mirror re-derives from the chosen concept, which never held the
   * dropped image, so `logoImage` reverts to the old mark.
   */
  it('drop → selected → mirror → edit the concept → mirror still follows', () => {
    const s = () => useAppStore.getState()
    s().addLogoConcept('data:image/png;base64,OLDMARK')

    dropImage('data:image/png;base64,DROPPED')
    expect(chosen().image).toBe('data:image/png;base64,DROPPED')
    expect(current().logoImage).toBe('data:image/png;base64,DROPPED')

    // The edit that used to throw the drop away.
    s().updateLogoConcept(chosen().id, { why: 'survives a 12mm stamp' })
    expect(current().logoImage).toBe('data:image/png;base64,DROPPED')

    // …and so does re-starring it, which re-derives the mirror outright.
    s().chooseLogoConcept(chosen().id)
    expect(current().logoImage).toBe('data:image/png;base64,DROPPED')
    expect(current().logoDirection).toBe('survives a 12mm stamp')
  })

  it('cannot establish a competing mark by writing logoImage', () => {
    const s = () => useAppStore.getState()
    const first = s().addLogoConcept('data:image/png;base64,OLDMARK')

    s().setLogoImage('data:image/png;base64,DROPPED')
    expect(chosen().id).toBe(first)
    expect(chosen().image).toBe('data:image/png;base64,DROPPED')
    expect(current().logoImage).toBe('data:image/png;base64,DROPPED')

    s().chooseLogoConcept(first)
    expect(current().logoImage).toBe('data:image/png;base64,DROPPED')
    expect(chosen().image).toBe('data:image/png;base64,DROPPED')
  })

  it('the package ships the selected concept, not a stray mirror write', () => {
    dropImage('data:image/png;base64,DROPPED')
    const pack = buildBrandPackSnapshot({ project: current() })
    expect(pack.logoImage).toBe(chosen().image)
  })
})

describe('the mirror follows the chosen concept', () => {
  beforeEach(() => {
    fresh()
  })

  it('changing the chosen concept’s image updates logoImage', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    s().updateLogoConcept(chosen().id, { image: 'data:image/png;base64,TWO' })
    expect(chosen().image).toBe('data:image/png;base64,TWO')
    expect(current().logoImage).toBe('data:image/png;base64,TWO')
  })

  it('selecting a different concept moves the mirror with it', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    dropImage('data:image/png;base64,TWO')
    const one = current().logoConcepts[0]
    s().chooseLogoConcept(one.id)
    expect(current().logoImage).toBe('data:image/png;base64,ONE')
  })

  it('removing the chosen concept leaves no stale mirror', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    dropImage('data:image/png;base64,TWO')
    s().removeLogoConcept(chosen().id)
    /* The existing selection contract promotes the first survivor — no
       logoImage repair logic was added here, and none is needed. */
    expect(current().logoImage).toBe(chosen().image)
    expect(current().logoImage).toBe('data:image/png;base64,ONE')
  })

  it('removing the last concept clears the mirror rather than stranding it', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    s().removeLogoConcept(current().logoConcepts[0].id)
    expect(current().logoConcepts).toEqual([])
    expect(current().logoImage).toBe('')
  })
})

describe('legacy logoImage with no concept behind it', () => {
  beforeEach(() => {
    fresh()
  })

  it('is preserved exactly, because nothing can tell where it came from', () => {
    /* There is no provenance discriminator on `logoImage` — an old value may
       be a real mark or an old cover drop, and no stored field distinguishes
       them. So it is left alone: not migrated into a concept, not cleared. */
    const s = () => useAppStore.getState()
    s().setLogoImage('data:image/png;base64,LEGACY')
    expect(current().logoConcepts).toEqual([])

    // Reading the project — including for export — must not touch it.
    const pack = buildBrandPackSnapshot({ project: current() })
    expect(pack.logoImage).toBe('data:image/png;base64,LEGACY')
    expect(current().logoImage).toBe('data:image/png;base64,LEGACY')
    expect(current().logoConcepts).toEqual([])
  })

  it('is replaced only by a deliberate act, never automatically', () => {
    const s = () => useAppStore.getState()
    s().setLogoImage('data:image/png;base64,LEGACY')
    // Unrelated identity work leaves it standing.
    s().updateBrandField('tagline', 'Baked on the date')
    s().setProjectPalette(['#1B4C7E'])
    expect(current().logoImage).toBe('data:image/png;base64,LEGACY')

    // Adding a mark is the deliberate act, and the concept system takes over.
    dropImage('data:image/png;base64,REAL')
    expect(current().logoImage).toBe('data:image/png;base64,REAL')
    expect(chosen().image).toBe('data:image/png;base64,REAL')
  })
})

/**
 * F1b — THE WHOLE-LIST WRITE UPHOLDS THE MIRROR TOO.
 *
 * `setLogoConcepts` replaces the concepts collection outright. It re-derived
 * `logoDirection` from the chosen concept and said in its own comment that
 * "the mirror is re-derived here too, so the invariant holds after every write
 * to the list" — but it never re-derived `logoImage`. Its one caller (the undo
 * on Identity → Mark) compensated with a paired `setLogoImage`, so the defect
 * was latent rather than live: a second caller following the comment instead of
 * the call site would restore the concepts and leave the mark pointing at
 * whichever image had been promoted in their place.
 *
 * WHY THE DERIVATION IS CONDITIONAL. `logoImage === chosen.image` holds only
 * when a chosen concept exists to establish it. Two real states say otherwise:
 *
 *   - a legacy project with artwork and no concepts at all, which predates the
 *     concept system and must stay readable;
 *   - a project whose mark has been offloaded to Storage by
 *     `applyImageUrlReplacements`, after which `logoImage` is a URL and
 *     `chosen.image` is still the data URL it was uploaded from — deliberate,
 *     and documented in `lib/deliver/markSource.js`.
 *
 * So an empty or unstarred list does not clear the mark. Nothing is erased for
 * want of a concept to derive from; the derivation only fires when the list
 * actually names a chosen mark.
 */
describe('F1b — replacing the whole concept list keeps the mirror true', () => {
  beforeEach(() => {
    fresh()
  })

  it('derives logoImage from the chosen concept in the restored list', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    dropImage('data:image/png;base64,TWO')
    const before = current().logoConcepts.map((c) => ({ ...c }))
    expect(before.find((c) => c.chosen).image).toBe('data:image/png;base64,TWO')

    // Something else takes the star, so the mirror moves off TWO…
    s().chooseLogoConcept(before[0].id)
    expect(current().logoImage).toBe('data:image/png;base64,ONE')

    // …and restoring the whole list must bring the mirror back with it,
    // WITHOUT the caller having to write logoImage itself.
    s().setLogoConcepts(before)
    expect(chosen().image).toBe('data:image/png;base64,TWO')
    expect(current().logoImage).toBe('data:image/png;base64,TWO')
  })

  it('keeps logoImage and logoDirection in step on the same write', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    s().updateLogoConcept(chosen().id, { why: 'survives a 12mm stamp' })
    const before = current().logoConcepts.map((c) => ({ ...c }))

    dropImage('data:image/png;base64,TWO')
    expect(current().logoImage).toBe('data:image/png;base64,TWO')

    s().setLogoConcepts(before)
    /* Both mirrors describe the same concept. Before this, the rationale came
       back and the artwork did not. */
    expect(current().logoImage).toBe('data:image/png;base64,ONE')
    expect(current().logoDirection).toBe('survives a 12mm stamp')
  })

  it('does not erase a legacy mark when the list names no chosen concept', () => {
    /* logoImage != '' with logoConcepts = [] is a real legacy shape and there
       is no provenance discriminator for it. An empty list establishes no new
       canonical mark, so it may not be read as "there is no mark". */
    const s = () => useAppStore.getState()
    s().setLogoImage('data:image/png;base64,LEGACY')
    expect(current().logoConcepts).toEqual([])

    s().setLogoConcepts([])
    expect(current().logoImage).toBe('data:image/png;base64,LEGACY')

    // …and the same for a list that exists but stars nothing.
    s().setLogoConcepts([{ id: 'x', image: 'data:image/png;base64,UNSTARRED', chosen: false }])
    expect(current().logoImage).toBe('data:image/png;base64,LEGACY')
  })

  it('does not revert an offloaded Storage URL when nothing is chosen', () => {
    /* After a cloud push the mark is a Storage URL while the concept still
       holds the data URL it was uploaded from. A list with no chosen concept
       must not drag the mirror back to the fat data URL. */
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    s().applyImageUrlReplacements([
      { kind: 'logo', projectId: current().id, url: 'https://cdn.test/logo.png' },
    ])
    expect(current().logoImage).toBe('https://cdn.test/logo.png')

    s().setLogoConcepts(
      current().logoConcepts.map((c) => ({ ...c, chosen: false }))
    )
    expect(current().logoImage).toBe('https://cdn.test/logo.png')
  })

  it('leaves the undo restore internally consistent', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    dropImage('data:image/png;base64,TWO')

    const before = current().logoConcepts.map((c) => ({ ...c }))
    s().removeLogoConcept(chosen().id)
    expect(current().logoImage).toBe('data:image/png;base64,ONE')

    s().setLogoConcepts(before, current().id)

    expect(current().logoConcepts).toHaveLength(2)
    expect(chosen().image).toBe('data:image/png;base64,TWO')
    expect(current().logoImage).toBe(chosen().image)
  })

  it('adds no new author — the list is still the only source of the image', () => {
    /* `setLogoConcepts` derives the mirror; it never invents artwork. Whatever
       comes out of it is an image that was already on a concept in the list it
       was handed. */
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    const list = [
      { id: 'a', image: 'data:image/png;base64,AAA', why: 'a', chosen: false },
      { id: 'b', image: 'data:image/png;base64,BBB', why: 'b', chosen: true },
    ]
    s().setLogoConcepts(list)
    expect(current().logoImage).toBe('data:image/png;base64,BBB')
    expect(
      list.map((c) => c.image),
      'the mirror must be one of the images it was given'
    ).toContain(current().logoImage)
  })
})

describe('logoImage and logoDirection are compatibility views of the chosen concept', () => {
  beforeEach(() => {
    fresh()
  })

  it('logoDirection follows the chosen concept’s why', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    s().updateLogoConcept(chosen().id, { why: 'survives a 12mm stamp' })
    expect(current().logoDirection).toBe('survives a 12mm stamp')
    dropImage('data:image/png;base64,TWO')
    expect(current().logoDirection).toBe('')
    s().chooseLogoConcept(current().logoConcepts[0].id)
    expect(current().logoDirection).toBe('survives a 12mm stamp')
    expect(current().logoImage).toBe('data:image/png;base64,ONE')
  })

  it('setLogoDirection writes the chosen concept, not a second slot', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    s().setLogoDirection('restored rationale')
    expect(chosen().why).toBe('restored rationale')
    expect(current().logoDirection).toBe('restored rationale')
  })

  it('updateBrandField cannot fork the mark', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    s().updateBrandField('logoImage', 'data:image/png;base64,FORK')
    s().updateBrandField('logoDirection', 'forked why')
    expect(chosen().image).toBe('data:image/png;base64,FORK')
    expect(chosen().why).toBe('forked why')
    expect(current().logoImage).toBe(chosen().image)
    expect(current().logoDirection).toBe(chosen().why)
  })

  it('Book/pack consumers still receive the compatibility mark', () => {
    const s = () => useAppStore.getState()
    dropImage('data:image/png;base64,ONE')
    s().updateLogoConcept(chosen().id, { why: 'the stamp one' })
    const pack = buildBrandPackSnapshot({
      project: current(),
      tasks: [],
      moodItems: [],
    })
    expect(pack.logoImage).toBe(current().logoImage)
    expect(pack.logoImage).toBe(chosen().image)
    expect(pack.logoDirection).toBe('the stamp one')
    expect(pack.logoConcepts).toBeUndefined()
  })

  it('legacy projects without concepts stay readable', () => {
    const s = () => useAppStore.getState()
    s().setLogoImage('data:image/png;base64,LEGACY')
    s().setLogoDirection('pre-concept sentence')
    expect(current().logoConcepts).toEqual([])
    expect(current().logoImage).toBe('data:image/png;base64,LEGACY')
    expect(current().logoDirection).toBe('pre-concept sentence')
    const pack = buildBrandPackSnapshot({ project: current() })
    expect(pack.logoImage).toBe('data:image/png;base64,LEGACY')
    expect(pack.logoDirection).toBe('pre-concept sentence')
  })
})
