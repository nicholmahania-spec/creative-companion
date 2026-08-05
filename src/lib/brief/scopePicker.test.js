import { describe, it, expect } from 'vitest'
import {
  DELIVERABLE_OPTIONS,
  isLogoOnlyScope,
  progressItemInScope,
} from './detectiveBrief.js'

/**
 * The scope picker's meaning, pinned.
 *
 * An empty list means "the full brand package". The first tick flips that to
 * "only what is ticked", and a cold-start tester lost an entire identity job
 * to it: they ticked three items from QUOTED SEPARATELY meaning to ADD them,
 * and the scope silently became three deliverables with no logo, colour or
 * type. The rule below is what the intake now applies.
 */
const CORE = DELIVERABLE_OPTIONS.filter((o) => !o.extra).map((o) => o.id)
const EXTRAS = DELIVERABLE_OPTIONS.filter((o) => o.extra).map((o) => o.id)

/** Mirrors NewProjectIntake.togglePick — kept here so the RULE is testable
 *  without mounting a view, and so a change to one is visible against the
 *  other. */
function togglePick(picked, id) {
  if (picked.includes(id)) return picked.filter((x) => x !== id)
  const isExtra = !!DELIVERABLE_OPTIONS.find((o) => o.id === id)?.extra
  if (picked.length === 0 && isExtra) return [...CORE, id]
  return [...picked, id]
}

describe('ticking an extra adds to the package, never replaces it', () => {
  it('the exact trap: three extras must not drop the core package', () => {
    let picked = []
    for (const id of ['packaging', 'signage', 'printCollateral']) {
      picked = togglePick(picked, id)
    }
    // the job still includes the things a brand identity is made of
    expect(picked).toContain('logoPrimary')
    expect(picked).toContain('colourPalette')
    expect(picked).toContain('typography')
    // and the extras the designer actually asked for
    expect(picked).toContain('packaging')
    expect(picked).toContain('signage')
    expect(picked).toContain('printCollateral')
  })

  it('a job with extras is not mistaken for a logo-only job', () => {
    const picked = togglePick([], 'packaging')
    expect(isLogoOnlyScope(picked)).toBe(false)
  })

  it('core work stays in scope after ticking one extra', () => {
    const picked = togglePick([], 'signage')
    for (const item of ['colour', 'type', 'logo']) {
      expect(progressItemInScope(item, picked), item).toBe(true)
    }
  })
})

describe('narrowing on purpose still narrows', () => {
  it('ticking an included item first means only that', () => {
    // A genuine logo-only job must still be expressible in one tick.
    const picked = togglePick([], 'logoPrimary')
    expect(picked).toEqual(['logoPrimary'])
    expect(isLogoOnlyScope(picked)).toBe(true)
  })

  it('an extra ticked AFTER a narrow pick does not re-widen it', () => {
    let picked = togglePick([], 'logoPrimary')
    picked = togglePick(picked, 'packaging')
    expect(picked).toEqual(['logoPrimary', 'packaging'])
    expect(picked).not.toContain('typography')
  })

  it('unticking still removes, including from a materialised core', () => {
    let picked = togglePick([], 'packaging')
    picked = togglePick(picked, 'businessCard')
    expect(picked).not.toContain('businessCard')
    expect(picked).toContain('packaging')
  })
})

describe('an untouched brief is unchanged', () => {
  it('empty still means the whole package', () => {
    // Every project made before this behaves exactly as it did.
    expect(progressItemInScope('colour', [])).toBe(true)
    expect(isLogoOnlyScope([])).toBe(false)
  })
})
