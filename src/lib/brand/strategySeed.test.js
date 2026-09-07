import { describe, expect, it } from 'vitest'
import { attributesFromBrief } from './strategySeed'
import { SPECTRUM_FIELDS } from '../brief/detectiveBrief'
import { AXIS_IDS, strategyProfile } from './alignment'

/**
 * The client answers four positioning questions in the brief. Before this
 * module they were read by exactly one place — the brief's own renderer — so
 * the designer re-answered the same question by hand on five sliders to get
 * the alignment bars to say anything. These tests pin the translation, and
 * pin the two ways it could go wrong: inventing a value nobody gave, and
 * seeding an axis it has no honest reading for.
 */

const idOf = (list, fieldId) => list.find((a) => a.fromBrief === fieldId)

describe('attributesFromBrief', () => {
  it('gives nothing back when no spectrum is answered', () => {
    expect(attributesFromBrief({}, SPECTRUM_FIELDS)).toEqual([])
    expect(attributesFromBrief(null, SPECTRUM_FIELDS)).toEqual([])
    expect(
      attributesFromBrief({ goal: 'Look bigger' }, SPECTRUM_FIELDS)
    ).toEqual([])
  })

  it('places Modern at the modern end of era and Traditional at the classic end', () => {
    const modern = idOf(
      attributesFromBrief(
        { spectrumModernTraditional: 'a' },
        SPECTRUM_FIELDS
      ),
      'spectrumModernTraditional'
    )
    const traditional = idOf(
      attributesFromBrief(
        { spectrumModernTraditional: 'b' },
        SPECTRUM_FIELDS
      ),
      'spectrumModernTraditional'
    )
    // alignment.js: era low = classic, high = modern
    expect(modern.era).toBe(1)
    expect(traditional.era).toBe(0)
  })

  it('places Professional at the formal end and Playful at the casual end', () => {
    const playful = idOf(
      attributesFromBrief(
        { spectrumPlayfulProfessional: 'a' },
        SPECTRUM_FIELDS
      ),
      'spectrumPlayfulProfessional'
    )
    const professional = idOf(
      attributesFromBrief(
        { spectrumPlayfulProfessional: 'b' },
        SPECTRUM_FIELDS
      ),
      'spectrumPlayfulProfessional'
    )
    // alignment.js: formality low = casual, high = formal
    expect(playful.formality).toBe(0)
    expect(professional.formality).toBe(1)
  })

  it('places Bold at the bold end of weight and Minimal at the light end', () => {
    const bold = idOf(
      attributesFromBrief({ spectrumBoldMinimalist: 'a' }, SPECTRUM_FIELDS),
      'spectrumBoldMinimalist'
    )
    const minimal = idOf(
      attributesFromBrief({ spectrumBoldMinimalist: 'b' }, SPECTRUM_FIELDS),
      'spectrumBoldMinimalist'
    )
    expect(bold.weight).toBe(1)
    expect(minimal.weight).toBe(0)
  })

  it('reads the two middle steps rather than rounding them to a pole', () => {
    const mostlyModern = idOf(
      attributesFromBrief(
        { spectrumModernTraditional: 'mostly-a' },
        SPECTRUM_FIELDS
      ),
      'spectrumModernTraditional'
    )
    const balanced = idOf(
      attributesFromBrief(
        { spectrumModernTraditional: 'balanced' },
        SPECTRUM_FIELDS
      ),
      'spectrumModernTraditional'
    )
    expect(mostlyModern.era).toBe(0.75)
    expect(balanced.era).toBe(0.5)
  })

  /**
   * High-end/affordable has no axis, and bending it onto one would assert
   * that expensive means formal — a claim about taste dressed as a reading.
   * `colourAxes.js` applies the same rule to hex values.
   */
  it('does not invent an axis for high-end / affordable', () => {
    const out = attributesFromBrief(
      { spectrumHighEndAffordable: 'a' },
      SPECTRUM_FIELDS
    )
    expect(out).toEqual([])
  })

  it('writes exactly one axis per spectrum, leaving the rest unsaid', () => {
    const out = attributesFromBrief(
      {
        spectrumModernTraditional: 'a',
        spectrumPlayfulProfessional: 'b',
        spectrumBoldMinimalist: 'a',
      },
      SPECTRUM_FIELDS
    )
    expect(out).toHaveLength(3)
    for (const attr of out) {
      const placed = AXIS_IDS.filter(
        (id) => attr[id] !== undefined && attr[id] !== null
      )
      expect(placed).toHaveLength(1)
    }
  })

  it('leaves warmth and energy unset — no spectrum reads them', () => {
    const profile = strategyProfile(
      attributesFromBrief(
        {
          spectrumModernTraditional: 'a',
          spectrumPlayfulProfessional: 'b',
          spectrumBoldMinimalist: 'a',
        },
        SPECTRUM_FIELDS
      )
    )
    expect(profile.warmth.target).toBeNull()
    expect(profile.warmth.voices).toEqual([])
    expect(profile.energy.target).toBeNull()
    expect(profile.era.target).toBe(1)
    expect(profile.formality.target).toBe(1)
    expect(profile.weight.target).toBe(1)
  })

  it('labels each attribute in the client’s own words', () => {
    const out = attributesFromBrief(
      {
        spectrumModernTraditional: 'a',
        spectrumPlayfulProfessional: 'mostly-b',
        spectrumBoldMinimalist: 'balanced',
      },
      SPECTRUM_FIELDS
    )
    const labels = out.map((a) => a.label)
    expect(labels).toContain('Modern')
    expect(labels).toContain('Mostly professional')
    // The midpoint gets both poles — "Both equally" is an answer to a
    // question, not a word a brand can feel like.
    expect(labels).toContain('Bold / minimal')
  })

  it('gives stable ids, so seeding twice cannot duplicate a word', () => {
    const brief = { spectrumBoldMinimalist: 'a' }
    const first = attributesFromBrief(brief, SPECTRUM_FIELDS)
    const second = attributesFromBrief(brief, SPECTRUM_FIELDS)
    expect(first[0].id).toBe(second[0].id)
    expect(first[0].id).toBe('brief:spectrumBoldMinimalist')
  })

  /**
   * These fields were once a 0–100 slider and projects created then still
   * hold numbers. `formatDetectiveAnswer` already reads them rather than
   * printing "42" as an answer; this has to agree with it.
   */
  it('reads legacy 0–100 slider values', () => {
    const low = idOf(
      attributesFromBrief({ spectrumBoldMinimalist: 0 }, SPECTRUM_FIELDS),
      'spectrumBoldMinimalist'
    )
    const high = idOf(
      attributesFromBrief({ spectrumBoldMinimalist: 100 }, SPECTRUM_FIELDS),
      'spectrumBoldMinimalist'
    )
    expect(low.weight).toBe(1) // 0 = pole A = Bold
    expect(high.weight).toBe(0) // 100 = pole B = Minimal
  })

  it('ignores a value it cannot read rather than guessing', () => {
    expect(
      attributesFromBrief({ spectrumBoldMinimalist: 'wat' }, SPECTRUM_FIELDS)
    ).toEqual([])
    expect(
      attributesFromBrief({ spectrumBoldMinimalist: 400 }, SPECTRUM_FIELDS)
    ).toEqual([])
  })

  it('only reads spectrum fields that actually exist in the brief schema', () => {
    // Guards the seed against a renamed or removed spectrum: the mapping is
    // keyed by field id, and a stale key would silently seed nothing.
    const mapped = attributesFromBrief(
      Object.fromEntries(SPECTRUM_FIELDS.map((f) => [f.id, 'a'])),
      SPECTRUM_FIELDS
    )
    expect(mapped.length).toBe(3)
    expect(SPECTRUM_FIELDS.length).toBe(4)
  })
})

/**
 * The client's own words — "three words" and "how should people feel" —
 * become strategy words. Before this, the same question was asked of the
 * designer again, in an empty box, on the same page.
 */
import {
  splitBriefWords,
  wordsFromBrief,
  strategyFromBrief,
  WORD_SOURCES,
} from './strategySeed'

describe('wordsFromBrief', () => {
  it('reads exactly the two brief questions whose answers are words', () => {
    expect([...WORD_SOURCES]).toEqual(['toneOfVoice', 'feel'])
  })

  it('splits a three-word answer into three words, in the client’s casing', () => {
    const words = wordsFromBrief({ toneOfVoice: '“Quick, honest, no nonsense”' })
    expect(words.map((w) => w.label)).toEqual(['Quick', 'honest', 'no nonsense'])
    expect(words.every((w) => w.fromBrief === 'toneOfVoice')).toBe(true)
  })

  it('splits on "and" but leaves a sentence alone', () => {
    expect(splitBriefWords('warm and welcoming')).toEqual(['warm', 'welcoming'])
    expect(
      splitBriefWords('they should feel like they can really trust us')
    ).toEqual([])
  })

  it('places a known adjective on one axis and marks it as a rough placement', () => {
    const [warm] = wordsFromBrief({ feel: 'warm' })
    expect(warm.warmth).toBeCloseTo(0.9)
    expect(warm.suggested).toBe(true)
    const spoken = AXIS_IDS.filter((a) => warm[a] !== undefined)
    expect(spoken).toEqual(['warmth'])
  })

  it('never claims a pole — a lexicon cannot know how warm THIS warm is', () => {
    for (const w of wordsFromBrief({
      feel: 'warm, cool, bold, light, modern, classic, playful, formal, calm, energetic',
    })) {
      for (const a of AXIS_IDS) {
        if (w[a] === undefined) continue
        expect(w[a]).toBeGreaterThan(0)
        expect(w[a]).toBeLessThan(1)
      }
    }
  })

  it('gives an unknown word no axes at all rather than guessing', () => {
    const [honest] = wordsFromBrief({ toneOfVoice: 'honest' })
    expect(honest.label).toBe('honest')
    expect(honest.suggested).toBeUndefined()
    for (const a of AXIS_IDS) expect(honest[a]).toBeUndefined()
  })

  it('credits the same word to one question only', () => {
    const words = wordsFromBrief({ toneOfVoice: 'Warm', feel: 'warm, calm' })
    expect(words.map((w) => w.id)).toEqual([
      'brief:toneOfVoice:warm',
      'brief:feel:calm',
    ])
  })

  it('gives stable ids, so seeding twice cannot duplicate a word', () => {
    const a = wordsFromBrief({ feel: 'reassured, curious' })
    const b = wordsFromBrief({ feel: 'reassured, curious' })
    expect(a.map((w) => w.id)).toEqual(b.map((w) => w.id))
  })

  it('strategyFromBrief puts the spectrums first and the words after', () => {
    const all = strategyFromBrief(
      { spectrumBoldMinimalist: 'a', feel: 'calm' },
      SPECTRUM_FIELDS
    )
    expect(all.map((x) => x.id)).toEqual([
      'brief:spectrumBoldMinimalist',
      'brief:feel:calm',
    ])
    expect(strategyFromBrief({}, SPECTRUM_FIELDS)).toEqual([])
  })
})
