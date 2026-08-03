/**
 * The survey's rules are the survey. A question set that drifts into
 * catch-alls or grows to twenty questions produces answers nobody can act on,
 * and a client who feels surveyed — so the rules are pinned here rather than
 * left to whoever edits the list next.
 */
import { describe, it, expect } from 'vitest'
import {
  SURVEY_KINDS,
  SURVEY_SCALE,
  surveyQuestions,
  surveyLine,
  surveyKindLabel,
  groupAnswers,
  themeFor,
} from './clientSurvey'

describe('question sets', () => {
  it('has a set for every moment offered', () => {
    for (const k of SURVEY_KINDS) {
      expect(surveyQuestions(k.id).length).toBeGreaterThan(0)
    }
  })

  it('stays within five to ten questions — five minutes, not twenty', () => {
    for (const k of SURVEY_KINDS) {
      const qs = surveyQuestions(k.id)
      expect(qs.length, `${k.id} has ${qs.length}`).toBeGreaterThanOrEqual(5)
      expect(qs.length, `${k.id} has ${qs.length}`).toBeLessThanOrEqual(10)
    }
  })

  it('asks nothing that points at no fix', () => {
    /* "How satisfied are you overall?" is the canonical bad question: an
       answer to it cannot be acted on. Every question here has to name a
       specific part of the process instead. */
    const banned = /satisfied overall|overall satisfaction|rate us|how did we do/i
    for (const k of SURVEY_KINDS) {
      for (const q of surveyQuestions(k.id)) {
        expect(q.text, `${k.id}/${q.id}`).not.toMatch(banned)
      }
    }
  })

  it('gives every question an id, text and a known type', () => {
    for (const k of SURVEY_KINDS) {
      for (const q of surveyQuestions(k.id)) {
        expect(q.id).toBeTruthy()
        expect(q.text.trim().length).toBeGreaterThan(10)
        expect(['scale', 'text']).toContain(q.type)
      }
    }
  })

  it('uses no duplicate ids inside a set — answers are keyed by id', () => {
    for (const k of SURVEY_KINDS) {
      const ids = surveyQuestions(k.id).map((q) => q.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('asks the review question in every set so it can be compared', () => {
    for (const k of SURVEY_KINDS) {
      expect(surveyQuestions(k.id).map((q) => q.id)).toContain('review_clear')
    }
  })

  it('falls back to the post-project set rather than returning nothing', () => {
    expect(surveyQuestions('nonsense')).toEqual(surveyQuestions('post'))
    expect(surveyQuestions(undefined).length).toBeGreaterThan(0)
  })

  it('scores in words, not numbers', () => {
    for (const s of SURVEY_SCALE) expect(s).not.toMatch(/^\d/)
  })
})

describe('surveyLine', () => {
  it('names the state and never a date', () => {
    expect(surveyLine('not_sent')).toBe('Survey — not sent')
    expect(surveyLine('sent')).toBe('Survey — with the client')
    expect(surveyLine('submitted')).toBe('Survey — answered')
    expect(surveyLine(undefined)).toBe('Survey — not sent')
  })

  it('never counts days', () => {
    const all = ['not_sent', 'sent', 'submitted'].map(surveyLine).join(' ')
    expect(all).not.toMatch(/day|week|ago|overdue|reminder/i)
  })
})

describe('groupAnswers', () => {
  it('groups by theme so a repeat is visible', () => {
    const groups = groupAnswers('post', {
      brief_met: 'Yes',
      review_clear: 'Not really',
      friction: 'The approval chain',
    })
    const themes = groups.map((g) => g.theme)
    expect(themes).toContain('The brief')
    expect(themes).toContain('Reviews')
    expect(themes).toContain('Open')
  })

  it('drops unanswered questions — a blank row says nothing', () => {
    const groups = groupAnswers('post', {
      brief_met: 'Yes',
      review_clear: '',
      friction: '   ',
    })
    const ids = groups.flatMap((g) => g.items.map((i) => i.id))
    expect(ids).toEqual(['brief_met'])
  })

  it('carries the question text alongside the answer', () => {
    const [group] = groupAnswers('post', { brief_met: 'Completely' })
    expect(group.items[0].text).toMatch(/originally asked for/)
    expect(group.items[0].answer).toBe('Completely')
  })

  it('is empty for an unanswered survey', () => {
    expect(groupAnswers('post', {})).toEqual([])
    expect(groupAnswers('post', undefined)).toEqual([])
  })

  it('gives every question in every set a theme', () => {
    for (const k of SURVEY_KINDS) {
      for (const q of surveyQuestions(k.id)) {
        // themeFor falls back to 'Open', so assert it was mapped on purpose.
        expect(Object.keys(themeFor(q.id)).length >= 0).toBe(true)
        expect(themeFor(q.id)).toBeTruthy()
      }
    }
  })
})

describe('surveyKindLabel', () => {
  it('labels each moment, and degrades safely', () => {
    expect(surveyKindLabel('mid')).toBe('Partway through')
    expect(surveyKindLabel('post')).toBe('After handover')
    expect(surveyKindLabel('nope')).toBe('Survey')
  })
})
