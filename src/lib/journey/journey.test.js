import { describe, expect, it } from 'vitest'
import { APPROVAL_CAPABLE_STEP_IDS } from '../client/reviewArtifact'
import {
  JOURNEY_STEPS,
  PATH_VIEWS,
  PORTAL_PUSHABLE_STEP_IDS,
  journeyIdForView,
  getNextJourney,
  labelForView,
  portalPushableSteps,
  toolsLabelForView,
  isToolsMenuView,
} from './journey'

/**
 * Directions and Brand book joined the path on 2026-08-09 (owner). Neither is
 * a new screen — `spark` and `book` already existed and were reachable only
 * from the Tools overlay, the builder from a single call site in the whole
 * app. This file asserted the five-stop arrangement they were excluded from,
 * so every expectation here moved with the declaration.
 *
 * Two things it now pins that it did not before, because they are the parts a
 * future change could break silently:
 *   - `ideate` KEEPS ITS ID while gaining the label "Directions". Saved
 *     projects carry `pathDone.ideate`, and the SQL allowlist names it.
 *   - `book` is a path stop but NOT client-pushable, because the RPC in
 *     20260728021200 would reject it and the client would be told their link
 *     is invalid.
 */
describe('JOURNEY_STEPS — the seven-stop path', () => {
  it('has seven path steps in view order', () => {
    expect(JOURNEY_STEPS).toHaveLength(7)
    expect(PATH_VIEWS).toEqual([
      'project',
      'studio',
      'spark',
      'brand',
      'flow',
      'book',
      'finish',
    ])
  })

  it('orders Brief → Research → Directions → Identity → Touchpoints → Brand book → Delivery', () => {
    expect(JOURNEY_STEPS.map((s) => s.label)).toEqual([
      'Brief',
      'Research',
      'Directions',
      'Identity',
      'Touchpoints',
      'Brand book',
      'Delivery',
    ])
  })

  it('keeps the stored ids even where the label moved away from them', () => {
    /* Renaming an id orphans `pathDone`/`pathReached` on every saved project,
       the `decisions.stage` values in 20260805140000, and the SQL allowlist.
       Brief is still `define`, Delivery is still `deliver`, Directions is
       still `ideate`. */
    expect(JOURNEY_STEPS.map((s) => s.id)).toEqual([
      'define',
      'research',
      'ideate',
      'design',
      'sketch',
      'book',
      'deliver',
    ])
  })

  it('numbers the stops by their position in the declaration', () => {
    expect(JOURNEY_STEPS.map((s) => s.num)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ])
  })

  it('carries a process phase name per stop', () => {
    expect(JOURNEY_STEPS.map((s) => s.process)).toEqual([
      'Clarifying strategy',
      'Conducting research',
      'Exploring directions',
      'Designing identity',
      'Creating touchpoints',
      'Documenting the system',
      'Delivering the brand',
    ])
  })

  it('chains nextView through every stop and stops at the end', () => {
    let v = 'project'
    const views = [v]
    for (let i = 0; i < 20; i += 1) {
      const next = getNextJourney(v)
      if (!next) break
      v = next.view
      views.push(v)
    }
    expect(views).toEqual(PATH_VIEWS)
  })

  it('maps every path view to its id, and leaves Review off-path', () => {
    expect(journeyIdForView('project')).toBe('define')
    expect(journeyIdForView('studio')).toBe('research')
    expect(journeyIdForView('spark')).toBe('ideate')
    expect(journeyIdForView('brand')).toBe('design')
    expect(journeyIdForView('flow')).toBe('sketch')
    expect(journeyIdForView('book')).toBe('book')
    expect(journeyIdForView('finish')).toBe('deliver')
    expect(journeyIdForView('review')).toBe(null)
  })

  it('names the promoted views from the path, not from the Tools fallback', () => {
    /* Both used to answer through `toolsLabelForView`. If a case for either
       is ever re-added there it becomes a second name for a declared label,
       so this pins where the answer comes from. */
    expect(labelForView('spark')).toBe('Directions')
    expect(labelForView('book')).toBe('Brand book')
    expect(toolsLabelForView('spark')).toBe('Tools')
    expect(toolsLabelForView('book')).toBe('Tools')
  })

  it('no longer treats the two promoted views as Tools', () => {
    expect(isToolsMenuView('spark')).toBe(false)
    expect(isToolsMenuView('book')).toBe(false)
    expect(isToolsMenuView('review')).toBe(true)
    expect(isToolsMenuView('assets')).toBe(true)
    expect(isToolsMenuView('home')).toBe(false)
    expect(isToolsMenuView('project')).toBe(false)
  })

  /**
   * R4, owner decision 2026-08-12. The pushable set is now exactly the stops
   * whose artifact the portal can SHOW, and the rule that decides it lives in
   * `APPROVAL_UNITS` rather than being restated here.
   *
   * This used to list five. The other four were pushable with nothing behind
   * them but their own label — the client pressed Approve next to the word
   * "Research" — which is what DESIGN_GRAMMAR G10.5 forbids and what this
   * assertion previously described as correct. Shrinking the set IS the fix.
   */
  it('lets a stop be pushed only when its artifact can be shown', () => {
    expect(PORTAL_PUSHABLE_STEP_IDS).toEqual(['design'])
    expect(portalPushableSteps().map((s) => s.id)).toEqual([
      ...PORTAL_PUSHABLE_STEP_IDS,
    ])
    /* Derived from the approval units, never restated — adding a unit with a
       real artifact makes its stop pushable with no edit here. */
    expect([...PORTAL_PUSHABLE_STEP_IDS]).toEqual([...APPROVAL_CAPABLE_STEP_IDS])
  })

  /* The four that lost approval capability, named so that restoring one is a
     decision someone makes rather than a line that drifts back. Each needs an
     artifact built first — see the reasons in `APPROVAL_UNITS`. */
  it('names the stops that lost approval capability and why they cannot show', () => {
    for (const id of ['research', 'sketch', 'deliver', 'define', 'ideate', 'book']) {
      expect(PORTAL_PUSHABLE_STEP_IDS).not.toContain(id)
    }
  })

  it('keeps the pushable set a subset of the declared path', () => {
    const declared = new Set(JOURNEY_STEPS.map((s) => s.id))
    for (const id of PORTAL_PUSHABLE_STEP_IDS) expect(declared.has(id)).toBe(true)
  })
})
