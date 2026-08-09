import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore, { TEMPLATE_STYLE_KEYS } from '../../store/useAppStore'
import { nextPair, sampleById, samplesInCategory, differingTraits } from './samples'
import { discoveryObservations, MIN_CHOICES } from './observations'
import { isFavorite, isSharedWithClient } from '../brand/favorites'
import { makeRef, parseRefKey, resolveSampleRef, ARTIFACT_KINDS } from '../artifacts/artifactRef'
import { sampleIndex } from './samples'
import { DETECTIVE_CHAPTERS } from '../brief/detectiveBrief'

/**
 * Visual Discovery: show two things, record which was preferred, report only
 * what the choices actually support.
 *
 * The failure this feature must never have is the confident summary. Telling
 * someone "your brand personality is sophisticated" from five clicks is the
 * thing that makes a tool feel like it is guessing about you.
 */

const fresh = () => {
  useAppStore.getState().clearToEmpty()
  return useAppStore.getState().createNewProject('Discovery test')
}
const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)
const key = (id) => `sample:${id}`

/** Choose the first of a differing pair, n times, in one category. */
function run(category, n) {
  const seen = []
  for (let i = 0; i < n; i += 1) {
    const pair = nextPair(category, 1234, i, seen)
    if (!pair) break
    seen.push(pair[0].id, pair[1].id)
    s().recordDiscoveryChoice({
      category,
      shown: pair.map((x) => key(x.id)),
      chose: key(pair[0].id),
    })
  }
}

describe('a comparison records what was chosen', () => {
  beforeEach(fresh)

  it('records the selected example', () => {
    const [a, b] = nextPair('type', 1, 0, [])
    s().recordDiscoveryChoice({
      category: 'type',
      shown: [key(a.id), key(b.id)],
      chose: key(a.id),
    })
    const [c] = cur().visualDiscovery.choices
    expect(c.chose).toBe(key(a.id))
    expect(c.category).toBe('type')
  })

  it('does not record the unselected example as selected', () => {
    const [a, b] = nextPair('type', 1, 0, [])
    s().recordDiscoveryChoice({
      category: 'type',
      shown: [key(a.id), key(b.id)],
      chose: key(a.id),
    })
    const [c] = cur().visualDiscovery.choices
    expect(c.chose).not.toBe(key(b.id))
    expect(c.shown).toContain(key(b.id))
  })

  it('refuses a choice that was never on screen', () => {
    const [a, b] = nextPair('type', 1, 0, [])
    s().recordDiscoveryChoice({
      category: 'type',
      shown: [key(a.id), key(b.id)],
      chose: key('type:not-shown:400'),
    })
    expect(cur().visualDiscovery.choices).toHaveLength(0)
  })

  it('references the sample rather than copying it', () => {
    const [a, b] = nextPair('color', 9, 0, [])
    s().recordDiscoveryChoice({
      category: 'color',
      shown: [key(a.id), key(b.id)],
      chose: key(a.id),
    })
    const json = JSON.stringify(cur().visualDiscovery)
    // No hexes, no family names, no bytes — just ids.
    expect(json).not.toContain(a.hex)
    expect(json).not.toMatch(/data:/)
    expect(parseRefKey(cur().visualDiscovery.choices[0].chose).kind).toBe('sample')
  })

  it('resolves a reference back to the sample, and null when it is gone', () => {
    const [a] = nextPair('type', 1, 0, [])
    expect(resolveSampleRef(sampleIndex(), makeRef('sample', a.id)).family).toBe(a.family)
    expect(resolveSampleRef(sampleIndex(), makeRef('sample', 'type:ghost:400'))).toBeNull()
    expect(sampleById('nope')).toBeNull()
    expect(ARTIFACT_KINDS.sample.stored).toBe(true)
  })
})

describe('it does not claim more than the choices show', () => {
  beforeEach(fresh)

  it('says nothing on an empty project', () => {
    const o = discoveryObservations(cur())
    expect(o.enough).toBe(false)
    expect(o.lines).toEqual([])
  })

  it('is safe on a project that has no discovery data at all', () => {
    expect(() => discoveryObservations({})).not.toThrow()
    expect(discoveryObservations({}).lines).toEqual([])
    expect(discoveryObservations(null).enough).toBe(false)
  })

  it('four choices are not a pattern', () => {
    expect(MIN_CHOICES).toBeGreaterThan(4)
    run('type', 4)
    expect(cur().visualDiscovery.choices.length).toBeGreaterThan(0)
    expect(discoveryObservations(cur()).enough).toBe(false)
  })

  it('ignores a comparison where the two did not differ', () => {
    // Two identical samples teach nothing; counting them would manufacture a
    // lean out of noise.
    const [a] = nextPair('type', 1, 0, [])
    for (let i = 0; i < 8; i += 1)
      s().recordDiscoveryChoice({
        category: 'type',
        shown: [key(a.id), key(a.id)],
        chose: key(a.id),
      })
    expect(discoveryObservations(cur()).enough).toBe(false)
  })

  it('reports in facts, never in personality', () => {
    run('type', 12)
    const o = discoveryObservations(cur())
    for (const line of o.lines) {
      expect(line).toMatch(/\d+ of \d+/)
      expect(line.toLowerCase()).not.toMatch(
        /personality|sophisticated|authentic|adventurous|you are|your brand is/
      )
    }
  })

  it('every reported line is backed by a real majority', () => {
    run('color', 14)
    for (const line of discoveryObservations(cur()).lines) {
      const [, n, of] = line.match(/(\d+) of (\d+)/).map(Number)
      expect(n / of).toBeGreaterThanOrEqual(0.65)
      expect(n - (of - n)).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('agreement is not a decision', () => {
  beforeEach(fresh)

  it('records the verdict and nothing else', () => {
    run('type', 12)
    const before = { ...cur() }
    s().setDiscoveryVerdict('accepted')
    const after = cur()
    expect(after.visualDiscovery.verdict.status).toBe('accepted')
    // No brand field moved: agreeing with an observation is not choosing a
    // typeface, a palette or a strategy attribute.
    for (const f of ['typeHeading', 'typeBody', 'palette', 'tagline', 'strategyAttributes'])
      expect(after[f]).toEqual(before[f])
  })

  it('a new choice retires an old agreement', () => {
    run('type', 12)
    s().setDiscoveryVerdict('accepted')
    run('color', 1)
    expect(cur().visualDiscovery.verdict).toBeNull()
  })

  it('creates no brief field', () => {
    const ids = DETECTIVE_CHAPTERS.flatMap((c) => c.fields.map((f) => f.id))
    for (const id of ids) expect(id).not.toMatch(/discovery/i)
    run('type', 6)
    // And the brief's own answers are untouched by any of it.
    expect(cur().detective?.spectrumModernTraditional ?? '').toBe('')
  })
})

describe('favorites stay what Phase 1 made them', () => {
  beforeEach(fresh)

  it('favoriting a sample never puts it in the client pack', () => {
    /* No `addMoodPin` here any more, deliberately. This test used to create
       the pin itself and then favorite it, which quietly asserted the one
       thing the app could not do: the heart in Visual Discovery called
       `toggleFavorite('sample:…')` against a pin nothing ever created, so the
       click did nothing and the test still passed. Phase 5 made the store
       upsert the pin, so the real path is now what runs here. */
    s().toggleFavorite('sample:type:fraunces:700', true)
    const pin = s().moodItems.find((m) => m.id === 'sample:type:fraunces:700')
    expect(isFavorite(pin)).toBe(true)
    expect(isSharedWithClient(pin)).toBe(false)
  })

  it('existing favorites survive a discovery session', () => {
    s().addMoodPin({ id: 42, type: 'image', visual: 'y' })
    s().toggleFavorite(42, true)
    run('type', 8)
    expect(isFavorite(s().moodItems.find((m) => m.id === 42))).toBe(true)
  })
})

describe('the registry', () => {
  it('is built from what the repo already has', () => {
    expect(samplesInCategory('type').length).toBeGreaterThan(20)
    expect(samplesInCategory('color').length).toBeGreaterThan(4)
  })

  it('only offers pairs that differ on something', () => {
    for (let i = 0; i < 10; i += 1) {
      for (const cat of ['type', 'color']) {
        const pair = nextPair(cat, 7, i, [])
        if (pair) expect(differingTraits(pair[0], pair[1]).length).toBeGreaterThan(0)
      }
    }
  })

  it('is deterministic — a pair does not change under a re-render', () => {
    expect(nextPair('type', 5, 2, []).map((x) => x.id)).toEqual(
      nextPair('type', 5, 2, []).map((x) => x.id)
    )
  })

  it('says nothing rather than inventing warmth for a grey', () => {
    const grey = samplesInCategory('color').find((c) => c.hex === '#1C1917')
    expect(grey.traits.warmth).toBeNull()
  })
})

describe('it is a project’s own log', () => {
  it('a template may not carry another project’s choices', () => {
    expect(TEMPLATE_STYLE_KEYS).not.toContain('visualDiscovery')
  })

  it('starting over clears the log and touches nothing else', () => {
    fresh()
    run('type', 6)
    s().updateBrandField('tagline', 'Quiet confidence')
    s().clearDiscovery()
    expect(cur().visualDiscovery.choices).toEqual([])
    expect(cur().tagline).toBe('Quiet confidence')
  })
})
