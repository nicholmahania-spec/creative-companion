/**
 * Project terms go into a contract. The tests that matter most are about what
 * must never end up on the clipboard.
 */
import { describe, it, expect } from 'vitest'
import { projectTermsText, hasProjectTerms } from './projectTerms'

const full = {
  deadline: '2026-09-01',
  scopeRevisionsIncluded: 2,
  scopeRevisionBilling: 'perRound',
  scopeRevisionRate: 150,
  scopeApprover: 'Sarah Whitton',
  scopeOutOf: 'No website build, no copywriting.',
  hourlyRate: 95,
  detective: {
    projectDeadline: '2026-09-01',
    deliverablesPicked: ['logoPrimary', 'colourPalette'],
    deliverables: 'A shop sign',
    technical: 'SVG, PNG, and print-ready PDF',
    budgetRange: '£3,000–5,000',
    milestones: [
      { id: 'm1', label: 'First concepts', date: '2026-08-01' },
      { id: 'm2', label: 'Sign-off', date: '' },
    ],
  },
}

describe('what it must never emit', () => {
  const text = projectTermsText(full)

  it('never emits the budget — that is the client’s opening guess', () => {
    /* `budgetRange` is asked as "What budget do you have in mind?" with the
       tip "A range is fine". Putting it in a block headed for a contract
       silently converts a guess into a stated price, and it does so
       invisibly — the number reads as correct on the clipboard. */
    expect(text).not.toMatch(/3,000/)
    expect(text).not.toMatch(/budget/i)
  })

  it('never emits the hourly rate', () => {
    // The store says it outright: "What a client gets charged is a claim you
    // make deliberately, so nothing writes here automatically."
    expect(text).not.toMatch(/\b95\b/)
    expect(text).not.toMatch(/per hour/i)
  })

  it('does emit the extra-round fee, which was entered as a claim', () => {
    // The distinction is exact: this was typed into a field labelled "Fee per
    // extra round", so it is already a deliberate statement about cost.
    expect(text).toMatch(/\$150\.00/)
  })
})

describe('what it emits', () => {
  const text = projectTermsText(full)

  it('carries all six facts', () => {
    expect(text).toMatch(/Deliverables/)
    expect(text).toMatch(/Primary logo/)
    expect(text).toMatch(/A shop sign/)
    expect(text).toMatch(/Timeline/)
    expect(text).toMatch(/Delivery by 2026-09-01/)
    expect(text).toMatch(/First concepts — 2026-08-01/)
    expect(text).toMatch(/2 rounds included/)
    expect(text).toMatch(/Sarah Whitton approves the work/)
    expect(text).toMatch(/SVG, PNG/)
    expect(text).toMatch(/No website build/)
  })

  it('keeps a milestone with no date rather than dropping it', () => {
    expect(text).toMatch(/- Sign-off$/m)
  })

  it('singularises one round', () => {
    const t = projectTermsText({ ...full, scopeRevisionsIncluded: 1 })
    expect(t).toMatch(/1 round included/)
  })
})

describe('omission', () => {
  it('leaves out every section it cannot fill', () => {
    const t = projectTermsText({
      scopeApprover: 'Sarah',
      detective: {},
    })
    expect(t).toMatch(/Approval/)
    expect(t).not.toMatch(/Deliverables/)
    expect(t).not.toMatch(/Timeline/)
    expect(t).not.toMatch(/Revisions/)
    expect(t).not.toMatch(/Not included/)
  })

  it('omits revisions when the count is zero rather than promising none', () => {
    /* "0 rounds included" in a contract is a term. A blank scope is not the
       same as an agreement to do no revisions, so it stays silent. */
    const t = projectTermsText({ ...full, scopeRevisionsIncluded: 0 })
    expect(t).not.toMatch(/Revisions/)
    expect(t).not.toMatch(/0 round/)
  })

  it('omits the extra-round fee when no rate was set', () => {
    const t = projectTermsText({ ...full, scopeRevisionRate: '' })
    expect(t).toMatch(/2 rounds included/)
    expect(t).not.toMatch(/Additional rounds/)
  })

  it('is empty for an empty project, and says so', () => {
    expect(projectTermsText({})).toBe('')
    expect(projectTermsText()).toBe('')
    expect(hasProjectTerms({})).toBe(false)
    expect(hasProjectTerms(full)).toBe(true)
  })

  it('never leaves a heading with nothing under it', () => {
    const t = projectTermsText(full)
    const lines = t.split('\n')
    lines.forEach((line, i) => {
      const isHeading = line && !line.startsWith('-') && line.trim() !== ''
      if (!isHeading) return
      expect(lines[i + 1]?.startsWith('-'), `"${line}" has no items`).toBe(true)
    })
  })
})

describe('it is generated, never stored', () => {
  it('reflects an edit immediately, with no stale copy in between', () => {
    /* Storage is what creates drift, and drift here is the dangerous kind:
       the stale copy is the one with legal force. */
    const before = projectTermsText(full)
    const after = projectTermsText({ ...full, scopeRevisionsIncluded: 4 })
    expect(before).toMatch(/2 rounds included/)
    expect(after).toMatch(/4 rounds included/)
  })

  it('does not mutate the project it reads', () => {
    const copy = JSON.parse(JSON.stringify(full))
    projectTermsText(full)
    expect(full).toEqual(copy)
  })
})
