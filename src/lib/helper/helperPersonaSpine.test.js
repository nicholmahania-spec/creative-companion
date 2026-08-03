/**
 * The Helper is told the real path, not a copy of it.
 *
 * `PROCESS_SPINE` was a hand-written string and it went stale exactly the
 * way CLAUDE.md says every restated copy of the journey goes stale: it
 * named seven stops — Define, Research, Ideate, Sketch, Design, Review,
 * Deliver — when the app has five, under labels it no longer uses. The
 * comment above it asserted the spine "must stay" current, which is what a
 * copy always claims right before it drifts.
 *
 * This copy is worse than the others the rule exists to catch. Every other
 * one puts a wrong word on a screen, where a human can see it is wrong.
 * This one is fed to a model as fact, so the Helper coached the user
 * through stages their app does not have — and advice about a different
 * product is worse than no advice, because it is followable.
 */

import { describe, it, expect } from 'vitest'
import { JOURNEY_STEPS } from '../journey.js'
import {
  PROCESS_SPINE,
  HELPER_SYSTEM_PROMPT,
  HELPER_ASK_SYSTEM_PROMPT,
} from './helperPersona.js'

describe('the Helper knows the actual journey', () => {
  it('names every stop, in order', () => {
    expect(PROCESS_SPINE).toBe(JOURNEY_STEPS.map((s) => s.label).join(' → '))
  })

  it('names as many stops as the journey has', () => {
    // The stale version claimed seven against an actual five.
    expect(PROCESS_SPINE.split('→')).toHaveLength(JOURNEY_STEPS.length)
  })

  it('carries no retired stop names', () => {
    /* These were real once. A model told about "Ideate" will send the user
       looking for a page that does not exist, which reads as the user
       failing to find it rather than the app not having it. */
    for (const gone of ['Ideate', 'Sketch', 'Deliver', 'Define']) {
      expect(
        PROCESS_SPINE,
        `"${gone}" is not a current stop — the spine is restating a copy`
      ).not.toContain(gone)
    }
  })

  it('reaches the prompt the model actually receives', () => {
    // Deriving the constant is pointless if the prompt interpolates
    // something else.
    expect(HELPER_SYSTEM_PROMPT).toContain(PROCESS_SPINE)
    for (const label of JOURNEY_STEPS.map((s) => s.label)) {
      expect(HELPER_SYSTEM_PROMPT).toContain(label)
    }
  })
})

describe('a typed question is allowed a real answer', () => {
  it('keeps the short cap on the one-press intents', () => {
    // Pressing "I'm stuck" is an interruption inside work — one move, not
    // an essay. This half must not drift longer.
    expect(HELPER_SYSTEM_PROMPT).toMatch(/~?50 words/)
  })

  it('lets a typed question run longer', () => {
    // A fragment does not end the question, so the user leaves for a search
    // engine — and that detour costs far more than reading in place.
    expect(HELPER_ASK_SYSTEM_PROMPT).toMatch(/150 words/)
  })

  it('requires the answer first, which is what makes the length safe', () => {
    expect(HELPER_ASK_SYSTEM_PROMPT).toMatch(/FIRST sentence/)
    expect(HELPER_ASK_SYSTEM_PROMPT).toMatch(/preamble/)
  })

  it('adds no scaffolding and no closing upsell', () => {
    /* Labels are chrome the eye classifies before reading; a predictable
       closing question is a toll. Both are ruled out in the prompt itself
       so the model cannot reintroduce them. */
    expect(HELPER_ASK_SYSTEM_PROMPT).toMatch(/no markdown headings/i)
    expect(HELPER_ASK_SYSTEM_PROMPT).toMatch(/go deeper/i)
  })

  it('still carries the persona and the real journey', () => {
    expect(HELPER_ASK_SYSTEM_PROMPT).toContain(PROCESS_SPINE)
  })
})
