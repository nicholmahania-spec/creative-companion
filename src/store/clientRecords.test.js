import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore from './useAppStore'
import { PERSISTED_KEYS, pickPersisted } from './useAppStore'
import { clientRecordFor } from '../lib/client/clientRecord'

/**
 * The store side of client memory. The pure functions are covered in
 * `lib/client/clientRecord.test.js`; what is asserted here is the wiring that
 * cannot be tested there — that a rename typed into the brief moves the
 * record, and that the record survives a backup round trip.
 */

const reset = () => {
  const s = useAppStore.getState()
  s.hydrateFromPayload({
    projects: [
      {
        id: 'p1',
        name: 'Identity',
        detective: { clientName: "Sparrow's Promise" },
      },
    ],
    tasks: [],
    currentProjectId: 'p1',
  })
}

beforeEach(reset)

describe('client memory follows the client', () => {
  it('moves the record when the client name is corrected in the brief', () => {
    const s = () => useAppStore.getState()
    s().setClientNotes("Sparrow's Promise", 'Decision maker: Sarah')
    s().addClientPreference("Sparrow's Promise", 'Prefers email')

    /* A typo fix, typed. updateDetective fires per keystroke, so this also
       exercises the no-op path for every intermediate value. */
    s().updateDetective('clientName', 'Sparrows Promise')

    const moved = clientRecordFor(s().clientRecords, 'Sparrows Promise')
    expect(moved.notes).toBe('Decision maker: Sarah')
    expect(moved.preferences).toEqual(['Prefers email'])
    expect(clientRecordFor(s().clientRecords, "Sparrow's Promise").notes).toBe('')
  })

  it('does not churn the record when the name has not really changed', () => {
    const s = () => useAppStore.getState()
    s().setClientNotes("Sparrow's Promise", 'keep me')
    const before = s().clientRecords
    /* Same key — only case and spacing differ. */
    s().updateDetective('clientName', "  sparrow's   promise ")
    expect(s().clientRecords).toBe(before)
    expect(clientRecordFor(s().clientRecords, "SPARROW'S PROMISE").notes).toBe(
      'keep me'
    )
  })

  it('survives a backup round trip, which is what the key list is for', () => {
    const s = () => useAppStore.getState()
    s().setClientNotes("Sparrow's Promise", 'knows the printer')

    expect(PERSISTED_KEYS).toContain('clientRecords')
    expect(pickPersisted(s()).clientRecords).toBeTruthy()

    const payload = s().exportAllData()
    expect(payload.clientRecords).toBeTruthy()

    /* Wipe, then restore from the payload. Before `clientRecords` was added
       to the payload this returned an empty object and the notes were gone —
       caught by workspaceRoundTrip.test.js while writing this. */
    s().setClientNotes("Sparrow's Promise", '')
    s().hydrateFromPayload(payload)
    expect(clientRecordFor(s().clientRecords, "Sparrow's Promise").notes).toBe(
      'knows the printer'
    )
  })

  it('keeps local records when an older payload has no client memory at all', () => {
    /* Absent must mean "keep what we have", not "the user deleted them" —
       the same rule the templates/portalSeen restore follows. */
    const s = () => useAppStore.getState()
    s().setClientNotes("Sparrow's Promise", 'local only')
    const payload = s().exportAllData()
    delete payload.clientRecords
    s().hydrateFromPayload(payload)
    expect(clientRecordFor(s().clientRecords, "Sparrow's Promise").notes).toBe(
      'local only'
    )
  })
})
