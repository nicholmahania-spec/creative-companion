import { describe, expect, it } from 'vitest'
import {
  consolidateDiscovery,
  DISCOVERY_TO_DETECTIVE,
  DISCOVERY_DEFERRED,
} from './discoveryConsolidation'

/**
 * Real user data, moved once and never overwritten.
 *
 * The consolidation copies the eighteen Discovery answers with a proven
 * canonical home into `detective`. Everything it must NOT do is the point:
 * it must not overwrite an answer the designer already gave, must not touch
 * the historical object it read from, and must not turn a free-text spectrum
 * answer into a position on a five-point scale the client never used.
 */
const project = (over = {}) => ({ id: 'p1', name: 'Harbor', detective: {}, discoveryAnswers: {}, ...over })

describe('discovery consolidation', () => {
  it('maps exactly the eighteen approved fields and no others', () => {
    /* Seventeen into `detective`, plus `projectTitle` into the project's own
       name, which is not a detective field and never was. */
    expect(Object.keys(DISCOVERY_TO_DETECTIVE)).toHaveLength(17)
    /* The pair that must never be joined: Discovery `usp` is differentiation,
       canonical `usp` asks what the business does — which is `offering`. */
    expect(DISCOVERY_TO_DETECTIVE.offering).toBe('usp')
    expect(DISCOVERY_TO_DETECTIVE).not.toHaveProperty('usp')
    expect(DISCOVERY_DEFERRED).toContain('usp')
  })

  it('1. fills canonical from a Discovery-only value', () => {
    const out = consolidateDiscovery(
      project({ discoveryAnswers: { targetAudience: 'Coastal families' } })
    )
    expect(out.detective.audience).toBe('Coastal families')
  })

  it('2. leaves a canonical-only value alone', () => {
    const out = consolidateDiscovery(
      project({ detective: { audience: 'Studio owners' } })
    )
    expect(out.detective.audience).toBe('Studio owners')
  })

  it('3. is a no-op when both hold the same value', () => {
    const p = project({
      detective: { feel: 'Warm' },
      discoveryAnswers: { desiredFeeling: 'Warm' },
    })
    /* Identical to the object it was given — nothing to write. */
    expect(consolidateDiscovery(p)).toBe(p)
  })

  it('4. keeps canonical truth when the two disagree', () => {
    /* The precedence `mergeDiscoveryAnswers` has always used: an answer the
       studio already gave outranks one arriving from anywhere else. */
    const out = consolidateDiscovery(
      project({
        detective: { avoid: 'No serif' },
        discoveryAnswers: { elementsToAvoid: 'No script' },
      })
    )
    expect(out.detective.avoid).toBe('No serif')
    /* And the losing value is not destroyed — it stays readable where it was. */
    expect(out.discoveryAnswers.elementsToAvoid).toBe('No script')
  })

  it('5. ignores missing, empty and whitespace values', () => {
    const p = project({
      discoveryAnswers: { story: '', competitors: '   ', budgetRange: undefined },
    })
    expect(consolidateDiscovery(p)).toBe(p)
    expect(consolidateDiscovery(project()).detective).toEqual({})
    expect(consolidateDiscovery(null)).toBe(null)
  })

  it('6. leaves every deferred field exactly where it was', () => {
    const answers = {
      usp: 'We deliver in 48 hours',
      startDeadline: 'Start May, done by August',
      launchDate: 'Ideally September',
      fiveYearVision: 'Three more sites',
      admiredBrands: 'Aesop, Muji',
      problem: 'Nobody can find us',
      coreValues: 'Care, candour',
      visualStyleKeywords: 'Quiet, warm',
    }
    const out = consolidateDiscovery(project({ discoveryAnswers: answers }))
    expect(out.discoveryAnswers).toEqual(answers)
    /* None of them reached the canonical model under any name. */
    expect(out.detective).toEqual({})
  })

  it('7. never converts a free-text spectrum answer', () => {
    /* Canonical spectra accept `a | mostly-a | balanced | mostly-b | b` and
       nothing else. Turning "quite modern" into one of those would invent a
       position the client never gave — and the shape guard blocks it even if
       the map were edited to try. */
    const answers = {
      spectrumModernTraditional: 'quite modern',
      spectrumPlayfulProfessional: '7/10 playful',
      spectrumHighEndAffordable: 'mid',
      spectrumBoldMinimalist: 'bold-ish',
    }
    const out = consolidateDiscovery(project({ discoveryAnswers: answers }))
    expect(out.discoveryAnswers).toEqual(answers)
    for (const k of Object.keys(answers)) expect(out.detective[k]).toBeUndefined()
  })

  it('8. copies rather than moves — the history stays whole', () => {
    const answers = { targetAudience: 'Coastal families', problem: 'Nobody can find us' }
    const out = consolidateDiscovery(project({ discoveryAnswers: answers }))
    expect(out.detective.audience).toBe('Coastal families')
    /* The mapped field is still in the historical object too: the notes
       surface and the markdown hand-off both read from it. */
    expect(out.discoveryAnswers.targetAudience).toBe('Coastal families')
    expect(out.discoveryAnswers).toEqual(answers)
  })

  it('takes projectTitle only when the project has no name', () => {
    expect(
      consolidateDiscovery(project({ name: 'Harbor', discoveryAnswers: { projectTitle: 'Hearth' } })).name
    ).toBe('Harbor')
    expect(
      consolidateDiscovery(project({ name: '', discoveryAnswers: { projectTitle: 'Hearth' } })).name
    ).toBe('Hearth')
  })

  it('is idempotent — a second run changes nothing', () => {
    const p = project({
      detective: { avoid: 'No serif' },
      discoveryAnswers: {
        targetAudience: 'Coastal families',
        desiredFeeling: 'Warm',
        elementsToAvoid: 'No script',
        offering: 'We roast coffee',
        fileFormats: 'SVG, PDF',
        spectrumBoldMinimalist: 'bold-ish',
        usp: 'We deliver in 48 hours',
      },
    })
    const once = consolidateDiscovery(p)
    const twice = consolidateDiscovery(once)
    expect(twice).toEqual(once)
    /* Not merely equal: the second run finds every target filled and has
       nothing to write, so it hands back the very same object. */
    expect(twice).toBe(once)
    expect(once.detective.usp).toBe('We roast coffee')
    expect(once.detective.technical).toBe('SVG, PDF')
  })
})
