import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  APPROVAL_CAPABLE_STEP_IDS,
  REVIEW_UNITS,
  REVIEW_UNIT_STEP_IDS,
  collectsFor,
  isApprovalCapable,
  isReviewUnit,
} from './reviewArtifact'
import { PORTAL_PUSHABLE_STEP_IDS } from '../journey/journey'

/**
 * TWO UNITS, AND THE DIFFERENCE BETWEEN THEM IS LOAD-BEARING.
 *
 * The single decision Phase 6 rests on is that a presentation of options and a
 * settled identity are different product moments, so they collect different
 * things. Collapse them and one of two bad screens follows: either the client
 * is asked to approve a shortlist, which is not a thing a person can
 * meaningfully do, or the identity loses its approval and the project has no
 * record of a yes.
 *
 * `docs/PRD.md` §4.8 names both in one sentence — "three logo concepts, a
 * design, a final pack" — and PRODUCT.md §07 puts them in order:
 * Design → Review → Revision → Approval.
 */

const ROOT = new URL('../../..', import.meta.url).pathname
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8')

describe('the review units', () => {
  it('are exactly the two the portal can show', () => {
    expect(REVIEW_UNIT_STEP_IDS).toEqual(['ideate', 'design'])
    expect(isReviewUnit('ideate')).toBe(true)
    expect(isReviewUnit('design')).toBe(true)
  })

  /* The five that still have nothing showable behind them. Each is named so
     that adding one back is a decision someone makes, with an artifact built
     first, rather than a line that drifts. */
  it('leave the stops with nothing to show out', () => {
    for (const id of ['define', 'research', 'sketch', 'review', 'deliver', 'book']) {
      expect(isReviewUnit(id), `${id} has no artifact to show`).toBe(false)
      expect(isApprovalCapable(id)).toBe(false)
    }
  })

  /* THE SPLIT. Showable is the wider set; approvable is the narrower one
     inside it. */
  it('collect different things, and only one of them collects a yes', () => {
    expect(collectsFor('ideate')).toBe('feedback')
    expect(collectsFor('design')).toBe('approval')
    expect(collectsFor('book')).toBe('')

    expect(APPROVAL_CAPABLE_STEP_IDS).toEqual(['design'])
    expect(isApprovalCapable('ideate'), 'a shortlist is not a thing to approve').toBe(
      false
    )
  })

  /* Derived, never restated. The failure this prevents is a stop that the
     portal offers and the artifact layer cannot build, or the reverse — a unit
     with a real artifact that no studio can reach. */
  it('are the same list the portal offers', () => {
    expect([...PORTAL_PUSHABLE_STEP_IDS]).toEqual([...REVIEW_UNIT_STEP_IDS])
    const journey = read('src/lib/journey/journey.js')
    expect(journey).toMatch(/REVIEW_UNIT_STEP_IDS/)
    expect(
      journey,
      'deriving the pushable set from the narrower list hides the presentation'
    ).not.toMatch(/filter\(\(id\) => !APPROVAL_CAPABLE_STEP_IDS/)
  })

  /* Names the client reads, never the stage name — DESIGN_GRAMMAR G10.5. */
  it('name what the client is looking at', () => {
    expect(REVIEW_UNITS.design.noun).toBe('the identity')
    expect(REVIEW_UNITS.ideate.noun).toBe('the directions')
    for (const unit of Object.values(REVIEW_UNITS)) {
      expect(unit.noun).not.toMatch(/\bstage\b|\bstep\b/i)
      expect(unit.shows.length).toBeGreaterThan(0)
    }
  })

  it('are frozen, so a caller cannot add a unit at runtime', () => {
    expect(Object.isFrozen(REVIEW_UNITS)).toBe(true)
    expect(Object.isFrozen(REVIEW_UNITS.ideate)).toBe(true)
  })
})

describe('the portal offers approval only where a unit collects one', () => {
  const portal = read('src/features/client-portal/PublicClientPortal.jsx')

  it('decides the buttons from the unit, not from the step id', () => {
    expect(portal).toMatch(/const collects = collectsFor\(step\.id\)/)
    expect(portal).toMatch(/const canApprove = collects === 'approval'/)
  })

  /* The Approve button exists exactly once and is inside the guard. A second
     one outside it would put a yes on the presentation. */
  it('renders one Approve control, behind that guard', () => {
    const approves = portal.match(/respondStep\(step\.id, 'approved'\)/g) || []
    expect(approves).toHaveLength(1)
    expect(portal).toMatch(/\{canApprove \? \([\s\S]*?respondStep\(step\.id, 'approved'\)/)
  })

  /* The client-side guard is the courtesy; the database is the rule. Both, on
     purpose — the RPC is reachable by anyone holding the link. */
  it('is backed by a refusal in the database', () => {
    const sql = read('supabase/migrations/20260819120000_review_rounds.sql')
    expect(sql).toMatch(
      /unit_name\s*=\s*'ideate'\s+and\s+status_in\s*=\s*'approved'\s*then\s*return\s+jsonb_build_object\(\s*'ok',\s*false/i
    )
  })
})
