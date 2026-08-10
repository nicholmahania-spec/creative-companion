import { describe, expect, it } from 'vitest'
import { stopEstablished } from './stopEstablished'
import { JOURNEY_STEPS } from './journey'

/**
 * These cards replaced a checklist. The rule that makes them navigation
 * rather than completion debt is narrow and easy to lose:
 *
 *   Say what EXISTS. Never what is outstanding, never as a fraction.
 *
 * "5 of 35 answered" and "0 of 3 covered" both shipped in the first cut and
 * both had to come out — a denominator turns "what have I established" into
 * "what do I still owe", on the one screen whose job is orientation.
 */

describe('every stop has something to say', () => {
  it('covers all five, including on an empty project', () => {
    for (const step of JOURNEY_STEPS) {
      const { line } = stopEstablished(step.id, { project: {} })
      expect(line, `${step.id} said nothing`).toBeTruthy()
    }
  })

  it('never reports a fraction', () => {
    const project = {
      detective: {
        clientName: 'Harbor & Hearth',
        goal: 'Look established',
        audience: 'Makers',
        brandSurfaces: ['website', 'print'],
        deliverablesPicked: ['logoPrimary'],
      },
      touchpointApps: { businessCard: { done: true } },
      palette: ['#1C1917', '#0F766E'],
      tagline: 'Quiet confidence',
    }
    const mood = [{ inPack: true }, {}, {}]
    for (const step of JOURNEY_STEPS) {
      const { line } = stopEstablished(step.id, {
        project,
        moodItems: mood,
        palette: project.palette,
      })
      expect(line, `${step.id}: "${line}"`).not.toMatch(/\d+\s*(of|\/)\s*\d+/)
    }
  })

  it('never uses completion or debt words', () => {
    const project = { detective: { goal: 'g' }, handoffNote: 'sent' }
    for (const step of JOURNEY_STEPS) {
      const { line } = stopEstablished(step.id, { project, moodItems: [] })
      expect(line.toLowerCase()).not.toMatch(
        /\bremaining\b|\bmissing\b|\bincomplete\b|\boutstanding\b|\btodo\b|\bleft\b/
      )
    }
  })
})

describe('what each stop reports', () => {
  it('counts the brief’s answers and says whether it went out', () => {
    const base = { detective: { goal: 'Look established', audience: 'Makers' } }
    expect(stopEstablished('define', { project: base }).line).toMatch(
      /^\d+ answers?$/
    )
    expect(
      stopEstablished('define', {
        project: { ...base, discoveryShareId: 's1' },
      }).line
    ).toMatch(/· sent$/)
    expect(
      stopEstablished('define', {
        project: {
          ...base,
          discoveryShareId: 's1',
          discoveryShareStatus: 'submitted',
        },
      }).line
    ).toMatch(/client answered$/)
    expect(stopEstablished('define', { project: {} }).line).toBe('Not started')
  })

  it('reports pins and stars, not a pack quota', () => {
    expect(
      stopEstablished('research', { project: {}, moodItems: [] }).line
    ).toBe('Nothing pinned')
    expect(
      stopEstablished('research', {
        project: {},
        moodItems: [{ inPack: true }, {}, {}],
      }).line
    ).toBe('1 starred · 3 pins')
  })

  it('hands Identity the brand itself, not a sentence about it', () => {
    const r = stopEstablished('design', {
      project: { logoImage: 'data:x', typeHeading: 'Fraunces', tagline: 'T' },
      palette: ['#111111', '#222222'],
    })
    expect(r.swatches).toEqual(['#111111', '#222222'])
    expect(r.mark).toBe('data:x')
    expect(r.line).toBe('mark · type · tagline')
  })

  it('does not list factory Jakarta as established type', () => {
    const r = stopEstablished('design', {
      project: {
        typeHeading: 'Plus Jakarta Sans Bold',
        typeBody: 'Plus Jakarta Sans Regular',
        tagline: 'T',
      },
      palette: ['#111111', '#222222'],
    })
    expect(r.line).toBe('tagline')
    expect(r.line).not.toMatch(/type/)
  })

  it('shows no swatches when the palette is still the factory four', () => {
    // The caller filters, but the shape has to survive it: presenting colours
    // nobody chose as the brand's own is the defect `paletteIsUntouched` was
    // written for.
    const r = stopEstablished('design', { project: {}, palette: [] })
    expect(r.swatches).toEqual([])
    expect(r.line).toBe('Nothing set yet')
  })

  it('names surfaces before any evidence, and evidence counts once something is recorded', () => {
    const project = {
      detective: { brandSurfaces: ['website', 'print'], deliverablesPicked: [] },
    }
    const before = stopEstablished('sketch', { project }).line
    expect(before).toMatch(/surfaces?$/)
    expect(before).not.toMatch(/evidence|covered|complete/i)

    const after = stopEstablished('sketch', {
      project: { ...project, touchpointApps: { website: { done: true } } },
    }).line
    expect(after).toMatch(/evidence/i)
    expect(after).toMatch(/surfaces?/)
    expect(after).not.toMatch(/covered|complete/i)
    expect(after).not.toMatch(/\d+\s*(of|\/)\s*\d+/)
  })

  it('says whether a handoff note exists — never handed off or delivered', () => {
    expect(stopEstablished('deliver', { project: {} }).line).toBe(
      'No handoff note yet'
    )
    expect(
      stopEstablished('deliver', { project: { handoffNote: 'Files sent' } }).line
    ).toBe('Handoff note written')
  })
})
