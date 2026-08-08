import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore from '../../store/useAppStore'
import {
  favoritePins, favoritePinsOfType, favoriteCounts, isFavorite,
  isSharedWithClient, evidenceRef,
} from './favorites'
import { resolveEvidenceRef } from '../artifacts/artifactRef'

/**
 * Liking something and showing it to a client are two different acts.
 *
 * `inPack` meant both. It is capped at six, ordered, and read by the pack
 * export and four other consumers — so a designer who wanted to keep a seventh
 * reference had to decide which one the client would not see, and there was no
 * way to keep a reference privately at all.
 */

const fresh = () => {
  useAppStore.getState().clearToEmpty()
  return useAppStore.getState().createNewProject('Favorites test')
}
const state = () => useAppStore.getState()
const pins = () => state().moodItems
const byNote = (n) => pins().find((m) => m.note === n)

describe('the two flags are independent', () => {
  beforeEach(() => {
    fresh()
    state().addMoodPin({ id: 1, note: 'liked', type: 'image', visual: 'x' })
    state().addMoodPin({ id: 2, note: 'shown', type: 'image', visual: 'y' })
  })

  it('favorite does not imply sharedWithClient', () => {
    state().toggleFavorite(1)
    expect(isFavorite(byNote('liked'))).toBe(true)
    expect(isSharedWithClient(byNote('liked'))).toBe(false)
  })

  it('sharedWithClient does not imply favorite', () => {
    state().toggleMoodPinInPack(2)
    expect(isSharedWithClient(byNote('shown'))).toBe(true)
    expect(isFavorite(byNote('shown'))).toBe(false)
  })

  it('both can be true, and each turns off alone', () => {
    state().toggleFavorite(1)
    state().toggleMoodPinInPack(1)
    expect(favoriteCounts(pins(), state().currentProjectId).both).toBe(1)
    state().toggleMoodPinInPack(1)
    expect(isFavorite(byNote('liked'))).toBe(true)
    expect(isSharedWithClient(byNote('liked'))).toBe(false)
  })

  it('takes an explicit value as well as a toggle', () => {
    state().toggleFavorite(1, true)
    state().toggleFavorite(1, true)
    expect(isFavorite(byNote('liked'))).toBe(true)
    state().toggleFavorite(1, false)
    expect(isFavorite(byNote('liked'))).toBe(false)
  })
})

describe('favorites are not capped', () => {
  it('keeps more than the pack’s six', () => {
    // The cap is a property of the client's shortlist, not of liking things.
    fresh()
    for (let i = 1; i <= 9; i += 1)
      state().addMoodPin({ id: i, note: `p${i}`, type: 'image', visual: 'v' })
    for (let i = 1; i <= 9; i += 1) state().toggleFavorite(i)
    expect(favoritePins(pins(), state().currentProjectId)).toHaveLength(9)
  })
})

describe('later stages reference, never copy', () => {
  it('a favorite resolves back to the one live pin', () => {
    fresh()
    state().addMoodPin({ id: 5, note: 'ref me', type: 'image', visual: 'data-x' })
    state().toggleFavorite(5)
    const [fav] = favoritePins(pins(), state().currentProjectId)
    const ref = evidenceRef(fav)
    expect(ref).toEqual({ kind: 'evidence', id: '5' })
    expect(resolveEvidenceRef(pins(), ref).visual).toBe('data-x')
  })

  it('editing the pin changes what the reference reads — no stale copy', () => {
    fresh()
    state().addMoodPin({ id: 6, note: 'before', type: 'image', visual: 'v' })
    state().toggleFavorite(6)
    const ref = evidenceRef(byNote('before'))
    state().updateMoodPinNote(6, 'after')
    expect(resolveEvidenceRef(pins(), ref).note).toBe('after')
  })

  it('narrows by pin type for the stage that wants it', () => {
    fresh()
    state().addMoodPin({ id: 7, note: 'img', type: 'image', visual: 'v' })
    state().addMoodPin({ id: 8, note: 'txt', type: 'note' })
    state().toggleFavorite(7)
    state().toggleFavorite(8)
    const pid = state().currentProjectId
    expect(favoritePinsOfType(pins(), pid, 'image')).toHaveLength(1)
    expect(favoritePinsOfType(pins(), pid, 'note')).toHaveLength(1)
  })
})

describe('the pack keeps every guarantee it had', () => {
  it('still refuses a seventh, and favoriting does not sneak past it', () => {
    fresh()
    for (let i = 1; i <= 7; i += 1) {
      state().addMoodPin({ id: i, note: `p${i}`, type: 'image', visual: 'v' })
      state().toggleFavorite(i)
    }
    let refused = 0
    for (let i = 1; i <= 7; i += 1) {
      if (!state().toggleMoodPinInPack(i).ok) refused += 1
    }
    expect(refused).toBe(1)
    expect(pins().filter(isSharedWithClient)).toHaveLength(6)
    expect(pins().filter(isFavorite)).toHaveLength(7)
  })
})
