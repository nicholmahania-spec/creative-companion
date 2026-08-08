import { describe, expect, it, beforeEach } from 'vitest'
import useAppStore, {
  DIRECTION_SLOTS,
  blankDirection,
  blankDirections,
  directionSlots,
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
    expect(DIRECTION_SLOTS.map((sl) => sl.label)).toEqual(['A', 'B', 'C'])
    expect(isDirectionSlot('a')).toBe(true)
    expect(isDirectionSlot('B')).toBe(true)
    expect(isDirectionSlot('d')).toBe(false)
    expect(isDirectionSlot('')).toBe(false)
  })

  it('reports an empty slot as empty rather than inventing a record', () => {
    threeWritten()
    s().deleteDirection('b')
    const rows = directionSlots(cur())
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(rows[1].direction).toBeNull()
    expect(rows[0].direction.title).toBe('Alpha')
    expect(rows[2].direction.title).toBe('Gamma')
  })

  it('reports three empty slots for a project with no directions at all', () => {
    threeWritten()
    for (const id of ['a', 'b', 'c']) s().deleteDirection(id)
    expect(directionSlots(cur()).every((r) => r.direction === null)).toBe(true)
    expect(directionSlots({}).map((r) => r.label)).toEqual(['A', 'B', 'C'])
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
    expect(cur().directions[0].label).toBe('A')
    expect(cur().directions[0].title).toBe('Alpha again')
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
    expect(out.projects[0].directions).toEqual(blankDirections())
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
  })

  it('treats an empty array as a deletion, not as absence', () => {
    const out = migrate({
      moodItems: [],
      projects: [{ id: 'p1', directions: [] }],
    })
    expect(out.projects[0].directions).toEqual([])
  })

  it('mints a record for one slot without touching the others', () => {
    expect(blankDirection('b')).toEqual({
      id: 'b',
      label: 'B',
      title: '',
      note: '',
      chosen: false,
      refs: {},
    })
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
