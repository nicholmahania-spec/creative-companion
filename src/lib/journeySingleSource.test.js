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
import {
  JOURNEY_STEPS,
  PATH_STEP_COUNT,
  labelForView,
  labelForStepId,
  toolsLabelForView,
} from './journey'

const SRC = new URL('..', import.meta.url).pathname

/** journey.js is allowed to say these things — it is the declaration. */
const ALLOWED = new Set([
  'lib/journey.js', // the declaration itself
  'lib/journeySingleSource.test.js',
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

  /**
   * The forward button must take its destination from the same place it takes
   * its label.
   *
   * DefineView rendered `Next · Research` and navigated to 'flow', which is
   * Touchpoints — following it skipped Research entirely, so the wall was empty
   * at Identity and the mark got drawn against memory. DesignView rendered
   * `Next · Touchpoints` and navigated to 'finish', skipping Touchpoints, so
   * the book was assembled with no applications in it. Both read correctly in
   * review: the label was derived, and only the destination was a literal.
   *
   * This is the restated-copy defect in its most expensive form, because the
   * label and the destination were two copies of one fact and only one of them
   * was updated. A hardcoded view id inside a path-continue button is therefore
   * banned outright — deriving both halves from getNextJourney makes them
   * structurally incapable of disagreeing.
   */
  /* Review is a Tool, not a path stop — getNextJourney('review') is null, so
     there is no next stop to derive and its literal is the honest answer. The
     exemption is listed rather than pattern-matched so that adding a stop to
     the path cannot silently widen it. */
  const NOT_PATH_STOPS = new Set(['views/ReviewView.jsx'])

  it('no path-continue button hardcodes where it goes', () => {
    const offenders = []
    for (const f of files) {
      if (!/views\/.+\.jsx$/.test(f.rel)) continue
      if (NOT_PATH_STOPS.has(f.rel)) continue
      const src = readFileSync(f.path, 'utf8')
      const idx = src.indexOf('path-continue-row')
      if (idx === -1) continue
      const block = src.slice(idx, idx + 700)
      const literal = /setActiveView\?\.\(\s*'[a-z]+'\s*\)/.exec(block)
      if (literal) offenders.push(`${f.rel}: ${literal[0]}`)
    }
    expect(offenders).toEqual([])
  })
  /**
   * Retired stop names must not survive as literals anywhere.
   *
   * The existing greps above catch a CURRENT label being restated. They
   * structurally cannot catch a STALE one — nothing in the declaration matches
   * "Deliver" once the stop is called Assets — so four "Open Deliver" buttons,
   * a gap-strip tooltip and a "Send · Work" button all shipped and passed CI
   * while the sidebar, the step rail, the page heading and the shortcuts modal
   * all said something else. Two names for one destination makes the user hold
   * a private synonym table the app never confirms, and that table is exactly
   * what does not survive two weeks away.
   *
   * Phrases, not bare words, so that 'deliver' as a step id, DeliverView as a
   * filename and labelForStepId('deliver') stay legal.
   */
  const RETIRED_PHRASES = [
    'Open Deliver',
    'open Deliver',
    'Send · Work',
    /* NOT 'Project overview'. It is still the live name of the client-facing
       form ("Project overview form"), so the phrase cannot tell a legitimate
       artifact name from a stale stop name. ClientsView called it a *step* and
       was fixed by hand; a denylist that flags the form would be deleted the
       first time it cried wolf. */
  ]

  it('no retired stop name survives as a literal', () => {
    const offenders = []
    for (const f of files) {
      if (!/\.jsx$/.test(f.rel)) continue
      for (const phrase of RETIRED_PHRASES) {
        if (f.text.includes(phrase)) offenders.push(`${f.rel}: ${phrase}`)
      }
    }
    expect(offenders).toEqual([])
  })
  /**
   * Tools labels are declared too, and were outside every guard.
   *
   * toolsLabelForView() in journey.js is the declaration for the off-path
   * pages — Calendar, Clients, Settings, Timer, Ideate, Review, Brand book.
   * The test above only greps for JOURNEY_STEPS labels, so a header button
   * spelling "Calendar" by hand passed CI while the function that names that
   * page sat one import away. Rename a Tools page and the header would keep
   * the old word with a green build, which is the same failure the path
   * labels had — just in the half nothing was watching.
   */
  it('no module writes a Tools label as a string literal', () => {
    const toolViews = [
      'home', 'spark', 'review', 'insights',
      'calendar', 'clients', 'book', 'settings',
    ]
    const labels = [...new Set(toolViews.map((v) => toolsLabelForView(v)))]
    const offenders = []
    for (const { rel, text } of files) {
      if (!/\.jsx$/.test(rel)) continue
      const c = code(text)
      const hits = labels.filter(
        (l) => c.includes(`>${l}</span>`) || c.includes(`>${l}</button>`)
      )
      if (hits.length) offenders.push(`${rel}: ${hits.join(', ')}`)
    }
    expect(offenders).toEqual([])
  })
})
