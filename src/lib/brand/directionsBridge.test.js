import { readFileSync } from 'node:fs'
import { describe, it, expect, beforeEach } from 'vitest'
import useAppStore from '../../store/useAppStore'
import {
  favoritePins,
  isFavorite,
  isSamplePin,
  isSharedWithClient,
  pinSampleId,
} from './favorites'
import {
  citingDirections,
  directionEvidence,
  evidenceSummary,
  pinRefKey,
  projectEvidence,
} from './directionEvidence'
import { artifactsOfKind, directionComposition } from './directionComposition'
import { formatDecisionLine } from '../decisionLog'
import {
  pathGapFocusSelector,
  pathStepMeetsCondition,
} from '../journey/journeyProgress'
import {
  directionLetter,
  directionLetters,
  firstFreeDirectionSlot,
  orderedDirections,
} from './directionLetters'

/**
 * RESEARCH DISCOVERS, DIRECTIONS INTERPRETS, IDENTITY DEVELOPS.
 *
 * The Phase 4 audit found the middle of that sentence was not connected at
 * either end. Favorites had no consumer, `lib/brand/favorites.js` had no
 * non-test importer, Visual Discovery's heart called `toggleFavorite` against
 * a pin that could not exist, and a Direction's only downstream reader
 * anywhere was one line on a brand-book page.
 *
 * These tests are the wiring, and the guards on what it must not become: a
 * second favorites store, a second place brand content is authored, or a
 * screen that substitutes today's material for the material a route was
 * actually built from.
 */

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)
const dir = (id) => cur().directions.find((d) => d.id === id)
const pins = () => s().moodItems

const SERIF = 'type:fraunces:700'
const SANS = 'type:playfair:400'
const OCHRE = 'color:b45309'

function fresh() {
  s().clearToEmpty()
  s().createNewProject('Bridge')
}

/** A project with `n` routes, made the way the screen makes them. */
function withRoutes(n) {
  fresh()
  for (let i = 0; i < n; i += 1) s().addDirection()
}

describe('one favorite concept, wherever the thing came from', () => {
  beforeEach(fresh)

  it('favoriting a Visual Discovery sample actually favorites something', () => {
    /* THE DEFECT. `toggleFavorite('sample:…')` mapped over `moodItems` looking
       for a matching id. Samples come from the app's registry and are never
       mood items, so the heart in Visual Discovery matched nothing and the
       click did nothing at all — silently, every time. */
    s().toggleFavorite(`sample:${SERIF}`, true)

    const pin = pins().find((m) => m.id === `sample:${SERIF}`)
    expect(pin).toBeTruthy()
    expect(isFavorite(pin)).toBe(true)
    expect(pinSampleId(pin)).toBe(SERIF)
  })

  it('keeps hand-collected pins working exactly as they did', () => {
    s().addMoodPin({ id: 9, type: 'image', visual: 'x', note: 'the light' })
    s().toggleFavorite(9)
    expect(isFavorite(pins().find((m) => m.id === 9))).toBe(true)
    s().toggleFavorite(9)
    expect(isFavorite(pins().find((m) => m.id === 9))).toBe(false)
    /* And it is still on the wall — un-favoriting a pin the designer made is
       not a deletion. */
    expect(pins().some((m) => m.id === 9)).toBe(true)
  })

  it('puts both kinds in one list, because there is one list', () => {
    s().addMoodPin({ id: 9, type: 'image', visual: 'x' })
    s().toggleFavorite(9)
    s().toggleFavorite(`sample:${OCHRE}`, true)
    expect(favoritePins(pins(), s().currentProjectId)).toHaveLength(2)
  })

  it('never puts a favorited sample in front of a client', () => {
    s().toggleFavorite(`sample:${OCHRE}`, true)
    expect(isSharedWithClient(pins().find(isSamplePin))).toBe(false)
  })

  it('takes an untouched sample pin away again when the heart it came from goes off', () => {
    /* Visual Discovery's heart is the only way back to a pin it created, so
       pressing it twice must leave the wall as it found it — otherwise every
       sample ever considered accumulates a card. */
    s().toggleFavorite(`sample:${OCHRE}`, true, { dispose: true })
    s().toggleFavorite(`sample:${OCHRE}`, false, { dispose: true })
    expect(pins().some(isSamplePin)).toBe(false)
  })

  it('only turns the flag off when the heart is the one on the wall', () => {
    /* Same pin, different surface. On Research the card is visible and its
       heart says "Remove favorite" — deleting it there would be a destructive
       act reported as a smaller one. */
    s().toggleFavorite(`sample:${OCHRE}`, true, { dispose: true })
    s().toggleFavorite(`sample:${OCHRE}`, false)

    const pin = pins().find((m) => m.id === `sample:${OCHRE}`)
    expect(pin).toBeTruthy()
    expect(isFavorite(pin)).toBe(false)
  })

  it('keeps a sample pin the designer made their own', () => {
    s().toggleFavorite(`sample:${OCHRE}`, true, { dispose: true })
    s().updateMoodPinNote(`sample:${OCHRE}`, 'the colour of the packaging')
    s().toggleFavorite(`sample:${OCHRE}`, false, { dispose: true })

    const pin = pins().find((m) => m.id === `sample:${OCHRE}`)
    expect(pin).toBeTruthy()
    expect(isFavorite(pin)).toBe(false)
  })

  it('builds the same record `addMoodPin` would', () => {
    /* A SECOND PIN CONSTRUCTOR EXISTS and cannot not exist — the pin has to be
       there before a flag can be set on it. So the guard is that the two
       shapes stay equal: a field added to one and not the other is how a
       future migration quietly skips every sample pin. */
    s().addMoodPin({ id: 9, type: 'image', visual: 'x' })
    s().toggleFavorite(`sample:${OCHRE}`, true)
    const hand = pins().find((m) => m.id === 9)
    const sample = pins().find(isSamplePin)
    for (const k of Object.keys(hand)) {
      expect(Object.hasOwn(sample, k), `sample pin is missing "${k}"`).toBe(true)
    }
  })

  it('refuses to conjure a pin for an id no sample answers to', () => {
    s().toggleFavorite('sample:type:not-a-real-family:400', true)
    expect(pins()).toHaveLength(0)
  })

  it('survives the round trip through storage', () => {
    s().toggleFavorite(`sample:${SERIF}`, true)
    const revived = JSON.parse(JSON.stringify({ moodItems: pins() }))
    expect(isFavorite(revived.moodItems[0])).toBe(true)
    expect(pinSampleId(revived.moodItems[0])).toBe(SERIF)
  })

  it('carries no copy of the sample beyond a face it cannot rot into', () => {
    /* A sample is app-level and immutable, so the swatch on the wall can never
       disagree with it. Everything richer — the family, the weight, the trait
       record — is read back through the registry. */
    s().toggleFavorite(`sample:${SERIF}`, true)
    const pin = pins()[0]
    expect(pin.family).toBeUndefined()
    expect(pin.traits).toBeUndefined()
    expect(pin.weight).toBeUndefined()
  })
})

describe('favorites have a consumer now', () => {
  beforeEach(fresh)

  it('Directions sees what the designer responded to', () => {
    s().addMoodPin({ id: 9, type: 'image', visual: 'x', note: 'the light' })
    s().toggleFavorite(9)
    s().toggleFavorite(`sample:${SERIF}`, true)

    const seen = projectEvidence(cur(), pins())
    expect(seen).toHaveLength(2)
    expect(seen.map((i) => i.kind).sort()).toEqual(['evidence', 'sample'])
    /* Resolved, not copied: the sample's letterform data comes from the
       registry at read time. */
    expect(seen.find((i) => i.kind === 'sample').sample.family).toBe('Fraunces')
  })

  it('shows nothing when nothing was kept, rather than filling the gap', () => {
    s().addMoodPin({ id: 9, type: 'image', visual: 'x' })
    expect(projectEvidence(cur(), pins())).toEqual([])
  })

  it('leaves another project’s favorites out of it', () => {
    s().toggleFavorite(`sample:${SERIF}`, true)
    const first = s().currentProjectId
    s().createNewProject('Second')
    expect(projectEvidence(cur(), pins())).toEqual([])
    expect(
      projectEvidence({ id: first }, pins()).map((i) => i.key)
    ).toEqual([`sample:${SERIF}`])
  })
})

describe('a direction cites material; it does not absorb it', () => {
  beforeEach(fresh)

  it('records a citation as a reference', () => {
    s().toggleFavorite(`sample:${SERIF}`, true)
    s().toggleDirectionEvidence('a', `sample:${SERIF}`)

    const [item] = directionEvidence(dir('a'), pins(), cur().id)
    expect(item.missing).toBe(false)
    expect(item.sample.id).toBe(SERIF)
    expect(evidenceSummary(item)).toBe('Fraunces Bold')
  })

  it('says a deleted pin is gone rather than showing a different one', () => {
    /* THE RULE A DIRECTION EXISTS TO HOLD. Substituting whatever the wall
       holds today would show a route built from material the designer never
       saw. */
    s().addMoodPin({ id: 9, type: 'image', visual: 'x', note: 'the light' })
    s().toggleFavorite(9)
    s().toggleDirectionEvidence('a', 'evidence:9')
    s().addMoodPin({ id: 10, type: 'image', visual: 'y', note: 'a different one' })
    s().removeMoodPin(9)

    const [item] = directionEvidence(dir('a'), pins(), cur().id)
    expect(item.missing).toBe(true)
    expect(evidenceSummary(item)).toBe('No longer available')
    /* And the direction is still a direction. */
    expect(dir('a').evidence).toEqual(['evidence:9'])
  })

  it('keeps a favorited sample citable after the pin leaves the wall', () => {
    /* A sample belongs to the app, so the stimulus can still be drawn even
       once the designer has taken it off their board. */
    s().toggleFavorite(`sample:${OCHRE}`, true)
    s().toggleDirectionEvidence('a', `sample:${OCHRE}`)
    s().toggleFavorite(`sample:${OCHRE}`, false)

    const [item] = directionEvidence(dir('a'), pins(), cur().id)
    expect(item.missing).toBe(false)
    expect(item.sample.hex).toBe('#B45309')
  })

  it('stops citing without deleting the direction', () => {
    s().toggleFavorite(`sample:${SERIF}`, true)
    s().toggleDirectionEvidence('a', `sample:${SERIF}`)
    s().updateDirection('a', { title: 'Quiet serif' })
    s().toggleDirectionEvidence('a', `sample:${SERIF}`)

    expect(dir('a').evidence).toEqual([])
    expect(dir('a').title).toBe('Quiet serif')
  })

  it('does not mint a direction just to un-cite something', () => {
    s().toggleDirectionEvidence('c', `sample:${SERIF}`)
    s().toggleDirectionEvidence('c', `sample:${SERIF}`)
    /* Created by the first call, emptied by the second — but a slot that never
       held anything must not gain a record from a removal. */
    s().deleteDirection('c')
    s().toggleDirectionEvidence('c', `sample:${SERIF}`)
    s().toggleDirectionEvidence('c', `sample:${SERIF}`)
    expect(cur().directions.some((d) => d.id === 'c')).toBe(true)
  })

  it('reads the overlap between routes, and states it as letters', () => {
    /* THE COMPARISON. Two routes citing the same serif and a third not is a
       fact no single card can state. It is a list of letters and never a
       score — ranking routes by how much evidence they carry would be an
       opinion the material does not hold. */
    s().toggleFavorite(`sample:${SERIF}`, true)
    s().toggleFavorite(`sample:${SANS}`, true)
    s().toggleDirectionEvidence('a', `sample:${SERIF}`)
    s().toggleDirectionEvidence('b', `sample:${SERIF}`)
    s().toggleDirectionEvidence('c', `sample:${SANS}`)

    /* IDS, NOT LETTERS. A letter is a position among the routes that exist and
       reflows when one is deleted; callers that draw chips map through
       `directionLetters`. */
    expect(citingDirections(cur(), `sample:${SERIF}`)).toEqual(['a', 'b'])
    expect(citingDirections(cur(), `sample:${SANS}`)).toEqual(['c'])
    expect(directionLetters(cur())).toEqual({ a: 'A', b: 'B', c: 'C' })
  })

  it('agrees with the band about what a pin is called', () => {
    s().addMoodPin({ id: 9, type: 'image', visual: 'x' })
    s().toggleFavorite(9)
    const [item] = projectEvidence(cur(), pins())
    /* The band's key and the citation's key have to be the same string, or a
       piece of material could be cited and never show as cited. */
    expect(item.key).toBe(pinRefKey(pins().find((m) => m.id === 9)))
    s().toggleDirectionEvidence('a', item.key)
    expect(citingDirections(cur(), item.key)).toEqual(['a'])
  })
})

describe('active is not chosen', () => {
  beforeEach(fresh)

  it('develops one route while another is the answer', () => {
    s().updateDirection('a', { title: 'Quiet serif' })
    s().updateDirection('b', { title: 'Loud grotesk' })
    s().updateDirection('a', { chosen: true })
    s().setActiveDirection('b')

    expect(cur().activeDirectionId).toBe('b')
    expect(dir('a').chosen).toBe(true)
    expect(dir('b').chosen).toBe(false)
  })

  it('choosing opens the route it chose', () => {
    /* One-way only: having decided which route the project takes, the next act
       is making it. Opening a route to look at it still decides nothing — the
       test below holds that half. */
    s().updateDirection('a', { title: 'A' })
    s().setActiveDirection('a')
    s().updateDirection('b', { title: 'B' })
    s().updateDirection('b', { chosen: true })
    expect(cur().activeDirectionId).toBe('b')
    expect(dir('a').chosen).toBe(false)
  })

  it('developing does not choose', () => {
    s().updateDirection('a', { title: 'A' })
    s().setActiveDirection('a')
    expect(dir('a').chosen).toBe(false)
    expect(cur().decisionLog || []).toHaveLength(0)
  })

  it('presses off when pressed again', () => {
    s().updateDirection('a', { title: 'A' })
    s().setActiveDirection('a')
    s().setActiveDirection('a')
    expect(cur().activeDirectionId).toBe(null)
  })

  it('refuses anything that is not a slot', () => {
    s().setActiveDirection('d')
    expect(cur().activeDirectionId).toBe(null)
  })

  it('stops developing a route that no longer exists', () => {
    s().updateDirection('b', { title: 'B' })
    s().setActiveDirection('b')
    s().deleteDirection('b')
    expect(cur().activeDirectionId).toBe(null)
  })
})

describe('swap repoints; it never creates', () => {
  beforeEach(fresh)

  it('gives a second route the palette the first was built from', () => {
    s().updatePaletteColor(0, '#123456')
    s().captureDirectionFrom('a', 'palette')
    const first = dir('a').refs.palette

    s().updatePaletteColor(0, '#654321')
    s().captureDirectionFrom('b', 'palette')
    expect(dir('b').refs.palette).not.toBe(first)

    /* SWAP. Before this, "Use current" was the only way to point a slot at a
       palette, so the earlier snapshot existed and nothing could name it. */
    s().setDirectionRefs('b', { palette: first })
    expect(dir('b').refs.palette).toBe(first)
    expect(directionComposition(cur(), dir('b')).palette.hexes[0]).toBe('#123456')
  })

  it('offers exactly the snapshots the project has held', () => {
    s().updatePaletteColor(0, '#123456')
    s().captureDirectionFrom('a', 'palette')
    s().updatePaletteColor(0, '#654321')
    s().captureDirectionFrom('b', 'palette')
    expect(artifactsOfKind(cur(), 'palette')).toHaveLength(2)
    expect(artifactsOfKind(cur(), 'typePairing')).toHaveLength(0)
  })

  it('stores one artifact however many routes point at it', () => {
    s().updatePaletteColor(0, '#123456')
    for (const id of ['a', 'b', 'c']) s().captureDirectionFrom(id, 'palette')
    expect(Object.keys(cur().artifacts || {})).toHaveLength(1)
  })
})

describe('the handoff to Identity', () => {
  beforeEach(fresh)

  it('hands over a starting configuration without becoming a second store', () => {
    s().addLogoConcept('data:image/png;base64,AAA')
    s().addLogoConcept('data:image/png;base64,BBB')
    const [, second] = cur().logoConcepts
    s().captureDirectionFrom('a', 'mark', second.id)
    s().updateDirection('a', { title: 'Quiet serif' })
    s().setActiveDirection('a')

    /* What the indicator on Identity reads. The direction names the concept;
       the concept still lives in `logoConcepts` and the choosing is done by
       the action Identity already uses. */
    const parts = directionComposition(cur(), dir('a'))
    expect(parts.mark.id).toBe(second.id)
    s().chooseLogoConcept(parts.mark.id)
    expect(cur().logoConcepts.find((c) => c.chosen).id).toBe(second.id)
    /* And the direction did not grow a copy of the mark. */
    expect(dir('a').refs.mark).toBe(`markConcept:${second.id}`)
    expect(JSON.stringify(dir('a'))).not.toMatch(/data:/)
  })

  it('hands over faces through the field Identity already owns', () => {
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Plus Jakarta Sans Regular')
    s().captureDirectionFrom('a', 'typePairing')
    const captured = directionComposition(cur(), dir('a')).typePairing

    s().updateBrandField('typeHeading', 'Something else')
    expect(captured.heading).toBe('Fraunces SemiBold')

    s().updateBrandField('typeHeading', captured.heading)
    expect(cur().typeHeading).toBe('Fraunces SemiBold')
  })

  it('never writes brand content onto the direction record', () => {
    s().updatePaletteColor(0, '#123456')
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().captureDirectionFrom('a', 'palette')
    s().captureDirectionFrom('a', 'typePairing')
    s().toggleFavorite(`sample:${OCHRE}`, true)
    s().toggleDirectionEvidence('a', `sample:${OCHRE}`)

    const json = JSON.stringify(dir('a'))
    expect(json).not.toMatch(/#123456/)
    expect(json).not.toMatch(/Fraunces/)
    expect(json).not.toMatch(/#B45309/i)
  })
})

describe('routes are made, not pre-drawn', () => {
  beforeEach(fresh)

  it('starts with none, so Add is the only thing to do', () => {
    expect(cur().directions).toEqual([])
    expect(orderedDirections(cur())).toEqual([])
    expect(firstFreeDirectionSlot(cur())).toBe('a')
  })

  it('creates exactly one record, and opens it', () => {
    const id = s().addDirection()
    expect(id).toBe('a')
    expect(cur().directions).toHaveLength(1)
    expect(cur().activeDirectionId).toBe('a')
  })

  it('caps the shortlist at three', () => {
    for (let i = 0; i < 5; i += 1) s().addDirection()
    expect(cur().directions.map((d) => d.id)).toEqual(['a', 'b', 'c'])
    expect(s().addDirection()).toBe('')
    expect(firstFreeDirectionSlot(cur())).toBe(null)
  })

  it('derives the letter from display position, never from the record', () => {
    withRoutes(3)
    for (const [id, title] of [['a', 'Quiet'], ['b', 'Loud'], ['c', 'Ink']]) {
      s().updateDirection(id, { title })
    }
    expect(orderedDirections(cur()).map((d) => d.letter)).toEqual(['A', 'B', 'C'])
    /* No record carries one. A stored letter is what let the decision log
       outlive the position it named. */
    expect(cur().directions.every((d) => d.label === undefined)).toBe(true)
    expect(directionLetter(0)).toBe('A')
  })

  it('promotes C to B on screen without moving C', () => {
    withRoutes(3)
    s().updateDirection('c', { title: 'Ink and paper' })
    s().toggleDirectionEvidence('c', 'evidence:9')
    s().deleteDirection('b')

    const rows = orderedDirections(cur())
    expect(rows.map((r) => r.letter)).toEqual(['A', 'B'])
    const promoted = rows[1]
    expect(promoted.letter).toBe('B')
    /* THE POINT. Its id, its citations and anything pointing at it are
       untouched — only the letter it is drawn with changed. */
    expect(promoted.id).toBe('c')
    expect(promoted.evidence).toEqual(['evidence:9'])
    expect(dir('c').title).toBe('Ink and paper')
  })

  it('keeps a decision pointing at the route it was made about', () => {
    withRoutes(3)
    s().updateDirection('c', { title: 'Ink and paper', chosen: true })
    const entry = cur().decisionLog.find((e) => e.kind === 'direction')
    expect(entry.directionId).toBe('c')
    expect(entry.label).toBe('')

    s().deleteDirection('b')
    /* C is drawn as B now. The log still names C, and still reads correctly
       because it never wrote a letter down. */
    expect(orderedDirections(cur()).find((r) => r.id === 'c').letter).toBe('B')
    expect(cur().decisionLog[0].directionId).toBe('c')
    expect(formatDecisionLine(cur().decisionLog[0])).toBe('Ink and paper')
  })

  it('chooses one at a time', () => {
    withRoutes(3)
    s().updateDirection('a', { title: 'A', chosen: true })
    s().updateDirection('c', { title: 'C', chosen: true })
    expect(cur().directions.filter((d) => d.chosen).map((d) => d.id)).toEqual(['c'])
  })
})

describe('evidence lands on one route only', () => {
  beforeEach(() => {
    withRoutes(2)
    s().toggleFavorite(`sample:${SERIF}`, true)
  })

  it('cites against the route the caller names, and no other', () => {
    s().toggleDirectionEvidence('a', `sample:${SERIF}`)
    expect(dir('a').evidence).toEqual([`sample:${SERIF}`])
    expect(dir('b').evidence).toEqual([])
  })

  it('leaves no copy behind when the research pin is deleted', () => {
    s().addMoodPin({ id: 9, type: 'image', visual: 'data:image/png;base64,AA' })
    s().toggleFavorite(9)
    s().toggleDirectionEvidence('a', 'evidence:9')
    s().removeMoodPin(9)

    /* The citation survives as a reference and resolves to nothing. What must
       NOT survive is the image: a route that kept its own copy would show a
       pin the designer deleted. */
    expect(dir('a').evidence).toEqual(['evidence:9'])
    expect(JSON.stringify(dir('a'))).not.toMatch(/data:/)
    const [item] = directionEvidence(dir('a'), pins(), cur().id)
    expect(item.missing).toBe(true)
  })
})

describe('the completion rules are exactly where they were', () => {
  beforeEach(fresh)

  it('is not completed by the Add control the gap points at', () => {
    /* The gap selector is a FOCUS TARGET. Pressing what it points at creates
       an unnamed route, which is not work done on this stop. */
    expect(pathGapFocusSelector('ideate')).toContain('#dir-add')
    s().addDirection()
    expect(pathStepMeetsCondition('ideate', { project: cur() })).toBe(false)
  })

  it('is completed by naming a route, as it always was', () => {
    s().addDirection()
    s().updateDirection('a', { title: 'Quiet serif' })
    expect(pathStepMeetsCondition('ideate', { project: cur() })).toBe(true)
  })

  it('still honours the branches saved projects rely on', () => {
    /* Nothing writes these any more. They stay so a project that ticked this
       stop on a rough idea or a spark pin in 2026 keeps its tick. */
    expect(
      pathStepMeetsCondition('ideate', { project: { roughIdeas: ['a thought'] } })
    ).toBe(true)
    expect(
      pathStepMeetsCondition('ideate', {
        project: {},
        moodItems: [{ type: 'spark', fromSpark: true }],
      })
    ).toBe(true)
  })

  it('has no writer left for either of them', () => {
    const store = read('../../store/useAppStore.js')
    expect(store).not.toMatch(/setRoughIdeas:/)
    const view = read('../../views/SparkView.jsx')
    expect(view).not.toMatch(/roughIdeas|fromSpark|currentSpark|sparksTried/)
  })
})

describe('the wiring is real, not planned', () => {

  it('Directions renders the evidence band and both verbs', () => {
    const src = read('../../views/SparkView.jsx')
    expect(src).toContain('EvidenceBand')
    expect(src).toContain('EvidenceStrip')
    expect(src).toContain('toggleDirectionEvidence')
    /* Develop and Choose are two buttons, because they are two acts. */
    expect(src).toContain('developRoute')
    expect(src).toContain('chooseRoute')
  })

  it('Develop lands on the sub-screen that owns the part', () => {
    /* Not `setActiveView('brand')` alone: that drops the section and every
       part of a composition would open on Mark. */
    const src = read('../../views/SparkView.jsx')
    expect(src).toContain('goSystemSection(home.section)')
    expect(read('../../app/MainOutlet.jsx')).toMatch(
      /<SparkView[\s\S]*?goSystemSection=\{goSystemSection\}/
    )
  })

  it('Identity says which route it is being made for, and can stop', () => {
    expect(read('../../views/DesignView.jsx')).toContain('DirectionInDevelopment')
    /* The state is visible here, so the off switch belongs here. Without it
       the only way to clear it was a button on another screen whose label had
       become a status word — so in practice it would never be cleared and this
       strip would assert a stale route for the life of the project. */
    expect(read('../../features/discovery/DirectionInDevelopment.jsx')).toContain('Stop')
  })

  it('Develop always navigates, even to the route already open', () => {
    /* It used to toggle off in that case, so the likeliest press on the
       screen — coming back to the route you are on — silently cleared the
       strip and did not navigate. */
    const src = read('../../views/SparkView.jsx')
    expect(src).not.toMatch(/const stopping =/)
    expect(src).toContain("setActiveView?.('brand')")
  })

  it('the discovery heart reads its own state back', () => {
    /* Hardcoded `true`, no pressed state, no styling: a press left no mark
       anywhere the designer was looking, which for someone choosing by
       reaction is the same as the button not existing. */
    const view = read('../../features/discovery/VisualDiscovery.jsx')
    expect(view).toContain('aria-pressed={kept(s)}')
    expect(view).not.toMatch(/toggleFavorite\(`sample:\$\{s\.id\}`, true\)/)
  })

  it('Visual Discovery hearts a sample the way the store reads one', () => {
    /* THE ORIGINAL DEFECT WAS A SHAPE MISMATCH, so the guard is on the shape.
       The view builds `sample:${s.id}` and the store parses that same string
       back through the reference grammar; if either side changes its mind
       about the prefix, the heart goes silent again with nothing failing. */
    const view = read('../../features/discovery/VisualDiscovery.jsx')
    expect(view).toContain('toggleFavorite(`sample:${s.id}`')
    const store = read('../../store/useAppStore.js')
    expect(store).toContain('pinFromSample')
    expect(store).toContain('samplePinId')
  })

  it('favorites.js is imported by something that is not a test', () => {
    /* The claim this module carried for two phases — "this is what Color,
       Type, Mark and Directions consume" — was true of nothing. */
    expect(read('./directionEvidence.js')).toContain("from './favorites'")
  })
})
