/**
 * Finishing the path must be possible.
 *
 * The completion gates hard-coded `>= 7` — a literal that happened to match
 * an older stop count — while the rows they counted came from JOURNEY_STEPS,
 * which had five at the time. So `doneCount` topped out at 5 against a
 * threshold of 7: `pathFull` and `packReady` were unreachable, the home badge
 * could only ever read "Next", and a finished project displayed 5/7.
 *
 * For a tool whose whole reward is the completion signal, that removed the
 * payoff entirely — and nothing failed, because an unreachable state looks
 * exactly like a state you haven't reached yet.
 *
 * These tests are about the RELATIONSHIP, not the number. Asserting "the path
 * has 5 stops" would just be another copy of what journey.js declares, and
 * would fail the next time the path legitimately changes length.
 */
import { describe, it, expect } from 'vitest'
import { JOURNEY_STEPS, PATH_STEP_COUNT } from './journey'
import { pathProgressSummary } from './journeyProgress'
import {
  DOCUMENT_KIND_BOOK,
  DTPL_BUILTIN_BOOK,
} from '../documents/documentModel'

/**
 * A context in which every stop genuinely counts as done — derived from the
 * real rules in journeyProgress.js, not guessed:
 *   define    all required brief fields filled (getDetectiveProgress)
 *   research  every starred pin has a "why"
 *   ideate    a titled direction, a rough idea, or a spark pin
 *   design    mark or wordmark PLUS words or non-stock colour (not tagline alone)
 *   sketch    at least one touchpointApps note / mock accept / colour sample
 *   book      the Book Document exists (the builder was opened)
 *   deliver   a handoff note or learnings (evidence only — not delivered)
 *
 * `ideate` and `book` joined the path on 2026-08-09. The fixture gained the
 * two fields their rules read; nothing else about this file changed, which is
 * the point of asserting the relationship rather than the number.
 */
const everythingDone = {
  project: {
    name: 'Done',
    detective: {
      clientName: 'Harbor & Hearth',
      engagementType: 'new',
      goal: 'Launch the brand',
      audience: 'Coastal homeowners',
      deliverablesPicked: ['logo'],
      brandWords: 'warm, coastal',
    },
    directions: [{ id: 'a', title: 'Harbor light' }],
    logoWordmark: 'Harbor',
    tagline: 'Coastal and warm',
    touchpointApps: { website: { note: 'Hero uses the wordmark' } },
    /* The Book Document is what proves the builder was opened —
       `ensureBookDocument` writes it and only BrandBookBuilderView calls that.
       This fixture used to carry `bookBuilder` instead, which
       `createBlankProject` seeds on EVERY project, so the rule it was
       exercising was true for a project nobody had touched. */
    document: {
      documentId: 'doc_fixture_book',
      kind: DOCUMENT_KIND_BOOK,
      templateId: DTPL_BUILTIN_BOOK,
      overrides: {},
      composition: [],
    },
    handoffNote: 'Everything is in the pack.',
  },
  tasks: [],
  moodItems: [{ type: 'image', inPack: true, note: 'the light' }],
  sparkIndex: 3,
  palette: ['#1C1917', '#0F766E'],
}

describe('path completion', () => {
  it('PATH_STEP_COUNT tracks the journey, it does not restate it', () => {
    expect(PATH_STEP_COUNT).toBe(JOURNEY_STEPS.length)
  })

  it('the summary yields exactly one row per stop', () => {
    /* This is what makes a threshold above PATH_STEP_COUNT unreachable:
       doneCount can never exceed the number of rows. */
    const rows = pathProgressSummary(JOURNEY_STEPS, everythingDone)
    expect(rows).toHaveLength(PATH_STEP_COUNT)
  })

  it('a fully worked project actually satisfies the gate', () => {
    const rows = pathProgressSummary(JOURNEY_STEPS, everythingDone)
    const doneCount = rows.filter((r) => r.done).length
    /* Names the unfinished stops on failure, so a fixture that drifts out of
       step with the rules says which rule it missed. */
    expect(rows.filter((r) => !r.done).map((r) => r.id)).toEqual([])
    expect(doneCount).toBe(PATH_STEP_COUNT)
    /* The gate App.jsx applies. Against the old literal 7 this was false even
       with every stop satisfied — which is the whole bug. */
    expect(doneCount >= PATH_STEP_COUNT).toBe(true)
  })

  it('no threshold above the number of stops can ever be met', () => {
    const rows = pathProgressSummary(JOURNEY_STEPS, everythingDone)
    const doneCount = rows.filter((r) => r.done).length
    const staleThreshold = PATH_STEP_COUNT + 2 // what `>= 7` was against 5
    expect(doneCount >= staleThreshold).toBe(false)
  })
})
