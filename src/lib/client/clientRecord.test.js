import { describe, expect, it } from 'vitest'
import {
  addPreference,
  blankClientRecord,
  clientKey,
  clientRecordFor,
  forgetClientRecord,
  hasClientRecord,
  MAX_PREFERENCES,
  removePreference,
  renameClientRecord,
  setClientNotes,
} from './clientRecord.js'
import { buildClientGroups } from './clientDirectory.js'

describe('clientKey agrees with how the directory already groups', () => {
  it('matches buildClientGroups on case and spacing', () => {
    /* The directory groups on `name.toLowerCase()`. If these two disagreed,
       a client could appear as one card with two separate memories, which is
       worse than having no memory at all. */
    const projects = [
      { id: 1, detective: { clientName: "Sparrow's Promise" } },
      { id: 2, detective: { clientName: "sparrow's promise" } },
      { id: 3, detective: { clientName: "Sparrow's  Promise " } },
    ]
    const groups = buildClientGroups(projects)
    expect(groups).toHaveLength(1)
    const keys = new Set(projects.map((p) => clientKey(p.detective.clientName)))
    expect(keys.size).toBe(1)
  })

  it('is empty for a client with no name, so nothing is written under ""', () => {
    expect(clientKey('')).toBe('')
    expect(clientKey('   ')).toBe('')
    expect(setClientNotes({}, '', 'orphan')).toEqual({})
    expect(addPreference({}, '  ', 'orphan')).toEqual({})
  })
})

describe('reading a record', () => {
  it('returns a usable shape for a client with nothing recorded', () => {
    /* Empty is the ordinary state, not a miss. A caller that had to null-check
       would end up rendering "no record" against most clients. */
    expect(clientRecordFor({}, 'Nobody')).toEqual(blankClientRecord())
    expect(clientRecordFor(undefined, 'Nobody').preferences).toEqual([])
  })

  it('knows the difference between empty and written', () => {
    expect(hasClientRecord({}, 'Oak')).toBe(false)
    expect(hasClientRecord(setClientNotes({}, 'Oak', '   '), 'Oak')).toBe(false)
    expect(hasClientRecord(setClientNotes({}, 'Oak', 'Prefers email'), 'Oak')).toBe(true)
  })
})

describe('preferences are lines, not a taxonomy', () => {
  it('adds, dedupes case-insensitively, and drops blanks', () => {
    let r = addPreference({}, 'Oak', 'Prefers email')
    r = addPreference(r, 'Oak', 'prefers EMAIL')
    r = addPreference(r, 'Oak', '   ')
    expect(clientRecordFor(r, 'Oak').preferences).toEqual(['Prefers email'])
  })

  it('caps rather than growing without limit', () => {
    let r = {}
    for (let i = 0; i < MAX_PREFERENCES + 5; i++) {
      r = addPreference(r, 'Oak', `line ${i}`)
    }
    const kept = clientRecordFor(r, 'Oak').preferences
    expect(kept).toHaveLength(MAX_PREFERENCES)
    /* Keeps the most recent — the oldest line is the one most likely to be
       stale about a living relationship. */
    expect(kept.at(-1)).toBe(`line ${MAX_PREFERENCES + 4}`)
  })

  it('removes one without disturbing the rest', () => {
    let r = addPreference({}, 'Oak', 'a')
    r = addPreference(r, 'Oak', 'b')
    r = removePreference(r, 'Oak', 'a')
    expect(clientRecordFor(r, 'Oak').preferences).toEqual(['b'])
  })

  it('returns the same object when nothing changed, so callers can bail', () => {
    const r = addPreference({}, 'Oak', 'a')
    expect(removePreference(r, 'Oak', 'missing')).toBe(r)
    expect(addPreference(r, 'Oak', 'a')).toBe(r)
  })
})

describe('a rename carries the memory with it', () => {
  /* This is the whole cost of keying on a name, and the reason this function
     exists. Fixing a typo in a client's name must not silently empty the one
     feature whose promise is that you do not have to remember. */
  it('moves notes and preferences to the new name', () => {
    let r = setClientNotes({}, 'Sparow', 'Decision maker: Sarah')
    r = addPreference(r, 'Sparow', 'Prefers email')
    r = renameClientRecord(r, 'Sparow', "Sparrow's Promise")

    expect(clientRecordFor(r, 'Sparow')).toEqual(blankClientRecord())
    const moved = clientRecordFor(r, "Sparrow's Promise")
    expect(moved.notes).toBe('Decision maker: Sarah')
    expect(moved.preferences).toEqual(['Prefers email'])
  })

  it('merges instead of overwriting when the destination already exists', () => {
    /* A rename can be a MERGE — two spellings turning out to be one client.
       Overwriting would destroy whichever side was typed second. */
    let r = setClientNotes({}, 'Oak', 'knows the printer')
    r = addPreference(r, 'Oak', 'likes warm colours')
    r = setClientNotes(r, 'Oak & Pine', 'signs off quickly')
    r = addPreference(r, 'Oak & Pine', 'prefers email')
    r = renameClientRecord(r, 'Oak', 'Oak & Pine')

    const merged = clientRecordFor(r, 'Oak & Pine')
    expect(merged.notes).toContain('signs off quickly')
    expect(merged.notes).toContain('knows the printer')
    expect(merged.preferences).toEqual(['prefers email', 'likes warm colours'])
    expect(r.oak).toBeUndefined()
  })

  it('does nothing when there is nothing to move, or the key is unchanged', () => {
    const r = setClientNotes({}, 'Oak', 'x')
    expect(renameClientRecord(r, 'Nobody', 'Someone')).toBe(r)
    expect(renameClientRecord(r, 'Oak', 'OAK')).toBe(r)
    expect(renameClientRecord(r, 'Oak', '')).toBe(r)
  })
})

describe('forgetting is separate from deleting a project', () => {
  it('drops the record only when asked', () => {
    const r = setClientNotes({}, 'Oak', 'x')
    expect(hasClientRecord(forgetClientRecord(r, 'Oak'), 'Oak')).toBe(false)
    expect(forgetClientRecord(r, 'Nobody')).toBe(r)
  })
})
