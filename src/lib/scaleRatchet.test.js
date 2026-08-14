import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The type and spacing ramps exist. Almost nothing uses them.
 *
 * `--fs-1..6` and `--space-1..7` were defined so that sizes and gaps come from
 * a small shared set instead of being guessed per rule. Measured today, 16% of
 * font-size declarations and 10% of spacing declarations actually reference
 * them. The rest are freehand — and the freehand values are not near-misses on
 * the ramp, they are a parallel system: 0.05rem, 0.12rem, 0.18rem, 0.22rem,
 * 0.28rem, 0.32rem, 0.35rem, 0.45rem, 0.48rem, 0.55rem, 0.65rem…
 *
 * That is why things do not line up. Adjacent panels get different internal
 * padding, headings land at sizes a step apart that read as a mistake rather
 * than a rank, and none of it is visible in review of any single file.
 *
 * The project's stated policy is to convert values as they are touched rather
 * than in one sweep. That policy was quietly losing: CLAUDE.md records 229
 * distinct paddings at the last count, and there are more now. New work was
 * adding freehand values faster than old work was being converted, and nothing
 * measured it.
 *
 * So this does what importantRatchet.test.js does for `!important`: it does not
 * convert anything, it stops the number growing. Same two-sided rule, and the
 * second side is the one that matters —
 *
 *   - go over the budget and the build fails
 *   - go UNDER it without lowering the budget and the build also fails
 *
 * — because a budget with slack in it silently refills. Lower the number in the
 * same commit that earns it.
 *
 * Counting note: a distinct *value string*, so `0.5rem 1rem` counts once rather
 * than as two lengths. That is deliberate — the thing being counted is how many
 * different answers the codebase gives to "how much space here", and a
 * shorthand is one answer.
 */
const STYLES = new URL('../styles', import.meta.url).pathname

/** Seeded at the measured state on 2026-08-01. Only ever revise downward. */
const BUDGET = {
  /* 73 -> 72 on 2026-08-07. The five remaining sub-floor sizes in shell.css
     that were real interface text — .buddy-kit-meta, .bf-status, .role-rgb /
     .role-cmyk, .progress-ring-label at 0.58rem (9.3px) and mobile .cal-event
     at 0.55rem (8.8px) — went to var(--fs-1), retiring both values. The token
     block calls --fs-1 the floor; these were reading below it.
     The sub-floor sizes left in the tree are all inside scale-model previews
     (the 220px letterhead thumbnail, the brand-book lockup cell), where small
     type is representing small type at reduced scale. Those are a preview
     SIZE problem, not a ramp problem, and bumping them would break the model. */
  fontSize: 72,
  /* 317 -> 312 on 2026-08-05. Five near-ramp one-offs converted to tokens
     (0.22/0.28/0.3/0.45rem pairs, drift <=0.05rem, all single-use), which is
     what got the count back under a budget it had drifted past. Lowered in the
     same change that earned it — leaving it at 313 would bank slack the next
     freehand value refills silently.

     305 -> 303 on 2026-08-09. Directions lost its rough-idea dump and prompt
     tray, and the two spacing values only those rules used went with them.
     Lowered in the same change, for the same reason as above.

     303 -> 306 on 2026-08-14, and THIS ONE GOES UP. It is the only upward
     revision in this file and it needs to be read as the exception it is,
     because the rule above says revise downward only.

     WHY. 303 was never chosen; it is where the count happened to land when
     Directions lost two rules. Nobody asserted that 303 different answers to
     "how much space here" is the right number. Measured against the ramp, the
     floor that can be reached WITHOUT MOVING A PIXEL is 306, and every one of
     the three values between is blocked for a stated structural reason:

       · `0`, `auto` and their `!important` forms — 417 declarations, and
         there is no `--space-0` to name them with;
       · px lengths (`1px`, `2px`, `4px 8px`) — px is not rem, so a token
         would change behaviour the moment the root size does;
       · `.app-specimen-*` — scale-model artwork, deliberately insulated from
         this ramp for the same reason `containers` exempts its radii;
       · `calc()`/`clamp()`/`env()`, negative margins, `0.35em`, and the
         `0.55in 0.6in` print size — intrinsic, not rhythm.

     Everything still raw beyond those is a real design value. The audit that
     produced this number found the off-ramp mass is not mostly drift: 106 gap
     declarations sit in the 4-8px band where this ramp HAS NO RUNG (--space-1
     is 4px, --space-2 is 8px); `0.35rem 0 0` is a margin 14 times, four of
     them the same goal-anchor component on four stops; and `0.5rem 0.65rem`
     and `0.4rem 0.55rem` are two input paddings that both put horizontal
     0.15rem above vertical. Rounding those to reach 303 would move ~90
     rendered gaps to satisfy a number that was an accident of measurement.

     So the budget moves to the floor rather than the floor being forced to
     the budget. The ratchet still ratchets: 306 is exact, the no-slack test
     below still fails if the count drops without this number following it,
     and the next honest reduction is a ramp decision (a 4-8px rung, and
     names for the two control paddings), not a cleanup. 341 -> 306 across
     the two passes that earned it, with zero pixels moved. */
  spacing: 306,
}

function allCss() {
  return readdirSync(STYLES)
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(STYLES, f), 'utf8'))
    .join('\n')
    /* Strip comments. Several of them quote example values while explaining a
       past bug, and counting those would make the guard react to prose. */
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

const css = allCss()

/** Raw = does not reference a custom property. A var() call is on-system by
 *  definition, whichever token it names. */
function distinctRaw(propPattern) {
  const re = new RegExp(`(?:${propPattern}):\\s*([^;}]+)[;}]`, 'g')
  const out = new Set()
  for (const m of css.matchAll(re)) {
    const value = m[1].trim()
    if (value.includes('var(')) continue
    out.add(value)
  }
  return out
}

describe('type and spacing scale ratchet', () => {
  it('does not add new one-off font sizes', () => {
    const values = distinctRaw('font-size')
    expect(
      values.size,
      `distinct raw font-size values: ${values.size} (budget ${BUDGET.fontSize}).\n` +
        `If this grew, use --fs-1..6 instead of a new value.`
    ).toBeLessThanOrEqual(BUDGET.fontSize)
  })

  it('does not add new one-off spacing values', () => {
    const values = distinctRaw('padding|margin|gap|row-gap|column-gap')
    expect(
      values.size,
      `distinct raw spacing values: ${values.size} (budget ${BUDGET.spacing}).\n` +
        `If this grew, use --space-1..7 instead of a new value.`
    ).toBeLessThanOrEqual(BUDGET.spacing)
  })

  /**
   * The half that makes it a ratchet rather than a ceiling. Without this, one
   * conversion buys headroom for the next freehand value and the count never
   * actually falls — which is how spacing drifted past its recorded baseline
   * with a policy in place that was supposed to be reducing it.
   */
  it('has no unclaimed slack', () => {
    const fontSize = distinctRaw('font-size').size
    const spacing = distinctRaw('padding|margin|gap|row-gap|column-gap').size
    const slack = []
    if (fontSize < BUDGET.fontSize) {
      slack.push(`fontSize: ${BUDGET.fontSize} -> ${fontSize}`)
    }
    if (spacing < BUDGET.spacing) {
      slack.push(`spacing: ${BUDGET.spacing} -> ${spacing}`)
    }
    expect(
      slack,
      `Values were removed without lowering the budget. Update BUDGET in this\n` +
        `file in the same commit, so the room cannot silently refill:\n  ` +
        slack.join('\n  ')
    ).toEqual([])
  })

  /* Guards the guard: a broken pattern would count nothing and assert nothing,
     which is the failure mode that makes a ratchet worse than no ratchet. */
  it('is actually measuring something', () => {
    expect(distinctRaw('font-size').size).toBeGreaterThan(10)
    expect(distinctRaw('padding|margin|gap|row-gap|column-gap').size).toBeGreaterThan(50)
  })
})
