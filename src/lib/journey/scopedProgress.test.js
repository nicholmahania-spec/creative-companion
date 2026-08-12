import { describe, expect, it } from 'vitest'
import { progressItemInScope } from '../brief/detectiveBrief'
import { brandProgressSummary } from '../beforeAfter'
import { packReadiness } from '../book/exportFiles'

/**
 * A logo-only job must read as finished when the logo is finished.
 *
 * The app already knows the job is logo-only: the client picked logoPrimary in
 * the brief's deliverablesPicked, and that field existed and was read by a gate
 * long before this. What nothing did was let progress or readiness READ it — so
 * both counters measured against colours, tagline, voice and a 21-page book the
 * client never bought, and a done job showed "3 to go" / "Ready · 4/8". "3 to
 * go" on finished work is a blame signal with no valid action behind it, and a
 * fraction is the one representation this user has said does not register.
 *
 * The fix is a pure read of existing scope, with two invariants worth pinning:
 * a finished in-scope job reads done, and an UNSCOPED (empty-brief or
 * full-identity) job is unchanged, so the common case cannot regress.
 */
describe('progressItemInScope', () => {
  it('drops colours/tagline/voice for a logo-only brief', () => {
    const picked = ['logoPrimary']
    expect(progressItemInScope('logo', picked)).toBe(true)
    expect(progressItemInScope('palette', picked)).toBe(false)
    expect(progressItemInScope('tagline', picked)).toBe(false)
    expect(progressItemInScope('voice', picked)).toBe(false)
  })

  it('keeps everything for a full-identity brief', () => {
    const picked = ['guidelines']
    for (const id of ['logo', 'palette', 'tagline', 'voice']) {
      expect(progressItemInScope(id, picked)).toBe(true)
    }
  })

  it('counts everything when no brief has been filled (safe default)', () => {
    for (const id of ['logo', 'palette', 'tagline', 'voice']) {
      expect(progressItemInScope(id, [])).toBe(true)
      expect(progressItemInScope(id, undefined)).toBe(true)
    }
  })

  it('always counts process items and the logo, regardless of scope', () => {
    const picked = ['logoPrimary']
    for (const id of ['detective', 'pins', 'brief', 'handoff', 'learnings', 'logo']) {
      expect(progressItemInScope(id, picked)).toBe(true)
    }
  })
})

describe('brandProgressSummary is scoped', () => {
  it('a finished logo-only job has nothing left and reads done', () => {
    const project = {
      logoImage: 'data:image/png;base64,AAAA',
      detective: { deliverablesPicked: ['logoPrimary'] },
      // colours/tagline/voice absent — but they are out of scope, so irrelevant
    }
    const s = brandProgressSummary(project)
    expect(s.remainingLabels).toEqual([])
    expect(s.allDone).toBe(true)
    // No "N to go" is possible when nothing remains.
    expect(s.total).toBe(s.doneCount)
  })

  it('a full-identity job with only a logo still shows the rest as remaining', () => {
    const project = {
      logoImage: 'data:image/png;base64,AAAA',
      detective: { deliverablesPicked: ['guidelines'] },
    }
    const s = brandProgressSummary(project)
    expect(s.allDone).toBe(false)
    expect(s.remainingLabels.length).toBeGreaterThan(0)
  })
})

describe('packReadiness is scoped', () => {
  it('does not demand book fields on a logo-only pack', () => {
    const pack = {
      projectName: 'Backline Trade',
      detective: {
        deliverablesPicked: ['logoPrimary'],
        goal: 'Sell reclaimed kitchen kit',
      },
      pins: [{ id: 1, inPack: true }],
      handoffNote: 'Files attached.',
      // no tagline, palette or voice — out of scope for logo-only
    }
    const r = packReadiness(pack)
    const ids = r.checks.map((c) => c.id)
    expect(ids).not.toContain('tagline')
    expect(ids).not.toContain('palette')
    expect(ids).not.toContain('voice')
  })

  it('still demands book fields on a full-identity pack', () => {
    const pack = {
      projectName: 'Backline Trade',
      detective: { deliverablesPicked: ['guidelines'], goal: 'x' },
    }
    const ids = packReadiness(pack).checks.map((c) => c.id)
    expect(ids).toContain('tagline')
    expect(ids).toContain('palette')
    expect(ids).toContain('voice')
  })

  /* The two counters must scope from the SAME field. If they ever read
     different sources, a job could read done on one surface and unfinished on
     another — the exact two-surfaces-drift this codebase keeps recording. */
  it('scopes from the same deliverablesPicked the chip uses', () => {
    const picked = ['logoPrimary']
    /* ONE job, read by both counters. The pack side used to be handed a
       project with no `logoImage` while the chip side got one, and the pair
       still agreed — because `packReadiness` did not look at the mark at all,
       so it could not disagree about it. That made the assertion below true
       for the wrong reason: it was comparing two different jobs and proving
       only that one of the two counters was not paying attention.

       `packReadiness` now consults `deliverableChecklist`, which asks
       `packagePlan` whether the bought logo can actually be packaged. So the
       fixture has to be a single job to test what this test says it tests —
       and with the mark present, both counters read done for the same reason
       rather than for none. A real data URL, not 'x': the plan reads the mark
       through `markSource`, which will not call an unparseable string a file. */
    const logoImage = 'data:image/svg+xml;base64,PHN2Zy8+'
    const chipCounts = brandProgressSummary({
      logoImage,
      detective: { deliverablesPicked: picked },
    }).allDone
    const packDone = packReadiness({
      projectName: 'p',
      logoImage,
      detective: { deliverablesPicked: picked, goal: 'g' },
      pins: [{ inPack: true }],
      handoffNote: 'h',
    }).allDone
    // Both derive "done" from the same logo-only scope; neither should be
    // dragged incomplete by an out-of-scope book field.
    expect(chipCounts).toBe(true)
    expect(packDone).toBe(true)
  })

  /* The other half of the same invariant, and the one that could not be
     written before: the two counters must also agree that an UNFINISHED job is
     unfinished. A logo-only brief with no mark is the case that used to read
     "Ready" on the pack while the chip said otherwise. */
  it('agrees with the chip that a logo-only job with no mark is not done', () => {
    const picked = ['logoPrimary']
    expect(
      brandProgressSummary({ detective: { deliverablesPicked: picked } }).allDone
    ).toBe(false)
    expect(
      packReadiness({
        projectName: 'p',
        detective: { deliverablesPicked: picked, goal: 'g' },
        pins: [{ inPack: true }],
        handoffNote: 'h',
      }).allDone
    ).toBe(false)
  })
})
