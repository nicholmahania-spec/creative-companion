/**
 * Being behind is never painted as an alarm.
 *
 * This is the one Phase 5 executive-function item that was already true almost
 * everywhere and needed a guard rather than a build. `dates.js` words a
 * deadline ("Due this week") instead of counting down at the user, the desk's
 * waiting rows are `--text-muted`, unread state is carried by font weight, and
 * `.deadline-chip.urgency-overdue` separates itself from "today" by going a
 * shade deeper in grey — #414141 against #535353 — never by changing hue.
 *
 * Exactly one rule disagreed: `.deadline-list-item.urgency-overdue` carried a
 * red-tinted border in the calendar list. One rule is enough to matter. It
 * means the app teaches two visual languages for a single state, and the user
 * has to learn both to know whether grey-late and red-late are different
 * things. They are not.
 *
 * WHY THIS IS A TEST AND NOT A NOTE. Red is the reflex for "late" — it will be
 * reached for again, by someone reasonable, in a hurry, who has not read this
 * file. The audience this product exists for is the audience most likely to
 * respond to an alarming interface by closing it, and a project you cannot
 * bear to open is a project that does not get finished. That failure is
 * invisible in every other check we run, because the app still WORKS.
 *
 * HOW TO SATISFY THIS TEST when it fails on you: distinguish urgency the way
 * the chip does — depth of grey, weight, or wording. Not hue. If you genuinely
 * need a red in the app for something that is not a lateness state (a
 * destructive-action confirmation, say), it will pass: this only reads rules
 * whose selector names an urgency/overdue/waiting state.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const stylesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../styles')

/**
 * Selectors describing a state the user might read as a verdict on themselves.
 *
 * Widened from lateness alone to include `fail`, after the guard was found to
 * be missing a live case: `.palette-check-badge.fail` was painted #B91C1C —
 * this file's own canary value, the literal named below as "the red that
 * actually shipped here" — and passed, because the pattern matched lateness
 * words only. A guard whose canary is loose in the product is not a guard.
 *
 * A contrast shortfall differs from lateness in one way that matters: it is a
 * property of a colour PAIR, not of the person's pace, so it can be stated
 * flatly. But red buys nothing the statement does not already carry — "2.4:1,
 * body text needs 4.5:1" names the gap AND the bar, which a red swatch never
 * does. And red spent on ordinary design decisions is how someone learns to
 * ignore it where it is true.
 */
const LATENESS = /urgency-|overdue|waiting|behind|late\b|\bfail/i

/**
 * A colour that reads as alarm rather than emphasis.
 *
 * Judged on the colour itself, not on the token name, because the red that
 * shipped here was written as a literal `rgba(185, 28, 28, 0.3)` and would
 * have slipped past any name-based check. Red-dominant means: the red channel
 * clearly leads, and the colour is saturated enough to register as a hue
 * rather than as a warm grey. `#414141` is not red; `#B91C1C` is.
 */
function isAlarmRed(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = (max - min) / 255
  return r === max && chroma > 0.2 && r - Math.max(g, b) > 40
}

/** Every `rgb()/rgba()` and `#rrggbb` colour in a declaration block. */
function coloursIn(block) {
  const out = []
  for (const m of block.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    out.push([+m[1], +m[2], +m[3], m[0]])
  }
  for (const m of block.matchAll(/#([0-9a-f]{6})\b/gi)) {
    const h = m[1]
    out.push([
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      m[0],
    ])
  }
  return out
}

/** Split a stylesheet into { selector, block } pairs. Comments stripped. */
function rules(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const found = []
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    found.push({ selector: m[1].trim(), block: m[2] })
  }
  return found
}

describe('lateness is stated, never alarmed', () => {
  const sheets = readdirSync(stylesDir).filter((f) => f.endsWith('.css'))

  it('reads real stylesheets, so the guard cannot pass vacuously', () => {
    // A test that silently matched nothing would "pass" forever after a
    // rename. Assert it is actually looking at something first.
    expect(sheets.length).toBeGreaterThan(3)
    const anyUrgency = sheets.some((f) =>
      rules(readFileSync(join(stylesDir, f), 'utf8')).some((r) =>
        LATENESS.test(r.selector)
      )
    )
    expect(anyUrgency, 'no lateness selectors found — did they get renamed?').toBe(
      true
    )
  })

  it('no overdue or waiting state is painted in alarm red', () => {
    const offences = []
    for (const file of sheets) {
      const css = readFileSync(join(stylesDir, file), 'utf8')
      for (const { selector, block } of rules(css)) {
        if (!LATENESS.test(selector)) continue
        for (const [r, g, b, literal] of coloursIn(block)) {
          if (isAlarmRed(r, g, b)) {
            offences.push(`${file}: ${selector} → ${literal}`)
          }
        }
      }
    }
    expect(offences, offences.join('\n')).toEqual([])
  })
})

describe('the red-detector is honest about what counts', () => {
  /* Guarding the guard. If `isAlarmRed` were too loose it would fire on the
     app's warm greys and someone would delete the test rather than debug it;
     too tight and the exact colour that shipped walks straight back in. */
  it('catches the red that actually shipped here', () => {
    expect(isAlarmRed(185, 28, 28)).toBe(true) // rgba(185, 28, 28, 0.3)
  })

  it('does not fire on the greys the app uses for the same state', () => {
    expect(isAlarmRed(104, 104, 104)).toBe(false) // the replacement border
    expect(isAlarmRed(65, 65, 65)).toBe(false) // #414141, overdue chip text
    expect(isAlarmRed(83, 83, 83)).toBe(false) // #535353, today/soon chip text
    expect(isAlarmRed(234, 234, 234)).toBe(false) // the overdue backdrop
  })

  it('does not fire on a warm neutral that merely leans red', () => {
    // Paper/parchment tones are legitimate here; they do not read as alarm.
    expect(isAlarmRed(245, 240, 235)).toBe(false)
  })
})
