/**
 * The case study is an outward-facing document assembled from private
 * records, so the tests that matter most are the ones about what must NOT
 * come out of it.
 */
import { describe, it, expect } from 'vitest'
import {
  buildCaseStudy,
  caseStudyMarkdown,
  durationFrom,
  durationPhrase,
  caseStudyGaps,
  rankCaseStudies,
  curateCaseStudies,
} from './caseStudy'

const LABELS = {
  logoPrimary: 'Primary logo',
  colourPalette: 'Colour palette',
}

const full = {
  id: 'p1',
  name: 'Harbor & Hearth',
  tagline: 'Brew slow.',
  learnings: 'The shop sign drove every decision.',
  handoffNote: 'SVG, PNG and the book.',
  detective: {
    clientName: 'Harbor & Hearth Co.',
    goal: 'Look like a neighbourhood staple, not a trend cafe.',
    audience: 'Locals who walk past every morning.',
    deliverablesPicked: ['logoPrimary', 'colourPalette'],
  },
  decisionLog: [
    { id: 1, label: 'B', title: 'Quiet teal', why: 'calm, not corporate' },
  ],
  workLog: [
    { date: '2026-06-01', stage: 'research', hours: 4 },
    { date: '2026-06-02', stage: 'design', hours: 6 },
    { date: '2026-06-15', stage: 'design', hours: 10 },
  ],
}

describe('durationFrom', () => {
  it('reports a span and working days, never a total', () => {
    const d = durationFrom(full.workLog)
    expect(d.sessions).toBe(3)
    expect(d.weeks).toBe(2)
    expect(d).not.toHaveProperty('totalHours')
    expect(d).not.toHaveProperty('hours')
  })

  it('reports where the effort went as shares, not hours', () => {
    const d = durationFrom(full.workLog)
    // 16 of 20 hours in design, 4 in research.
    expect(d.stages[0]).toEqual({ stage: 'design', share: 0.8 })
    expect(d.stages[1]).toEqual({ stage: 'research', share: 0.2 })
  })

  it('is null when the clock never ran', () => {
    // "0 weeks" in a portfolio piece reads as a project that never happened.
    expect(durationFrom([])).toBe(null)
    expect(durationFrom(undefined)).toBe(null)
    expect(durationFrom([{ date: '2026-06-01', hours: 0 }])).toBe(null)
  })

  it('never reports less than a week for real work', () => {
    const d = durationFrom([{ date: '2026-06-01', stage: 'design', hours: 3 }])
    expect(d.weeks).toBe(1)
    expect(d.sessions).toBe(1)
  })
})

describe('durationPhrase', () => {
  it('reads as English, and singularises', () => {
    expect(durationPhrase(durationFrom(full.workLog))).toBe(
      '2 weeks, across 3 working days'
    )
    expect(
      durationPhrase(durationFrom([{ date: '2026-06-01', stage: 'x', hours: 2 }]))
    ).toBe('1 week, across 1 working day')
  })

  it('is empty when there is no duration', () => {
    expect(durationPhrase(null)).toBe('')
  })
})

describe('buildCaseStudy', () => {
  it('answers all five questions from what the project already holds', () => {
    const cs = buildCaseStudy({ project: full, deliverableLabels: LABELS })
    expect(cs.purpose).toMatch(/neighbourhood staple/)
    expect(cs.role).toEqual(['Primary logo', 'Colour palette'])
    expect(cs.process[0].why).toBe('calm, not corporate')
    expect(cs.duration.sessions).toBe(3)
    expect(cs.outcome).toMatch(/shop sign/)
    expect(cs.gaps).toEqual([])
  })

  it('names what is missing rather than inventing it', () => {
    const cs = buildCaseStudy({ project: { name: 'Bare' } })
    expect(cs.gaps.map((g) => g.id)).toEqual([
      'purpose',
      'role',
      'process',
      'duration',
      'outcome',
    ])
  })

  it('says plainly when the clock is why the duration is missing', () => {
    const cs = buildCaseStudy({ project: { ...full, workLog: [] } })
    const gap = cs.gaps.find((g) => g.id === 'duration')
    expect(gap.label).toMatch(/clock never ran/)
  })

  it('drops decision entries with neither a title nor a why', () => {
    const cs = buildCaseStudy({
      project: { ...full, decisionLog: [{ id: 1 }, { id: 2, title: 'Real' }] },
    })
    expect(cs.process).toHaveLength(1)
  })
})

describe('caseStudyMarkdown', () => {
  const md = caseStudyMarkdown(
    buildCaseStudy({ project: full, deliverableLabels: LABELS })
  )

  it('shares the process, which is the point of the whole document', () => {
    expect(md).toMatch(/## How I got there/)
    expect(md).toMatch(/calm, not corporate/)
  })

  it('never publishes an hour count', () => {
    /* workLog is the private clock — it was split from timeLog precisely so a
       measured minute could not become a claim made to another person. A
       total here would hand a prospective client a number to divide the fee
       by. Shares and a span say more and invite no arithmetic. */
    expect(md).toMatch(/2 weeks, across 3 working days/)
    expect(md).not.toMatch(/\b20 hours\b/)
    expect(md).not.toMatch(/\bhours\b/)
    expect(md).toMatch(/design — 80%/)
  })

  it('omits every section it cannot fill', () => {
    const bare = caseStudyMarkdown(buildCaseStudy({ project: { name: 'Bare' } }))
    expect(bare).toMatch(/# Bare/)
    expect(bare).not.toMatch(/## Why it existed/)
    expect(bare).not.toMatch(/## How long it took/)
    expect(bare).not.toMatch(/## How it turned out/)
  })

  it('hides stages that round to noise', () => {
    const md2 = caseStudyMarkdown(
      buildCaseStudy({
        project: {
          ...full,
          workLog: [
            { date: '2026-06-01', stage: 'design', hours: 20 },
            { date: '2026-06-02', stage: 'admin', hours: 0.5 },
          ],
        },
      })
    )
    expect(md2).toMatch(/design — 98%/)
    expect(md2).not.toMatch(/admin/)
  })

  it('returns empty rather than throwing on nothing', () => {
    expect(caseStudyMarkdown(null)).toBe('')
  })
})

describe('curation', () => {
  const bare = { id: 'p2', name: 'Bare' }
  const half = {
    id: 'p3',
    name: 'Half',
    detective: { goal: 'Something' },
    decisionLog: [{ id: 1, title: 'A' }],
  }

  it('ranks the best-told project first', () => {
    const ranked = rankCaseStudies([bare, full, half], LABELS)
    expect(ranked[0].title).toBe('Harbor & Hearth')
    expect(ranked[0].gaps).toBe(0)
    expect(ranked[2].title).toBe('Bare')
  })

  it('returns at most the six the article asks for', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `x${i}`,
      name: `P${i}`,
    }))
    expect(curateCaseStudies(many)).toHaveLength(6)
  })

  it('handles an empty workspace', () => {
    expect(curateCaseStudies([])).toEqual([])
    expect(rankCaseStudies(undefined)).toEqual([])
  })
})

describe('caseStudyGaps', () => {
  it('accepts free-text deliverables as an answer to "what you made"', () => {
    const cs = buildCaseStudy({
      project: {
        ...full,
        detective: { ...full.detective, deliverablesPicked: [], deliverables: 'A shop sign' },
      },
    })
    expect(caseStudyGaps(cs).map((g) => g.id)).not.toContain('role')
  })
})
