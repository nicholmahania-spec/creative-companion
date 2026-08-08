import { describe, expect, it } from 'vitest'
import {
  buildJsonTokens,
  logoDefaultsNote,
  logoRuleDefaults,
  LOGO_RULE_KEYS,
  DEFAULT_LOGO_MIN_SIZE,
  DEFAULT_LOGO_CLEARSPACE,
  DEFAULT_LOGO_DONTS,
} from '../brandSystem'

/**
 * `tokens.json` must not assert a rule nobody chose.
 *
 * THE DEFECT. Handover refuses to pre-fill a minimum mark size, on the stated
 * grounds that a legibility floor is a property of one particular mark and a
 * pre-filled number would be a measurement the app invented. Every prose
 * export honors that: `Logo_Usage.txt`, `brand.md` and the brand book all
 * print the default AND `logoDefaultsNote` — "Standard practice shown for …
 * not yet set for this brand."
 *
 * `tokens.json` is the machine-readable contract a client's developer builds
 * against, and it has nowhere to put a sentence. So it was the one surface
 * handing over '24px digital · 0.5" print (mark height)' with nothing to say
 * the designer never chose it.
 *
 * The values stay for compatibility. `defaults` says which of them are
 * stand-ins, read from `logoRuleDefaults` — the same source the sentence uses,
 * so the JSON and the prose cannot disagree.
 */

const pack = (over = {}) => ({
  projectName: 'Ember & Oak',
  palette: ['#1C1917', '#0F766E'],
  ...over,
})

describe('a blank minimum size', () => {
  const logo = buildJsonTokens(pack()).logo

  it('still carries a usable string, as it always did', () => {
    expect(logo.minSize).toBe(DEFAULT_LOGO_MIN_SIZE)
    expect(logo.clearspace).toBe(DEFAULT_LOGO_CLEARSPACE)
    expect(logo.donts).toEqual(DEFAULT_LOGO_DONTS)
  })

  it('says the value is a default', () => {
    expect(logo.defaults).toContain('minSize')
  })

  it('says the same about the other two unset rules', () => {
    expect(logo.defaults).toEqual(['clearspace', 'minSize', 'donts'])
  })
})

describe('an explicit minimum size', () => {
  const logo = buildJsonTokens(
    pack({ logoMinSize: '18px digital · 9mm print' })
  ).logo

  it('is preserved exactly', () => {
    expect(logo.minSize).toBe('18px digital · 9mm print')
  })

  it('is not reported as a default', () => {
    expect(logo.defaults).not.toContain('minSize')
  })

  it('does not change what is said about the rules still unset', () => {
    expect(logo.defaults).toEqual(['clearspace', 'donts'])
  })
})

describe('the other two rules behave the same way', () => {
  it('a chosen clearspace drops off the list and keeps its text', () => {
    const logo = buildJsonTokens(pack({ logoClearspace: 'One x-height' })).logo
    expect(logo.clearspace).toBe('One x-height')
    expect(logo.defaults).toEqual(['minSize', 'donts'])
  })

  it('chosen don’ts drop off the list and keep their text', () => {
    const logo = buildJsonTokens(
      pack({ logoDonts: 'Never on photography\nNever rotated' })
    ).logo
    expect(logo.donts).toEqual(['Never on photography', 'Never rotated'])
    expect(logo.defaults).toEqual(['clearspace', 'minSize'])
  })

  it('is empty when the designer chose all three', () => {
    const logo = buildJsonTokens(
      pack({
        logoClearspace: 'One x-height',
        logoMinSize: '18px',
        logoDonts: 'Never rotated',
      })
    ).logo
    expect(logo.defaults).toEqual([])
  })

  it('ignores whitespace-only answers, the way the note does', () => {
    const logo = buildJsonTokens(pack({ logoMinSize: '   ' })).logo
    expect(logo.defaults).toContain('minSize')
  })
})

describe('the JSON and the prose cannot drift apart', () => {
  /* Both read `logoRuleDefaults`. If one grows a rule the other does not know
     about, a client file and a client sentence start disagreeing about which
     decisions were made. */
  it('reports exactly the rules the resolver reports', () => {
    for (const over of [
      {},
      { logoMinSize: '18px' },
      { logoClearspace: 'One x-height', logoDonts: 'Never rotated' },
    ]) {
      const p = pack(over)
      const expected = LOGO_RULE_KEYS.filter((k) => logoRuleDefaults(p)[k])
      expect(buildJsonTokens(p).logo.defaults).toEqual(expected)
    }
  })

  it('is empty exactly when the note is empty', () => {
    const chosen = pack({
      logoClearspace: 'One x-height',
      logoMinSize: '18px',
      logoDonts: 'Never rotated',
    })
    expect(buildJsonTokens(chosen).logo.defaults).toEqual([])
    expect(logoDefaultsNote(chosen)).toBe('')

    expect(buildJsonTokens(pack()).logo.defaults.length).toBeGreaterThan(0)
    expect(logoDefaultsNote(pack())).not.toBe('')
  })

  it('covers every key the resolver can report', () => {
    // A fourth rule added to `logoRuleDefaults` and not to LOGO_RULE_KEYS
    // would be silently missing from the token file.
    expect(Object.keys(logoRuleDefaults({})).sort()).toEqual(
      [...LOGO_RULE_KEYS].sort()
    )
  })
})
