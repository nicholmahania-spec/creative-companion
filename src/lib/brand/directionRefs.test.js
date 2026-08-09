import { describe, expect, it, beforeEach } from 'vitest'
import useAppStore, {
  blankDirection,
  blankDirections,
  directionSlots,
} from '../../store/useAppStore'
import {
  buildBrandPackSnapshot,
  brandPackToHtml,
  brandPackToMarkdown,
  markPackFiles,
} from '../book/exportFiles'
import {
  COMPOSITION_SLOTS,
  SLOT_HOME,
  directionComposition,
  slotSummary,
} from './directionComposition'

/**
 * A DIRECTION IS A COMPOSITION, NOT A COPY, AND CHOOSING ONE IS NOT APPLYING IT.
 *
 * Three separate acts, kept separate here because collapsing any two of them
 * is the failure this whole shape exists to prevent:
 *
 *   CHOOSE  — this is the route. Marks one slot chosen; touches no brand value.
 *   DEVELOP — edit the mark / pairing / palette at the workspace that owns it.
 *   SWAP    — repoint a reference. Moves no content.
 *
 * The tempting version is "choose B and the project becomes B" — one click,
 * everything applied. It is wrong twice over: it destroys the two directions
 * not chosen (they were compositions of the same shared parts), and it means a
 * designer cannot look at three options without one of them overwriting the
 * brand they already have. Comparing is not committing.
 *
 * And the composition must not rot. Refs to palettes and pairings are
 * content-addressed, so editing the palette next week produces a different id
 * and this direction keeps resolving to what it was assembled from. A history
 * that silently rewrites itself is not a history.
 */

const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)

/* BY ID, NEVER BY INDEX. Routes are only created when the designer asks for
   one, so `directions[1]` is not "B" — it is whichever route happens to be
   second in the array. The id is the identity; the letter on screen is derived
   from position and reflows when a route is deleted. */
const inDirs = (project, id) =>
  (project?.directions || []).find((d) => d?.id === id) || null
const dirOf = (id) => inDirs(cur(), id)

function freshProject() {
  s().clearToEmpty()
  s().createNewProject('Directions')
  /* A NEW PROJECT HAS NO ROUTES. Three blank cards were the old seeding and
     are gone; a record is born when the designer presses "Add a direction".
     Most of the cases below are about what a route does once it exists, so
     they make three the way the screen does. */
  for (let i = 0; i < 3; i += 1) s().addDirection()
}

describe('a direction owns its label, title, why, chosen, refs and citations — nothing else', () => {
  it('starts every slot with an empty refs bag and no citations', () => {
    for (const d of ['a', 'b', 'c'].map(blankDirection)) {
      expect(d.refs).toEqual({})
      expect(d.evidence).toEqual([])
      /* No brand content on the record itself. If a hex or a face name ever
         appears here, a direction has become a second author.

         `evidence` joined this list in Phase 5 and is the same kind of thing
         `refs` is: pointers, in list form, at material authored elsewhere.
         `refs` answers "which mark, which palette" — one artifact per named
         slot; `evidence` answers "what made me think so" — many, unordered,
         no slots. The test below is what stops the second one drifting into
         a place to keep copies.

         `label` LEFT this list. A·B·C are positions among the routes that
         exist, derived at render; stored on the record they made the letter
         identity, and the decision log wrote it down and then outlived it. */
      expect(Object.keys(d).sort()).toEqual(
        ['chosen', 'evidence', 'id', 'note', 'refs', 'title'].sort()
      )
    }
  })

  it('keeps citations as references and nothing else', () => {
    s().clearToEmpty()
    s().createNewProject('Cites')
    s().addMoodPin({ id: 77, type: 'image', visual: 'data:image/png;base64,AA' })
    s().toggleDirectionEvidence('a', 'evidence:77')

    const [d] = cur().directions.filter((x) => x.id === 'a')
    expect(d.evidence).toEqual(['evidence:77'])
    /* The image bytes stay on the pin. A citation that carried them would be
       the copy this whole reference grammar exists to prevent. */
    expect(JSON.stringify(d)).not.toMatch(/data:/)
  })

  it('refuses a citation that is not a reference', () => {
    s().clearToEmpty()
    s().createNewProject('Cites')
    s().addDirection()
    s().toggleDirectionEvidence('a', 'just some words')
    expect(dirOf('a').evidence).toEqual([])
  })
})

describe('capture points at what exists; it does not duplicate it', () => {
  beforeEach(freshProject)

  it('stores one artifact when three directions capture the same palette', () => {
    s().updatePaletteColor(0, '#123456')
    for (const id of ['a', 'b', 'c']) s().captureDirectionFrom(id, 'palette')

    const p = cur()
    const keys = p.directions.map((d) => d.refs.palette)
    expect(new Set(keys).size).toBe(1)
    expect(Object.keys(p.artifacts)).toHaveLength(1)
  })

  it('resolves a captured palette back to its colors', () => {
    s().updatePaletteColor(0, '#123456')
    s().captureDirectionFrom('a', 'palette')

    const parts = directionComposition(cur(), dirOf('a'))
    expect(parts.palette.hexes).toContain('#123456')
    expect(parts.filled).toBe(1)
    expect(parts.empty).toEqual([])
    expect(slotSummary('palette', parts.palette)).toMatch(/colors$/)
  })

  it('resolves a captured pairing back to its faces', () => {
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Inter Regular')
    s().captureDirectionFrom('b', 'typePairing')

    const d = dirOf('b')
    const parts = directionComposition(cur(), d)
    expect(parts.typePairing.heading).toBe('Fraunces SemiBold')
    expect(slotSummary('typePairing', parts.typePairing)).toBe(
      'Fraunces SemiBold + Inter Regular'
    )
  })

  it('points a mark slot at the concept record, not a copy of the image', () => {
    s().addLogoConcept('data:image/png;base64,AAA')
    const conceptId = cur().logoConcepts[0].id
    s().captureDirectionFrom('a', 'mark', conceptId)

    expect(dirOf('a').refs.mark).toBe(`markConcept:${conceptId}`)
    const parts = directionComposition(cur(), dirOf('a'))
    expect(parts.mark.id).toBe(conceptId)
    /* The image is read through the concept. Editing the concept's label must
       show up here with nothing to sync. */
    s().updateLogoConcept(conceptId, { label: 'Stamp' })
    expect(
      directionComposition(cur(), dirOf('a')).mark.label
    ).toBe('Stamp')
  })

  it('refuses to capture a pairing that has not been made yet', () => {
    s().updateBrandField('typeHeading', '')
    s().updateBrandField('typeBody', '')
    s().captureDirectionFrom('a', 'typePairing')
    /* An empty artifact would draw a row that reads as a decided part. */
    expect(dirOf('a').refs.typePairing).toBeUndefined()
    expect(Object.keys(cur().artifacts || {})).toHaveLength(0)
  })

  it('ignores a mark id that is not a concept', () => {
    s().captureDirectionFrom('a', 'mark', 'nope')
    expect(dirOf('a').refs.mark).toBeUndefined()
  })
})

describe('the composition does not rot when the parts move on', () => {
  beforeEach(freshProject)

  it('keeps resolving to the palette it was built from after a later edit', () => {
    s().updatePaletteColor(0, '#111111')
    s().captureDirectionFrom('a', 'palette')
    const before = directionComposition(cur(), dirOf('a')).palette

    // The designer keeps working on Color. The direction is history now.
    s().updatePaletteColor(0, '#EEEEEE')

    const after = directionComposition(cur(), dirOf('a')).palette
    expect(after.id).toBe(before.id)
    expect(after.hexes).toEqual(before.hexes)
    expect(after.hexes).not.toContain('#EEEEEE')
    expect(cur().palette[0]).toBe('#EEEEEE')
  })

  it('keeps resolving to the pairing it was built from after a later edit', () => {
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().captureDirectionFrom('a', 'typePairing')
    s().updateBrandField('typeHeading', 'Inter Bold')

    expect(
      directionComposition(cur(), dirOf('a')).typePairing.heading
    ).toBe('Fraunces SemiBold')
  })

  it('says a deleted mark is gone rather than substituting another', () => {
    s().addLogoConcept('data:image/png;base64,AAA')
    s().addLogoConcept('data:image/png;base64,BBB')
    const [first, second] = cur().logoConcepts.map((c) => c.id)
    s().captureDirectionFrom('a', 'mark', first)

    s().removeLogoConcept(first)

    const parts = directionComposition(cur(), dirOf('a'))
    expect(parts.mark).toBeNull()
    /* Not the survivor. A stand-in here would show a composition nobody
       assembled, in a place the designer reads as a record of what they did. */
    expect(cur().logoConcepts.map((c) => c.id)).toEqual([second])
    expect(parts.empty).toEqual(['mark'])
    expect(parts.filled).toBe(0)
  })

  it('distinguishes never-set from pointed-at-something-gone', () => {
    const parts = directionComposition(cur(), dirOf('a'))
    expect(parts.empty).toEqual([])
    expect(COMPOSITION_SLOTS.every((k) => parts[k] === null)).toBe(true)
  })
})

describe('swap and shuffle move references, not content', () => {
  beforeEach(freshProject)

  it('gives B’s mark to C without touching B', () => {
    s().addLogoConcept('data:image/png;base64,AAA')
    const markId = cur().logoConcepts[0].id
    s().captureDirectionFrom('b', 'mark', markId)

    const bRef = dirOf('b').refs.mark
    s().setDirectionRefs('c', { mark: bRef })

    expect(dirOf('b').refs.mark).toBe(bRef)
    expect(dirOf('c').refs.mark).toBe(bRef)
    expect(cur().logoConcepts).toHaveLength(1)
  })

  it('clears a slot with null and leaves the others alone', () => {
    s().updatePaletteColor(0, '#123456')
    s().captureDirectionFrom('a', 'palette')
    s().captureDirectionFrom('a', 'mark', 'nope')
    s().setDirectionRefs('a', { palette: null })

    expect(dirOf('a').refs).toEqual({})
    /* The artifact itself survives — another direction may still name it. */
    expect(Object.keys(cur().artifacts)).toHaveLength(1)
  })

  it('never touches `chosen`', () => {
    s().updateDirection('a', { title: 'Stamp-like', chosen: true })
    s().updatePaletteColor(0, '#123456')
    s().captureDirectionFrom('b', 'palette')
    s().setDirectionRefs('c', { palette: dirOf('b').refs.palette })

    expect(cur().directions.map((d) => d.chosen)).toEqual([true, false, false])
  })
})

describe('choosing a direction is not applying it', () => {
  beforeEach(freshProject)

  function loadedProject() {
    s().updateBrandField('typeHeading', 'Project Heading')
    s().updateBrandField('typeBody', 'Project Body')
    s().updatePaletteColor(0, '#AAAAAA')
    s().addLogoConcept('data:image/png;base64,PROJECT')

    /* Direction B is assembled from something OTHER than what the project
       currently carries — otherwise "did choose overwrite?" is unanswerable. */
    s().updateBrandField('typeHeading', 'Direction Heading')
    s().updatePaletteColor(1, '#BBBBBB')
    s().addLogoConcept('data:image/png;base64,DIRECTION')
    const bMark = cur().logoConcepts[1].id
    s().captureDirectionFrom('b', 'mark', bMark)
    s().captureDirectionFrom('b', 'typePairing')
    s().captureDirectionFrom('b', 'palette')

    // …and then the project moves back on, so the two genuinely differ.
    s().updateBrandField('typeHeading', 'Project Heading')
    s().updatePaletteColor(1, '#CCCCCC')
    return bMark
  }

  it('marks the route and writes no brand value', () => {
    loadedProject()
    const before = cur()
    const snapshot = {
      logoImage: before.logoImage,
      logoWordmark: before.logoWordmark,
      typeHeading: before.typeHeading,
      typeBody: before.typeBody,
      palette: [...before.palette],
      colorRoles: { ...(before.colorRoles || {}) },
    }

    s().updateDirection('b', { title: 'Stamp-like', chosen: true })

    const after = cur()
    expect(inDirs(after, 'b').chosen).toBe(true)
    expect(inDirs(after, 'a').chosen).toBe(false)
    expect(inDirs(after, 'c').chosen).toBe(false)

    expect(after.logoImage).toBe(snapshot.logoImage)
    expect(after.logoWordmark).toBe(snapshot.logoWordmark)
    expect(after.typeHeading).toBe(snapshot.typeHeading)
    expect(after.typeBody).toBe(snapshot.typeBody)
    expect(after.palette).toEqual(snapshot.palette)
    expect(after.colorRoles || {}).toEqual(snapshot.colorRoles)
  })

  it('preserves the composition it was chosen with', () => {
    loadedProject()
    s().updateDirection('b', { title: 'Stamp-like', chosen: true })
    const chosenParts = directionComposition(cur(), dirOf('b'))

    // Weeks of ordinary work on Color and Type afterwards.
    s().updatePaletteColor(0, '#010101')
    s().updateBrandField('typeBody', 'Something Else')

    const still = directionComposition(cur(), dirOf('b'))
    expect(still.palette.id).toBe(chosenParts.palette.id)
    expect(still.typePairing.heading).toBe('Direction Heading')
    expect(still.typePairing.body).toBe('Project Body')
  })

  it('sends the designer to the owning workspace to develop a part', () => {
    /* DEVELOP is a route, not an editor. Every slot must name a real home, or
       the composition grows its own fields and becomes a second author. */
    for (const slot of COMPOSITION_SLOTS) {
      expect(SLOT_HOME[slot].view, slot).toBeTruthy()
      expect(SLOT_HOME[slot].section, slot).toBeTruthy()
    }
    expect(SLOT_HOME.mark.section).toBe('logo')
    expect(SLOT_HOME.typePairing.section).toBe('type')
    expect(SLOT_HOME.palette.section).toBe('colors')
  })
})

/* Real PNG magic bytes with a recognisable tail — `markSource` sniffs the
   bytes and holds anything it cannot identify back from the package, so a
   made-up base64 string would make the leak test pass for the wrong reason. */
const CHOSEN_MARK_B64 = 'iVBORw0KGgpDSE9TRU5NQVJL'
const REJECTED_MARK_B64 = 'iVBORw0KGgpSRUpFQ1RFRE1BUks='

describe('references never reach the client', () => {
  beforeEach(freshProject)

  function withRefs() {
    /* The project's own mark first, so it is the chosen one and the package
       is entitled to show it. The second is the rejected route's — that is
       the one under test. */
    s().addLogoConcept(`data:image/png;base64,${CHOSEN_MARK_B64}`)
    s().addLogoConcept(`data:image/png;base64,${REJECTED_MARK_B64}`)
    s().updatePaletteColor(0, '#123456')
    const markId = cur().logoConcepts[1].id
    s().updateDirection('a', { title: 'Kept', note: 'why', chosen: true })
    s().captureDirectionFrom('a', 'palette')
    s().updateDirection('b', { title: 'Rejected route', note: 'not this' })
    s().captureDirectionFrom('b', 'mark', markId)
    s().captureDirectionFrom('b', 'palette')
    return markId
  }

  it('strips refs from the pack snapshot', () => {
    withRefs()
    const pack = buildBrandPackSnapshot({
      project: cur(),
      tasks: [],
      moodItems: [],
    })
    expect(pack.directions.length).toBeGreaterThan(0)
    for (const d of pack.directions) {
      /* An allowlist, not a delete list. A field added to a direction next
         year must not reach a client because nobody remembered to remove it. */
      expect(Object.keys(d).sort()).toEqual(
        ['chosen', 'id', 'label', 'note', 'title'].sort()
      )
      expect(d.refs).toBeUndefined()
    }
    expect(pack.artifacts).toBeUndefined()
  })

  it('leaks no ref key or artifact id into brand.md', () => {
    const markId = withRefs()
    const pack = buildBrandPackSnapshot({
      project: cur(),
      tasks: [],
      moodItems: [],
    })
    const md = brandPackToMarkdown(pack)

    expect(md).not.toContain('markConcept:')
    expect(md).not.toContain('typePairing:')
    expect(md).not.toContain(markId)
    expect(md).not.toMatch(/\bpal_[0-9a-f]{8}\b/)
    expect(md).not.toMatch(/\btype_[0-9a-f]{8}\b/)
    /* The rejected route's own words still travel — that was always true and
       is the designer's call. What must not travel is the mark behind it. */
    expect(md).toContain('Rejected route')
  })

  it('leaks no ref key or artifact id into the HTML package', () => {
    const markId = withRefs()
    const html = brandPackToHtml(
      buildBrandPackSnapshot({ project: cur(), tasks: [], moodItems: [] })
    )
    expect(html).not.toContain('markConcept:')
    expect(html).not.toContain(markId)
    expect(html).not.toMatch(/\bpal_[0-9a-f]{8}\b/)
    expect(html).not.toMatch(/\btype_[0-9a-f]{8}\b/)
  })

  it('ships only the chosen mark in the logo files', () => {
    withRefs()
    const files = markPackFiles(
      buildBrandPackSnapshot({ project: cur(), tasks: [], moodItems: [] })
    )
    /* The logo folder is fed by the project's own chosen mark and by nothing
       else. A direction's ref is not a second way to get bytes into a client's
       hands — which is exactly what a rejected route's mark would be. */
    expect(files.hasMark).toBe(true)
    const bytes = files.files.filter((f) => f.base64).map((f) => f.content)
    expect(bytes).toContain(CHOSEN_MARK_B64)
    expect(bytes).not.toContain(REJECTED_MARK_B64)
  })
})

describe('the v8 migration is additive and idempotent', () => {
  const migrate = (persisted) =>
    useAppStore.persist.getOptions().migrate(persisted, 7)

  it('backfills refs and keeps everything already written', () => {
    const out = migrate({
      moodItems: [],
      projects: [
        {
          id: 'p1',
          name: 'Old',
          directions: [
            { id: 'a', label: 'A', title: 'Kept', note: 'why', chosen: true },
            { id: 'b', label: 'B', title: '', note: '', chosen: false },
            { id: 'c', label: 'C', title: '', note: '', chosen: false },
          ],
        },
      ],
    })
    const dirs = out.projects[0].directions
    expect(dirs[0].title).toBe('Kept')
    expect(dirs[0].chosen).toBe(true)
    expect(dirs.every((d) => d.refs && Object.keys(d.refs).length === 0)).toBe(
      true
    )
  })

  it('does not wipe refs on a workspace that already has them', () => {
    const withRef = {
      moodItems: [],
      projects: [
        {
          id: 'p1',
          directions: [
            { id: 'a', label: 'A', title: 't', refs: { palette: 'palette:pal_1' } },
            { id: 'b', label: 'B', title: '' },
            { id: 'c', label: 'C', title: '' },
          ],
        },
      ],
    }
    const once = migrate(withRef)
    const twice = migrate(once)
    expect(twice.projects[0].directions[0].refs).toEqual({
      palette: 'palette:pal_1',
    })
    expect(twice.projects[0].directions[1].refs).toEqual({})
  })

  it('gives a project with no directions no routes, not three blanks', () => {
    const out = migrate({ moodItems: [], projects: [{ id: 'p1' }] })
    /* The migration used to mint three empty records for any project that had
       none, which put a worksheet in front of every project that predated the
       feature. An absent array and an empty one now mean the same thing. */
    expect(out.projects[0].directions).toEqual([])
  })
})

describe('refs live under the slot model, not around it', () => {
  beforeEach(freshProject)

  it('creates the record when a reference is set on an empty slot', () => {
    /* Pointing a direction at a mark is a designer asking for one, the same
       explicit act as typing a title. */
    s().deleteDirection('b')
    expect(cur().directions.map((d) => d.id)).toEqual(['a', 'c'])

    s().updatePaletteColor(0, '#123456')
    s().captureDirectionFrom('b', 'palette')
    expect(cur().directions.map((d) => d.id)).toEqual(['a', 'b', 'c'])
    expect(dirOf('b').refs.palette).toMatch(/^palette:pal_/)
    expect(dirOf('b').title).toBe('')
  })

  it('does NOT create a record when a reference is cleared on an empty slot', () => {
    s().deleteDirection('b')
    s().setDirectionRefs('b', { palette: null })
    /* Removing a reference from a slot that holds nothing must not conjure a
       direction to remove it from — that is the resurrection bug in a new
       costume. */
    expect(cur().directions.map((d) => d.id)).toEqual(['a', 'c'])
  })

  it('loses a deleted direction’s refs with it, and does not bring them back', () => {
    s().updatePaletteColor(0, '#123456')
    s().captureDirectionFrom('b', 'palette')
    s().deleteDirection('b')

    const reloaded = useAppStore.persist
      .getOptions()
      .migrate(
        JSON.parse(
          JSON.stringify(useAppStore.persist.getOptions().partialize(s()))
        ),
        7
      ).projects[0]
    expect(reloaded.directions.map((d) => d.id)).toEqual(['a', 'c'])
    /* The artifact itself survives — it is content-addressed and something
       else may name it. What must not survive is the direction. */
    expect(Object.keys(reloaded.artifacts)).toHaveLength(1)
  })

  it('backfills refs only onto records that exist', () => {
    const out = useAppStore.persist.getOptions().migrate(
      {
        moodItems: [],
        projects: [
          {
            id: 'p1',
            directions: [
              { id: 'a', label: 'A', title: 'Alpha', chosen: false },
            ],
          },
        ],
      },
      7
    )
    expect(out.projects[0].directions).toHaveLength(1)
    expect(out.projects[0].directions[0].refs).toEqual({})
  })

  it('reads a missing route as an empty composition', () => {
    s().deleteDirection('c')
    expect(dirOf('c')).toBeNull()
    /* Nothing draws a route that does not exist any more, but the resolver is
       still handed whatever it is given: it must not throw and must not
       invent. */
    const parts = directionComposition(cur(), dirOf('c'))
    expect(parts.filled).toBe(0)
    expect(parts.empty).toEqual([])
  })
})
