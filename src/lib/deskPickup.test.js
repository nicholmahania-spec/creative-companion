import { describe, it, expect } from 'vitest'
import { deskPickup } from '../views/DeskView.jsx'

describe('deskPickup — one initiation path on What’s next', () => {
  it('hides resume when lastView matches the path gap', () => {
    expect(deskPickup({ lastView: 'brand', gapView: 'brand' })).toEqual({
      showResume: false,
      resumePrimary: false,
    })
  })

  it('shows secondary resume when lastView differs from the gap', () => {
    expect(deskPickup({ lastView: 'studio', gapView: 'brand' })).toEqual({
      showResume: true,
      resumePrimary: false,
    })
  })

  it('makes resume primary when the path has no gap', () => {
    expect(deskPickup({ lastView: 'finish', gapView: null })).toEqual({
      showResume: true,
      resumePrimary: true,
    })
  })

  it('hides resume for desk or empty lastView', () => {
    expect(deskPickup({ lastView: 'desk', gapView: 'project' }).showResume).toBe(
      false
    )
    expect(deskPickup({ lastView: null, gapView: 'project' }).showResume).toBe(
      false
    )
    expect(deskPickup({ lastView: '', gapView: 'project' }).showResume).toBe(
      false
    )
  })
})
