import { describe, expect, it } from 'vitest'
import {
  asksWhy,
  buildBrandBrain,
  factLine,
  recall,
  suggestedQuestions,
  tokens,
  topicsFor,
} from './brandBrain'

const project = {
  detective: {
    goal: 'We look too small next to the chains',
    audience: 'new parents buying gifts',
    avoid: 'nothing pastel, no script fonts',
    toneOfVoice: 'quick, honest, no nonsense',
  },
  decisionLog: [
    {
      id: 1,
      at: 200,
      kind: 'direction',
      label: 'b',
      title: 'Handmade mark',
      why: 'the warmth the brief asked for, without going twee',
    },
  ],
  directions: [
    { id: 'a', label: 'A', title: 'Geometric monogram', note: 'too corporate for a family business', chosen: false },
    { id: 'b', label: 'B', title: 'Handmade mark', note: '', chosen: true },
  ],
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
  typeWhy: 'humanist shapes read as approachable at small sizes',
  colorRoles: { cover: '#1C1917', accent: '#0F766E' },
  colorRoleWhy: { cover: 'grounded, not black', accent: '' },
  logoWordmark: "Sparrow's Promise",
  feedbackLog: [
    { id: 1, reviewer: 'Client', issue: 'the icon feels too heavy', decision: 'lighten the stroke' },
  ],
  handoffNote: 'Everything approved on 4 August.',
}

const brain = buildBrandBrain({
  project,
  moodItems: [{ id: 1, inPack: true, note: 'the paper stock, not the layout' }],
})

describe('what the brain remembers', () => {
  it('collects the brief in the client’s own words', () => {
    const goal = brain.facts.find((f) => f.value.includes('too small'))
    expect(goal.source).toBe('Brief')
    expect(goal.topic).toBe('strategy')
  })

  it('keeps directions that were NOT chosen, with the reason', () => {
    const rejected = brain.byTopic.rejected.find((f) =>
      f.label.includes('A')
    )
    expect(rejected.value).toBe('Geometric monogram')
    expect(rejected.why).toBe('too corporate for a family business')
  })

  it('carries the reason separately from the value', () => {
    const type = brain.byTopic.type.find((f) => f.label === 'Body face')
    expect(type.value).toBe('Plus Jakarta Sans Regular')
    expect(type.why).toMatch(/humanist/)
  })

  it('remembers a colour role with no reason on record', () => {
    const accent = brain.byTopic.colour.find((f) => f.label === 'Accent colour')
    expect(accent.value).toBe('#0F766E')
    expect(accent.why).toBe('')
  })

  it('invents nothing from an empty project', () => {
    expect(buildBrandBrain({}).facts).toEqual([])
    expect(buildBrandBrain().facts).toEqual([])
  })

  it('drops facts with neither a value nor a reason', () => {
    expect(brain.facts.every((f) => f.value || f.why)).toBe(true)
  })
})

describe('asking it a question', () => {
  it('answers “why this typeface” with the type rationale', () => {
    const { matches } = recall(brain, 'why did we choose this typeface?')
    expect(matches[0].topic).toBe('type')
    expect(matches[0].why).toMatch(/humanist/)
  })

  it('answers “what did the client rule out”', () => {
    const { matches } = recall(brain, 'what did the client rule out?')
    const values = matches.map((m) => m.value).join(' | ')
    expect(values).toMatch(/pastel|Geometric monogram/)
  })

  it('finds a fact by the client’s own words', () => {
    const { matches } = recall(brain, 'icon heavy')
    expect(matches[0].value).toMatch(/icon feels too heavy/)
  })

  it('prefers facts that carry a reason when asked why', () => {
    const { matches, why } = recall(brain, 'why colour?')
    expect(why).toBe(true)
    expect(matches[0].why).toBeTruthy()
  })

  it('shows the decisions that have reasons when asked nothing', () => {
    const { matches } = recall(brain, '')
    expect(matches[0].why).toBeTruthy()
  })

  it('returns nothing rather than guessing when the project cannot answer', () => {
    const { matches } = recall(buildBrandBrain({ project: {} }), 'why this typeface?')
    expect(matches).toEqual([])
  })

  it('respects the limit', () => {
    expect(recall(brain, 'brand', { limit: 2 }).matches).toHaveLength(2)
  })
})

describe('question parsing', () => {
  it('drops stop words', () => {
    expect(tokens('why did we choose this typeface')).toEqual([
      'why',
      'choose',
      'typeface',
    ])
  })

  it('maps words a designer actually uses onto topics', () => {
    expect(topicsFor('what font did we pick')).toContain('type')
    expect(topicsFor('which colours')).toContain('colour')
    expect(topicsFor('what did they reject')).toContain('rejected')
  })

  it('spots a why question', () => {
    expect(asksWhy('why this mark?')).toBe(true)
    expect(asksWhy('what is the body face?')).toBe(false)
  })
})

describe('presentation', () => {
  it('writes one readable line', () => {
    expect(
      factLine({ label: 'Body face', value: 'Inter', why: 'legible small' })
    ).toBe('Body face: Inter — because legible small')
    expect(factLine({ label: 'Body face', value: 'Inter' })).toBe(
      'Body face: Inter'
    )
    expect(factLine(null)).toBe('')
  })

  it('only suggests questions this project can answer', () => {
    const qs = suggestedQuestions(brain)
    expect(qs).toContain('Why this typeface?')
    expect(suggestedQuestions(buildBrandBrain({ project: {} }))).toEqual([])
  })
})
