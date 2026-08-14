import { describe, expect, it } from 'vitest'
import { buildBrandPackSnapshot } from './exportFiles'
import {
  BRIEF_RESOLVED_WORDS,
  BRIEF_SOURCE_MATERIAL,
  BRIEF_WORD_SOURCES,
  effectiveWord,
} from '../brand/briefWords'

/**
 * WHAT THE SCREEN SAYS IS WHAT SHIPS.
 *
 * `briefWords.js` states the ownership rule for the handful of facts the
 * client answers and the designer may override: the designer's own words win,
 * the client's brief answer fills the gap, and nothing is ever copied from one
 * column into the other. `effectiveWord` is that rule, and Identity's sheet,
 * the Touchpoints specimen and the produced signature all read through it.
 *
 * `buildBrandPackSnapshot` did not. It read the project field directly —
 * `p.voice || ''`, `p.dontUse || ''` — and NONE of those project fields has a
 * writer, because the whole point of `BRIEF_OWNED_WORDS` is that Identity
 * reports them rather than authoring them. So on a project where the client
 * had answered, the app showed their words on screen and shipped `''` in the
 * pack: the brand book's Usage appendix was suppressed entirely (it is gated
 * on `doUse || dontUse`), the Voice page lost its personality line, and the
 * business card printed no contact block — while every screen the designer
 * checked showed the answers present.
 *
 * THIS TEST IS DELIBERATELY A CLASS TEST, NOT SIX INSTANCE TESTS. It iterates
 * `BRIEF_WORD_SOURCES`, so a field added to that map tomorrow is covered the
 * day it is added. The bug it exists to prevent is not "voice went missing" —
 * it is "a brief-owned fact can go missing without anyone noticing", and only
 * a test that enumerates the map can prevent that one.
 */

/**
 * The set under test is `briefWords.js`'s, not this file's.
 *
 * `BRIEF_RESOLVED_WORDS` is every mapping where the brief answer and the
 * designer's field are one fact with two possible authors. `positioning` is
 * excluded there — its brief answer (`usp`) is source material to write FROM,
 * which is why the artboard shows it beneath the box rather than inside it.
 * Both halves are pinned below: the set resolves, and the excluded key does
 * not silently join it.
 */
const KEYS = BRIEF_RESOLVED_WORDS
const EXCLUDED = BRIEF_SOURCE_MATERIAL[0]

/** A brief where the client has answered every question these keys read. */
const answeredBrief = () => {
  const detective = {}
  for (const sourceId of Object.values(BRIEF_WORD_SOURCES)) {
    detective[sourceId] = `client answered ${sourceId}`
  }
  return detective
}

const projectWith = (extra = {}) => ({
  id: 'p1',
  name: 'Sparrow',
  designVersion: 'v1',
  detective: answeredBrief(),
  palette: [],
  ...extra,
})

const packFor = (project) => buildBrandPackSnapshot({ project, mood: [] })

describe('the pack resolves brief-owned words', () => {
  it('has keys to check — this test cannot pass by iterating nothing', () => {
    expect(KEYS.length).toBeGreaterThan(0)
    expect(BRIEF_WORD_SOURCES).toMatchObject({ voice: 'toneOfVoice' })
    /* The exclusion is a decision about a key that IS in the map, not a key
       that happens to be absent. If positioning ever leaves the map, or the
       source-material list empties, this fails and someone re-reads the rule
       rather than silently widening the set. */
    expect(BRIEF_SOURCE_MATERIAL.length).toBeGreaterThan(0)
    expect(EXCLUDED).toBe('positioning')
    expect(BRIEF_WORD_SOURCES).toHaveProperty(EXCLUDED)
    expect(KEYS).not.toContain(EXCLUDED)
    /* And the set is exactly the map minus the material-only keys — no key
       may be dropped from resolution by any other route. */
    expect([...KEYS].sort()).toEqual(
      Object.keys(BRIEF_WORD_SOURCES)
        .filter((k) => !BRIEF_SOURCE_MATERIAL.includes(k))
        .sort()
    )
  })

  it.each(KEYS)('%s agrees with effectiveWord when only the client answered', (key) => {
    const project = projectWith()
    const want = effectiveWord(project, key).value

    /* Not a vacuous pass: the expected value must actually BE the client's
       answer, named by the brief question it came from, so `'' === ''` cannot
       satisfy this assertion. */
    expect(want).toBe(`client answered ${BRIEF_WORD_SOURCES[key]}`)
    expect(want.length).toBeGreaterThan(0)

    expect(packFor(project)[key]).toBe(want)
  })

  it.each(KEYS)('%s lets a designer override win', (key) => {
    const project = projectWith({ [key]: `designer wrote this for ${key}` })
    const want = effectiveWord(project, key).value

    expect(want).toBe(`designer wrote this for ${key}`)
    expect(packFor(project)[key]).toBe(want)
  })

  /* The resolver's own emptiness semantics, not a new rule: `clean()` trims,
     so whitespace is not an override, and `String(v ?? '')` makes null and
     undefined equivalent to absent. The pack must agree with all four. */
  it.each(KEYS)('%s treats blank, whitespace, null and undefined alike', (key) => {
    for (const blank of ['', '   ', null, undefined]) {
      const project = projectWith({ [key]: blank })
      const want = effectiveWord(project, key).value
      expect(want).toBe(`client answered ${BRIEF_WORD_SOURCES[key]}`)
      expect(packFor(project)[key], `override ${JSON.stringify(blank)}`).toBe(want)
    }
  })

  it.each(KEYS)('%s is empty when neither side answered', (key) => {
    const project = projectWith({ detective: {} })
    expect(effectiveWord(project, key).value).toBe('')
    expect(packFor(project)[key]).toBe('')
  })

  /**
   * POSITIONING IS NOT ONE OF THESE, AND MUST NOT BECOME ONE.
   *
   * `briefWords.js` maps `positioning: 'usp'` as SOURCE MATERIAL — the nearest
   * question the brief holds — not as the same fact. The artboard makes the
   * distinction visible: a brief-owned line is read-only with a route to the
   * brief, while positioning is an editable box with the client's answer shown
   * beneath it as the material to write from. If positioning were ever added
   * to `BRIEF_OWNED_WORDS`, the designer's synthesis would silently become a
   * copy of the client's sentence.
   */
  it('does not treat positioning as a brief-owned fact in the pack', () => {
    /* The client HAS answered the question positioning maps to. The pack must
       still ship nothing, because nobody has written a positioning line. */
    const project = projectWith()
    expect(project.detective[BRIEF_WORD_SOURCES[EXCLUDED]]).toBeTruthy()
    expect(effectiveWord(project, EXCLUDED).value).toBeTruthy()
    expect(packFor(project)[EXCLUDED]).toBe('')

    const written = projectWith({ positioning: 'For midwives who answer at 3am' })
    expect(packFor(written)[EXCLUDED]).toBe('For midwives who answer at 3am')
  })
})
