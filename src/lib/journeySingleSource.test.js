/**
 * The journey is declared once, in journey.js. Nothing may restate it.
 *
 * This is the dominant defect in this codebase. Nine separate modules kept
 * their own copy of the path — the labels, the ids, the order, or the count —
 * and the v1.53.6 rename updated exactly one of them. The rest went on saying
 * Sketch, Design, Deliver and "Project overview" for stops the app had
 * renamed, a demo tour walked new users through a seven-step path that no
 * longer existed, the shortcuts modal advertised keys that did nothing, and
 * three completion gates compared a five-row count against 7 so finishing was
 * impossible.
 *
 * A copy fails on correct changes (a reorder) and stays silent on wrong ones
 * (a stop nobody added), which is the worst of both. So this test greps the
 * source for restatements rather than trusting review to catch the next one.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { JOURNEY_STEPS, PATH_STEP_COUNT, labelForView, labelForStepId } from './journey'

const SRC = new URL('..', import.meta.url).pathname

/** journey.js is allowed to say these things — it is the declaration. */
const ALLOWED = new Set([
  'lib/journey.js', // the declaration itself
  'lib/journeySingleSource.test.js',
  'lib/i18n.js', // translations ARE the labels, per locale
])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(js|jsx)$/.test(name)) out.push(full)
  }
  return out
}

const files = walk(SRC)
  .map((f) => ({ path: f, rel: relative(SRC, f) }))
  .filter((f) => !ALLOWED.has(f.rel))
  /* Source only. A test asserting "this stop is called Identity" is stating an
     expectation, which is its job; shipped code doing the same is a copy that
     will go stale. */
  .filter((f) => !/\.test\.jsx?$/.test(f.rel))
  .map((f) => ({ ...f, text: readFileSync(f.path, 'utf8') }))

/** Strip comments — prose may name a stop; code may not restate the set. */
const code = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('journey is single-source', () => {
  /**
   * The precise, low-false-positive check: no module may write a path stop's
   * LABEL as a string literal.
   *
   * Earlier drafts of this test flagged any file naming three or more step
   * ids or views. That caught real copies but also every legitimate piece of
   * per-step logic — routing, per-stop completion rules, per-stop coaching —
   * which must name ids and should. A guard that cries wolf gets deleted, so
   * it checks the thing only a copy does: restating the words.
   */
  it('no module writes a path label as a string literal', () => {
    const labels = JOURNEY_STEPS.map((s) => s.label)
    const offenders = []
    for (const { rel, text } of files) {
      const c = code(text)
      const hits = labels.filter(
        (l) => c.includes(`'${l}'`) || c.includes(`"${l}"`)
      )
      if (hits.length) offenders.push(`${rel}: ${hits.join(', ')}`)
    }
    expect(offenders).toEqual([])
  })

  it('resolves labels for every path view and step id', () => {
    for (const step of JOURNEY_STEPS) {
      expect(labelForView(step.view)).toBe(step.label)
      expect(labelForStepId(step.id)).toBe(step.label)
    }
  })

  it('labels the Tools stages the path lists alongside its stops', () => {
    expect(labelForStepId('ideate')).toBe('Ideate')
    expect(labelForStepId('review')).toBe('Review')
  })

  it('degrades to something neutral, never to a specific stop', () => {
    /* WorkLogPanel's fallback became 'Touchpoints' when a bulk rename swept
       the generic default along with the stop it renamed. An unknown stage
       must never resolve to a real one. */
    const labels = JOURNEY_STEPS.map((s) => s.label)
    expect(labels).not.toContain(labelForStepId(undefined))
    expect(labels).not.toContain(labelForStepId('not-a-stage'))
  })

  it('PATH_STEP_COUNT tracks the declaration', () => {
    expect(PATH_STEP_COUNT).toBe(JOURNEY_STEPS.length)
  })
})
