import { describe, it, expect } from 'vitest'
import { lazyViews, RESTORABLE_VIEWS } from './viewRegistry'

/**
 * A reload must not lose your place.
 *
 * Two hand-maintained copies of "views you may be restored to" had drifted
 * from the registry — one in App.jsx, one in lib/helper/sessionResume.js —
 * and Desk, Clients, Asset library and New project were missing from BOTH.
 * Refreshing on any of them silently returned you to Home, and mid-intake it
 * discarded a part-filled form with it.
 *
 * These assertions derive from `lazyViews` on purpose. A test that restated
 * the expected ids would be a third copy of the same list, free to drift the
 * same way, and would have passed throughout the period the bug existed.
 */
describe('restorable views', () => {
  it('covers every registered view except the ones that cannot stand alone', () => {
    const registered = Object.keys(lazyViews)
    const missing = registered.filter(
      (id) => id !== 'clientRecord' && !RESTORABLE_VIEWS.includes(id)
    )
    expect(
      missing,
      `these views are registered but a reload cannot return to them: ${missing.join(', ')}`
    ).toEqual([])
  })

  it('never lists a view the registry cannot render', () => {
    const unknown = RESTORABLE_VIEWS.filter((id) => !lazyViews[id])
    expect(unknown, `not in lazyViews: ${unknown.join(', ')}`).toEqual([])
  })

  /**
   * clientRecord renders one specific client. Restoring it without knowing
   * which one lands on an empty screen with no way back, so Clients (the
   * list) is the correct return point — and it must be restorable itself.
   */
  it('excludes clientRecord but keeps the list it belongs to', () => {
    expect(RESTORABLE_VIEWS).not.toContain('clientRecord')
    expect(RESTORABLE_VIEWS).toContain('clients')
  })

  it('includes the four that regressed', () => {
    for (const id of ['desk', 'clients', 'assets', 'create']) {
      expect(RESTORABLE_VIEWS, `${id} must survive a reload`).toContain(id)
    }
  })
})
