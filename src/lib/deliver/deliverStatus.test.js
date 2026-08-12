/**
 * DELIVERY MAY ONLY CLAIM WHAT IS ACTUALLY PACKAGEABLE.
 *
 * `packReadiness` knows, since pass 2, that a bought deliverable with no
 * eligible file in the package means the job is not ready. The Delivery screen
 * did not say so: `allDone` went false and the status line fell through to
 * "Preview the book, then download", which reads as approval — while the
 * package panel a few inches below named the missing item exactly.
 *
 * These pin the claim, not the markup. The readiness result is the only input;
 * there is no second calculation to keep in step.
 */
import { describe, expect, it } from 'vitest'
import { deliverStatusLine } from './deliverStatus'
import { buildBrandPackSnapshot, packReadiness } from '../book/exportFiles'
import { packagePlan } from './packagePlan'

const packFor = (project) =>
  buildBrandPackSnapshot({
    project,
    moodItems: [{ id: 'p1', inPack: true, visual: 'data:image/png;base64,AAAA' }],
    palette: project.palette,
  })

/** Bought a business card; nothing eligible in the package to satisfy it. */
const BOUGHT_NOT_BUILT = {
  name: 'Sparrow',
  tagline: 'Small bird, big nerve',
  voice: 'Warm, plain, unfussy',
  palette: ['#1B4C7E', '#FAFAF9'],
  logoImage: 'data:image/svg+xml;base64,PHN2Zy8+',
  handoffNote: 'Everything is in the folder.',
  learnings: 'Round two was the one.',
  detective: {
    goal: 'Open a second shop',
    audience: 'Locals',
    deliverablesPicked: ['logoPrimary', 'businessCard'],
  },
  packageAssets: [],
}

describe('a bought deliverable with no production file', () => {
  const pack = packFor(BOUGHT_NOT_BUILT)
  const ready = packReadiness(pack)

  it('is not ready', () => {
    expect(ready.allDone).toBe(false)
    expect(ready.deliverableGaps.map((d) => d.id)).toEqual(['businessCard'])
  })

  it('says which item is missing, rather than going quiet', () => {
    const line = deliverStatusLine(ready, null, 0)
    expect(line).toBe('Not in the package yet · Business cards')
    // The failure this replaces: silence that reads as approval.
    expect(line).not.toBe('Preview the book, then download')
    expect(line).not.toBe('Ready to ship')
  })

  it('names the same noun the package panel prints', () => {
    const plan = packagePlan(pack, { assets: pack.packageAssets })
    const row = ready.deliverables.find((d) => d.id === 'businessCard')
    expect(deliverStatusLine(ready, null, 0)).toContain(row.label)
    // …and the plan agrees there is nothing there to satisfy it.
    expect(plan.folders.flatMap((f) => f.files).some((f) => f.deliverable === 'businessCard'))
      .toBe(false)
  })

  /* An accepted mock is evidence of work and never a file. It must not move
     this line, because production truth is packageAssets + packagePlan
     eligibility and nothing else. */
  it('an accepted mock does not make it ready', () => {
    const mocked = {
      ...BOUGHT_NOT_BUILT,
      touchpointApps: { businessCard: { done: true, note: 'Signed off', check: { readable: true } } },
    }
    const mockedReady = packReadiness(packFor(mocked))
    expect(mockedReady.allDone).toBe(false)
    expect(deliverStatusLine(mockedReady, null, 0)).toBe(
      'Not in the package yet · Business cards'
    )
  })

  /* Nor does a file the designer may not hand over. `packagePlan` holds it
     back on rights and the plan is what the checklist reads. */
  it('a rights-excluded file does not make it ready', () => {
    const restricted = {
      ...BOUGHT_NOT_BUILT,
      packageAssets: [
        {
          id: 'bc',
          name: 'Licensed card template',
          dataUrl: 'data:application/pdf;base64,JVBERi0=',
          group: 'application',
          item: 'businessCard',
          deliverable: 'businessCard',
          rights: 'thirdParty',
        },
      ],
    }
    const restrictedReady = packReadiness(packFor(restricted))
    expect(deliverStatusLine(restrictedReady, null, 0)).toBe(
      'Not in the package yet · Business cards'
    )
  })

  it('a real produced file does make it ready', () => {
    const built = {
      ...BOUGHT_NOT_BUILT,
      packageAssets: [
        {
          id: 'bc',
          name: 'Sparrow business card',
          dataUrl: 'data:application/pdf;base64,JVBERi0=',
          group: 'application',
          item: 'businessCard',
          deliverable: 'businessCard',
          rights: 'clientOwned',
        },
      ],
    }
    const builtReady = packReadiness(packFor(built))
    expect(builtReady.deliverableGaps).toEqual([])
    expect(builtReady.allDone).toBe(true)
    expect(deliverStatusLine(builtReady, null, 0)).toBe('Ready to ship')
  })
})

describe('the rest of the line is unchanged', () => {
  const none = { allDone: false, deliverableGaps: [] }

  it('still names an unfilled core check when there is no package gap', () => {
    expect(deliverStatusLine(none, { label: 'Palette' }, 1)).toBe('Still to add · Palette')
  })

  it('still asks for a handoff note when only polish is missing', () => {
    expect(deliverStatusLine(none, null, 1)).toBe('Add a handoff note when you ship')
  })

  it('still invites a preview when nothing is outstanding', () => {
    expect(deliverStatusLine(none, null, 0)).toBe('Preview the book, then download')
  })

  it('says ready when readiness says ready', () => {
    expect(deliverStatusLine({ allDone: true, deliverableGaps: [] }, null, 0)).toBe('Ready to ship')
  })

  /* A package gap outranks a core gap: the client not getting what they paid
     for is a bigger fact than an unwritten field. */
  it('puts the package gap ahead of a core gap', () => {
    const both = { allDone: false, deliverableGaps: [{ id: 'businessCard', label: 'Business cards' }] }
    expect(deliverStatusLine(both, { label: 'Palette' }, 2)).toBe(
      'Not in the package yet · Business cards'
    )
  })

  it('survives a readiness result it does not recognise', () => {
    expect(deliverStatusLine(null, null, 0)).toBe('Preview the book, then download')
    expect(deliverStatusLine({}, null, 0)).toBe('Preview the book, then download')
  })
})
