import { describe, expect, it } from 'vitest'
import {
  brandCompleteness,
  completenessHeadline,
  groupInScope,
  COMPLETENESS_GROUPS,
  topGaps,
} from './completeness'
import { STOCK_PROJECT_PALETTE } from '../journey/journeyProgress'

const project = (over = {}) => ({
  palette: [...STOCK_PROJECT_PALETTE],
  detective: {},
  ...over,
})

const groupIds = (r) => r.groups.map((g) => g.id)

describe('scope', () => {
  it('counts everything when the brief has picked nothing', () => {
    const r = brandCompleteness({ project: project() })
    expect(groupIds(r)).toEqual(COMPLETENESS_GROUPS.map((g) => g.id))
  })

  it('drops colour, type and touchpoints from a logo-only job', () => {
    /* The whole point: a finished logo job must not be told it is missing a
       type pair it was never paid to make. */
    const r = brandCompleteness({
      project: project({
        detective: { deliverablesPicked: ['logoPrimary', 'logoVariations'] },
      }),
    })
    expect(groupIds(r)).toEqual([
      'strategy',
      'research',
      'ideate',
      'logo',
      'handoff',
    ])
  })

  it('keeps logo rules in scope for a logo-only job', () => {
    const r = brandCompleteness({
      project: project({ detective: { deliverablesPicked: ['logoPrimary'] } }),
    })
    const logo = r.groups.find((g) => g.id === 'logo')
    expect(logo.rows.map((x) => x.id)).toContain('logo.clearspace')
    expect(logo.rows.map((x) => x.id)).toContain('logo.minSize')
  })

  it('brings colour and type back when guidelines are bought', () => {
    const r = brandCompleteness({
      project: project({ detective: { deliverablesPicked: ['guidelines'] } }),
    })
    expect(groupIds(r)).toContain('colour')
    expect(groupIds(r)).toContain('type')
  })

  it('brings touchpoints in for any application deliverable', () => {
    const r = brandCompleteness({
      project: project({ detective: { deliverablesPicked: ['businessCard'] } }),
    })
    expect(groupIds(r)).toContain('touchpoints')
  })

  it('treats a missing needs list as always in scope', () => {
    expect(groupInScope({ id: 'strategy' }, ['logoPrimary'])).toBe(true)
    expect(groupInScope({ needs: ['guidelines'] }, ['logoPrimary'])).toBe(false)
    expect(groupInScope({ needs: ['guidelines'] }, [])).toBe(true)
  })
})

describe('checks read the project honestly', () => {
  it('does not count the stock palette as a palette', () => {
    const r = brandCompleteness({ project: project() })
    const row = r.rows.find((x) => x.id === 'colour.palette')
    expect(row.ok).toBe(false)
  })

  it('counts a real palette', () => {
    const r = brandCompleteness({
      project: project({ palette: ['#123456', '#FFFFFF', '#0F766E'] }),
    })
    expect(r.rows.find((x) => x.id === 'colour.palette').ok).toBe(true)
  })

  it('needs a why on every assigned colour role, not just one', () => {
    const half = brandCompleteness({
      project: project({
        colorRoles: { cover: '#123456', accent: '#0F766E' },
        colorRoleWhy: { cover: 'reads as dusk' },
      }),
    })
    expect(half.rows.find((x) => x.id === 'colour.roleWhy').ok).toBe(false)

    const full = brandCompleteness({
      project: project({
        colorRoles: { cover: '#123456' },
        colorRoleWhy: { cover: 'reads as dusk' },
      }),
    })
    expect(full.rows.find((x) => x.id === 'colour.roleWhy').ok).toBe(true)
  })

  it('counts a starred reference only when every star says why', () => {
    const noWhy = brandCompleteness({
      project: project(),
      moodItems: [{ inPack: true, note: '' }],
    })
    expect(noWhy.rows.find((x) => x.id === 'research.references').ok).toBe(false)

    const withWhy = brandCompleteness({
      project: project(),
      moodItems: [{ inPack: true, note: 'the paper stock, not the layout' }],
    })
    expect(withWhy.rows.find((x) => x.id === 'research.references').ok).toBe(true)
  })

  /**
   * PHASE 6 REPLACED THIS TEST, and the version it replaced is worth naming:
   * it asserted that a closed revision round, a feedback-log note, or
   * `logoClientChose` each counted as "a record of what the client approved".
   *
   * None of them is one. A closed revision round is a billing fact about how
   * many rounds were used. A feedback-log decision is a sentence the designer
   * typed. `logoClientChose` has had no writer since 2026-08-08, when its text
   * box was replaced by the starred concept — a project can never fill it
   * again. So the old check reported "approved" for projects no client had
   * seen, and could not report it for projects where a client had actually
   * pressed Approve, because it never read the portal where that is recorded.
   *
   * The three are asserted as NOT sufficient rather than simply dropped: the
   * point is that they were wrong, and a future edit that quietly restores one
   * as a convenience should fail here.
   */
  const approvalOk = (r) => r.rows.find((x) => x.id === 'handoff.approval').ok

  it('counts an approval only when the client actually gave one', () => {
    expect(
      approvalOk(brandCompleteness({ project: project() })),
      'nothing recorded should not read as approved'
    ).toBe(false)

    expect(
      approvalOk(
        brandCompleteness({
          project: project(),
          clientApproval: { approved: true },
        })
      )
    ).toBe(true)
  })

  it('does not accept the three local fields that used to stand in for it', () => {
    for (const stand_in of [
      { revisionRounds: [{ id: 1, closedAt: '2026-08-01' }] },
      { feedbackLog: [{ id: 1, decision: 'approved B' }] },
      { logoClientChose: 'concept B' },
    ]) {
      expect(
        approvalOk(brandCompleteness({ project: project(stand_in) })),
        `${Object.keys(stand_in)[0]} is not a client approval`
      ).toBe(false)
    }
  })

  it('survives a project of the wrong shape rather than throwing', () => {
    const r = brandCompleteness({
      project: { detective: null, colorRoles: 'nonsense', palette: null },
    })
    expect(r.total).toBeGreaterThan(0)
    expect(r.gaps.length).toBeGreaterThan(0)
  })

  it('handles no project at all', () => {
    const r = brandCompleteness()
    expect(r.done).toBe(0)
    expect(r.pct).toBe(0)
  })
})

describe('reporting', () => {
  it('every row carries somewhere to go and something to do', () => {
    const r = brandCompleteness({ project: project() })
    for (const row of r.rows) {
      expect(row.todo, `${row.id} has no todo`).toBeTruthy()
      expect(row.view, `${row.id} has no view`).toBeTruthy()
    }
  })

  it('states the count rather than grading the brand', () => {
    const r = brandCompleteness({ project: project() })
    const line = completenessHeadline(r)
    expect(line).toMatch(/not documented yet/)
    expect(line).not.toMatch(/%/)
  })

  it('says nothing is missing only when nothing is', () => {
    expect(completenessHeadline({ total: 3, done: 3, gaps: [] })).toMatch(
      /Nothing missing/
    )
  })

  it('caps the short list', () => {
    const r = brandCompleteness({ project: project() })
    expect(topGaps(r, 3)).toHaveLength(3)
    expect(topGaps(r, 0)).toHaveLength(0)
  })
})
