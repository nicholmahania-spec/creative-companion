import { describe, expect, it, beforeEach } from 'vitest'
import useAppStore, {
  DIRECTION_SLOTS,
  directionLetter,
  orderedDirections,
  blankDirection,
  blankDirections,
  isDirectionSlot,
} from '../../store/useAppStore'
import { pathStepMeetsCondition } from '../journey/journeyProgress'

/**
 * EMPTY IS VALID STATE.
 *
 * Ideate shows three places to put a direction. That is a fact about the page.
 * It was implemented as a fact about the data — "three records must exist" —
 * and four separate places enforced it by testing `directions.length >= 3` and
 * replacing the WHOLE array with three blanks when the test failed:
 *
 *   the persist migration, `hydrateFromPayload`, and SparkView's render.
 *
 * So a designer who deleted B did not merely watch B come back. A and C were
 * discarded with it, because the repair threw away the array rather than the
 * gap. The symptom read as "the deletion didn't save"; the damage was larger
 * than the deletion.
 *
 * These tests hold the two apart. A slot is a constant. A record exists only
 * because someone wrote it, and stops existing when someone deletes it — and
 * no loader, migration or render may mint one back.
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
const ids = (p) => (p.directions || []).map((d) => d.id)
const titles = (p) =>
  (p.directions || []).map((d) => `${d.id}:${d.title || '∅'}`)

/** Everything persist actually does between a write and the next boot. */
function roundTrip(fromVersion = 7) {
  const opts = useAppStore.persist.getOptions()
  const stored = JSON.parse(JSON.stringify(opts.partialize(s())))
  return opts.migrate(stored, fromVersion)
}

function threeWritten() {
  s().clearToEmpty()
  s().createNewProject('Deletion')
  s().updateDirection('a', { title: 'Alpha' })
  s().updateDirection('b', { title: 'Beta' })
  s().updateDirection('c', { title: 'Gamma' })
}

describe('slots are a constant; records are data', () => {
  it('names exactly three slots and refuses any other id', () => {
    expect(DIRECTION_SLOTS.map((sl) => sl.id)).toEqual(['a', 'b', 'c'])
    /* NO LETTER ON THE SLOT. A·B·C are positions among the routes that exist,
       derived at render — see `directionLetter`. A slot that carried one made
       the letter identity, and the decision log wrote it down. */
    expect(DIRECTION_SLOTS.every((sl) => sl.label === undefined)).toBe(true)
    expect([0, 1, 2].map(directionLetter)).toEqual(['A', 'B', 'C'])
    expect(isDirectionSlot('a')).toBe(true)
    expect(isDirectionSlot('B')).toBe(true)
    expect(isDirectionSlot('d')).toBe(false)
    expect(isDirectionSlot('')).toBe(false)
  })

  it('drops a deleted route from the row rather than drawing it empty', () => {
    threeWritten()
    s().deleteDirection('b')
    const rows = orderedDirections(cur())
    /* Two routes, two cards. The empty middle slot is not drawn, and the
       survivor that was C is now shown as B — while its id never moved. */
    expect(rows.map((r) => r.id)).toEqual(['a', 'c'])
    expect(rows.map((r) => r.letter)).toEqual(['A', 'B'])
    expect(rows[1].title).toBe('Gamma')
  })

  it('draws nothing for a project with no routes at all', () => {
    threeWritten()
    for (const id of ['a', 'b', 'c']) s().deleteDirection(id)
    expect(orderedDirections(cur())).toEqual([])
    expect(orderedDirections({})).toEqual([])
  })
})

describe('deleting a direction persists', () => {
  beforeEach(threeWritten)

  for (const target of ['a', 'b', 'c']) {
    it(`deleting ${target.toUpperCase()} survives a reload, and keeps the others`, () => {
      s().deleteDirection(target)
      const kept = ['a', 'b', 'c'].filter((x) => x !== target)
      expect(ids(cur())).toEqual(kept)

      const reloaded = roundTrip().projects[0]
      expect(ids(reloaded)).toEqual(kept)
      /* The survivors keep their words. The old repair replaced the array,
         so deleting one direction silently blanked the other two. */
      for (const k of kept)
        expect(reloaded.directions.find((d) => d.id === k).title).toBeTruthy()
    })
  }

  it('deleting all three survives a reload', () => {
    for (const id of ['a', 'b', 'c']) s().deleteDirection(id)
    expect(cur().directions).toEqual([])
    expect(roundTrip().projects[0].directions).toEqual([])
  })

  it('survives an import or cloud pull of the same workspace', () => {
    s().deleteDirection('b')
    const payload = JSON.parse(JSON.stringify(s().exportAllData()))
    expect(s().hydrateFromPayload(payload).ok).toBe(true)
    expect(ids(cur())).toEqual(['a', 'c'])
    expect(titles(cur())).toEqual(['a:Alpha', 'c:Gamma'])
  })

  it('survives repeated loads — nothing normalizes it back over time', () => {
    s().deleteDirection('c')
    let out = roundTrip()
    for (let i = 0; i < 3; i += 1) {
      useAppStore.setState({ projects: out.projects })
      out = roundTrip(8)
    }
    expect(ids(out.projects[0])).toEqual(['a', 'b'])
  })

  it('leaves the decision log alone', () => {
    /* The log records that a direction WAS chosen on a date. Deleting the card
       does not make that untrue, and a log edited to match the present is not
       a log. */
    s().updateDirection('b', { chosen: true })
    const before = cur().decisionLog.length
    expect(before).toBeGreaterThan(0)
    s().deleteDirection('b')
    expect(cur().decisionLog).toHaveLength(before)
  })

  it('is a no-op for a slot that is already empty', () => {
    s().deleteDirection('b')
    const after = cur().directions
    s().deleteDirection('b')
    expect(cur().directions).toBe(after)
  })
})

describe('a deleted direction only comes back when the designer writes one', () => {
  beforeEach(threeWritten)

  it('re-creates the record on the first keystroke, in its own position', () => {
    s().deleteDirection('a')
    expect(ids(cur())).toEqual(['b', 'c'])

    s().updateDirection('a', { title: 'Alpha again' })
    /* Written last, drawn first — position belongs to the slot, not to the
       order records happen to sit in the array. */
    expect(ids(cur())).toEqual(['a', 'b', 'c'])
    expect(dirOf('a').label).toBeUndefined()
    expect(orderedDirections(cur())[0].letter).toBe('A')
    expect(dirOf('a').title).toBe('Alpha again')
    expect(ids(roundTrip().projects[0])).toEqual(['a', 'b', 'c'])
  })

  it('rebuilds all three one at a time after deleting everything', () => {
    for (const id of ['a', 'b', 'c']) s().deleteDirection(id)
    s().updateDirection('c', { title: 'C first' })
    s().updateDirection('a', { title: 'A second' })
    expect(ids(cur())).toEqual(['a', 'c'])
    expect(titles(cur())).toEqual(['a:A second', 'c:C first'])
  })

  it('cannot be made to hold a fourth direction', () => {
    s().updateDirection('d', { title: 'Fourth' })
    expect(ids(cur())).toEqual(['a', 'b', 'c'])
    s().updateDirection('', { title: 'Nameless' })
    expect(ids(cur())).toEqual(['a', 'b', 'c'])
  })
})

describe('existing projects still load exactly as they did', () => {
  const migrate = (persisted, from = 6) =>
    useAppStore.persist.getOptions().migrate(persisted, from)

  it('keeps every value a full three-direction project had', () => {
    const dirs = [
      { id: 'a', label: 'A', title: 'Alpha', note: 'why a', chosen: true },
      { id: 'b', label: 'B', title: 'Beta', note: '', chosen: false },
      { id: 'c', label: 'C', title: '', note: '', chosen: false },
    ]
    const out = migrate({
      moodItems: [],
      projects: [{ id: 'p1', name: 'Old', directions: JSON.parse(JSON.stringify(dirs)) }],
    })
    /* v8 adds `refs` and nothing else. Every field the designer wrote comes
       through untouched — the assertion is on what was there, plus the one
       additive key, so a future migration that quietly drops a field fails
       here rather than in someone's project. */
    expect(out.projects[0].directions).toEqual(
      dirs.map((d) => ({ ...d, refs: {} }))
    )
  })

  it('seeds three only for a project that has no directions key at all', () => {
    const out = migrate({ moodItems: [], projects: [{ id: 'p1' }] })
    /* A new project starts with no routes at all now, so "the seed" is an
       empty list — three pre-drawn cards were a worksheet. */
    expect(out.projects[0].directions).toEqual([])
    expect(blankDirections()).toEqual([])
  })

  it('does not re-create intentionally deleted directions', () => {
    const out = migrate({
      moodItems: [],
      projects: [
        {
          id: 'p1',
          directions: [
            { id: 'a', label: 'A', title: 'Alpha', note: '', chosen: false },
          ],
        },
      ],
    })
    expect(out.projects[0].directions).toHaveLength(1)
    expect(out.projects[0].directions[0].title).toBe('Alpha')
    expect(out.projects[0].directions[0].recordId).toBeUndefined()
  })

  it('treats an empty array as a deletion, not as absence', () => {
    const out = migrate({
      moodItems: [],
      projects: [{ id: 'p1', directions: [] }],
    })
    expect(out.projects[0].directions).toEqual([])
  })

  it('mints a record for one slot without touching the others', () => {
    const d = blankDirection('b')
    expect(d.id).toBe('b')
    expect(d.title).toBe('')
    expect(d.note).toBe('')
    expect(d.chosen).toBe(false)
    expect(d.refs).toEqual({})
    expect(d.evidence).toEqual([])
    expect(typeof d.recordId).toBe('string')
    expect(d.recordId.length).toBeGreaterThan(0)
  })
})

describe('a direction recordId is durable and not the slot', () => {
  beforeEach(() => {
    s().clearToEmpty()
    s().createNewProject('Record id')
  })

  it('mints a recordId on add, and keeps the slot id', () => {
    expect(s().addDirection()).toBe('a')
    const d = dirOf('a')
    expect(d.id).toBe('a')
    expect(typeof d.recordId).toBe('string')
    expect(d.recordId).toMatch(/^dir_/)
  })

  it('preserves recordId across an update', () => {
    s().addDirection()
    const before = dirOf('a').recordId
    s().updateDirection('a', { title: 'Harbor', note: 'why', recordId: 'stolen' })
    expect(dirOf('a').id).toBe('a')
    expect(dirOf('a').recordId).toBe(before)
    expect(dirOf('a').title).toBe('Harbor')
  })

  it('does not reuse recordId when slot a is deleted and created again', () => {
    s().addDirection()
    const first = dirOf('a').recordId
    s().deleteDirection('a')
    expect(dirOf('a')).toBeNull()
    expect(s().addDirection()).toBe('a')
    expect(dirOf('a').id).toBe('a')
    expect(dirOf('a').recordId).toBeTruthy()
    expect(dirOf('a').recordId).not.toBe(first)
  })

  it('still caps at three slots', () => {
    expect(s().addDirection()).toBe('a')
    expect(s().addDirection()).toBe('b')
    expect(s().addDirection()).toBe('c')
    expect(s().addDirection()).toBe('')
    expect(ids(cur())).toEqual(['a', 'b', 'c'])
    const minted = new Set((cur().directions || []).map((d) => d.recordId))
    expect(minted.size).toBe(3)
  })

  it('leaves refs, evidence and the decision-log recordId alone', () => {
    s().addDirection()
    s().addLogoConcept('data:image/png;base64,AA')
    const conceptId = cur().logoConcepts[0].id
    s().captureDirectionFrom('a', 'mark', conceptId)
    s().toggleDirectionEvidence('a', 'evidence:1')
    s().updateDirection('a', { title: 'Chosen route', chosen: true })
    const recordId = dirOf('a').recordId
    const refs = dirOf('a').refs
    const evidence = dirOf('a').evidence
    expect(refs.mark).toMatch(/^markConcept:/)
    expect(evidence).toEqual(['evidence:1'])
    const log = cur().decisionLog.find((e) => e.kind === 'direction')
    expect(log.directionId).toBe(recordId)
    expect(dirOf('a').id).toBe('a')
    s().updateDirection('a', { note: 'refined' })
    expect(dirOf('a').recordId).toBe(recordId)
    expect(dirOf('a').refs).toEqual(refs)
    expect(cur().decisionLog.find((e) => e.kind === 'direction').directionId).toBe(
      recordId
    )
  })

  it('delete and recreate A does not rebind the old decision to the new route', () => {
    s().addDirection()
    const firstId = dirOf('a').recordId
    s().updateDirection('a', { title: 'First A', note: 'original', chosen: true })
    expect(cur().decisionLog[0].directionId).toBe(firstId)

    s().deleteDirection('a')
    expect(s().addDirection()).toBe('a')
    const secondId = dirOf('a').recordId
    expect(secondId).not.toBe(firstId)
    expect(dirOf('a').id).toBe('a')

    s().updateDirection('a', { title: 'Second A', note: 'fresh', chosen: true })
    const ids = cur().decisionLog
      .filter((e) => e.kind === 'direction')
      .map((e) => e.directionId)
    expect(ids).toContain(firstId)
    expect(ids).toContain(secondId)
    expect(ids.filter((id) => id === firstId)).toHaveLength(1)
    expect(cur().decisionLog.find((e) => e.directionId === firstId).title).toBe(
      'First A'
    )
    expect(cur().decisionLog.find((e) => e.directionId === secondId).title).toBe(
      'Second A'
    )
  })

  it('a stored slot-id decision stays a slot-id and does not bind the new A', () => {
    s().addDirection()
    useAppStore.setState({
      projects: [
        {
          ...cur(),
          decisionLog: [
            {
              kind: 'direction',
              directionId: 'a',
              title: 'Legacy A',
              why: 'old',
              at: 1,
            },
          ],
        },
      ],
    })
    expect(cur().decisionLog[0].directionId).toBe('a')
    s().updateDirection('a', { title: 'New A', note: 'now', chosen: true })
    expect(cur().decisionLog.find((e) => e.directionId === 'a').title).toBe(
      'Legacy A'
    )
    expect(
      cur().decisionLog.find((e) => e.directionId === dirOf('a').recordId).title
    ).toBe('New A')
  })

  it('does not invent a recordId on a persisted direction that never had one', () => {
    const project = cur()
    useAppStore.setState({
      projects: [
        {
          ...project,
          directions: [{ id: 'a', title: 'Legacy', note: '', chosen: false }],
        },
      ],
    })
    s().updateDirection('a', { note: 'still the same route' })
    expect(dirOf('a').id).toBe('a')
    expect(dirOf('a').title).toBe('Legacy')
    expect(dirOf('a').note).toBe('still the same route')
    expect(dirOf('a').recordId).toBeUndefined()
  })
})

describe('Ideate completion does not regress', () => {
  beforeEach(threeWritten)

  it('still counts a titled direction as work done on the stop', () => {
    expect(pathStepMeetsCondition('ideate', { project: cur() })).toBe(true)
  })

  it('stops counting once the last titled direction is deleted', () => {
    /* Additive honesty, not a punishment: the stop reports what is there. The
       latch in `pathStepHasContent` is what keeps the tick from vanishing. */
    for (const id of ['a', 'b', 'c']) s().deleteDirection(id)
    expect(pathStepMeetsCondition('ideate', { project: cur() })).toBe(false)
  })

  it('keeps counting while any titled direction survives', () => {
    s().deleteDirection('a')
    s().deleteDirection('b')
    expect(pathStepMeetsCondition('ideate', { project: cur() })).toBe(true)
  })
})
