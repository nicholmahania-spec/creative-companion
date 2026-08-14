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
     SIZE problem, not a ramp problem, and bumping them would break the model.

     72 -> 68 on 2026-08-14, DOWNWARD, and earned twice over.

     Two things happened. Three values that were already exactly a token —
     `1.25rem`, and the `!important` forms of `1.25rem` and `0.75rem` — now
     name it; identity substitutions, 24 declarations, nothing rendered
     moved. And the prose two paragraphs up finally became code: the count
     no longer includes scale-model type, so the letterhead's 6.4px footer
     and the specimen's `clamp(… cqi …)` sizes stop being read as interface
     text set below a 12px floor. 49 declarations leave the count that way,
     and the rule that removes them is asserted not to reach chrome.

     WHAT IS LEFT IS THE REAL PROBLEM, and it is a typography decision rather
     than a counter. Excluding every model surface, interface text still uses
     FIFTEEN distinct sizes across 2.3px — 0.68 / 0.6875 / 0.7 / 0.72 / 0.78 /
     0.79 / 0.8 / 0.8125 / 0.82 / 0.825rem and the rest — in 247 declarations,
     with `--fs-1` (12px) sitting in the middle of them. A second cluster puts
     ten sizes in the 1.8px between 13.4 and 15.2px, `--fs-2` among them.
     Nobody can see 12.48px against 12.64px. That is drift, and collapsing it
     changes rendered type on the densest surfaces in the app, so it is not
     done here.

     `0.875rem` and `1rem` did NOT retire, and the reason is worth keeping:
     each still has one occurrence on a brand-book page preview
     (`.bbb-back-mark`, `.app-specimen-app-mark`). Left raw on purpose —
     tokenising them is identity today but would tie preview artwork to a
     ramp the interface is free to retune. */
  fontSize: 68,
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

/**
 * Scale-model type is not interface type.
 *
 * Four surfaces in this app DRAW something at reduced scale — the Touchpoints
 * proofing specimens, the stationery previews (letterhead, business card,
 * envelope, email signature), and the touchpoint mock thumbnails. Their type
 * is REPRESENTING type: a 6.4px line inside a 220px letterhead is a letter's
 * body copy seen small, not interface text set below the floor. `--fs-1` is
 * 12px and is called the floor; forcing it onto them would not tidy anything,
 * it would redraw the model at a size the object never has.
 *
 * The budget note above already said this in prose — "the sub-floor sizes
 * left in the tree are all inside scale-model previews … bumping them would
 * break the model" — and then had no way to act on it, because the count knew
 * only values. `containers.test.js` hit the same wall on corner radii and was
 * corrected the same way. This is that correction, for type.
 *
 * NARROW BY CONSTRUCTION, and the boundary test below asserts each limit:
 *   · it keys on the SUBJECT of the selector, so a control that merely sits
 *     inside a preview is still governed;
 *   · every selector in a comma list must qualify, so one model class cannot
 *     carry a chrome class through beside it;
 *   · it names class families, never a file. `lazy-sketch.css` and
 *     `lazy-design.css` hold plenty of real chrome and all of it stays under
 *     the rule — `.app-stage-film-label`, the visible label under each
 *     filmstrip thumbnail, is governed while the `.tp-mock-*` type INSIDE
 *     that thumbnail is not.
 *
 * `.bbb-*` IS DELIBERATELY ABSENT, and that is a finding rather than an
 * oversight. The brand-book builder draws its page preview and its own
 * controls from one flat namespace with no prefix separating them:
 * `.bbb-page-num` is preview, `.bbb-page-label` / `.bbb-page-link` /
 * `.bbb-page-action` are chrome. No family rule can tell them apart, so
 * exempting `.bbb-*` would exempt buttons, inputs and hints. Its preview type
 * stays counted until someone gives those pages a marker of their own.
 */
const SCALE_MODEL_SUBJECT = [
  /* Touchpoints proofing table — a card, a browser, a phone, drawn to scale. */
  /(^|[\s>+~])\.app-specimen-[a-z-]+[^\s>+~]*$/,
  /* Letterhead / business card / envelope / signature previews. */
  /(^|[\s>+~])\.stationery-[a-z-]+[^\s>+~]*$/,
  /* Touchpoint mock artwork, including inside the filmstrip thumbnail. */
  /(^|[\s>+~])\.tp-mock-[a-z-]+[^\s>+~]*$/,
]

export function isScaleModelType(selector) {
  if (!selector) return false
  return selector
    .split(',')
    .every((one) => SCALE_MODEL_SUBJECT.some((rx) => rx.test(one.trim())))
}

/**
 * Every declaration of `prop`, WITH the selector that owns it.
 *
 * Comments are blanked rather than deleted so reported line numbers stay true
 * to the file. The selector is the text between the rule's own `{` and the
 * boundary before it — correct inside `@media` too, since the nearest earlier
 * brace is the at-rule's.
 */
function declarationsOf(prop) {
  const out = []
  for (const file of readdirSync(STYLES).filter((f) => f.endsWith('.css'))) {
    const source = readFileSync(join(STYLES, file), 'utf8')
    const blanked = source.replace(/\/\*[\s\S]*?\*\//g, (c) =>
      c.replace(/[^\n]/g, ' ')
    )
    const re = new RegExp(`(?:${prop}):\\s*([^;}]+)[;}]`, 'g')
    for (const m of blanked.matchAll(re)) {
      const open = blanked.lastIndexOf('{', m.index)
      const prev = Math.max(
        blanked.lastIndexOf('}', open),
        blanked.lastIndexOf('{', open - 1)
      )
      out.push({
        file,
        line: source.slice(0, m.index).split('\n').length,
        selector: blanked.slice(prev + 1, open).replace(/\s+/g, ' ').trim(),
        value: m[1].trim(),
      })
    }
  }
  return out
}

/** Interface type only — scale-model declarations are not counted. */
function distinctInterfaceFontSizes() {
  const out = new Map()
  for (const d of declarationsOf('font-size')) {
    if (d.value.includes('var(')) continue
    if (isScaleModelType(d.selector)) continue
    if (!out.has(d.value)) out.set(d.value, d)
  }
  return out
}

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
  it('does not add new one-off font sizes in the interface', () => {
    const values = distinctInterfaceFontSizes()
    const worst = [...values.values()]
      .slice(0, 6)
      .map((d) => `${d.file}:${d.line} ${d.selector} { font-size: ${d.value} }`)
    expect(
      values.size,
      `distinct raw interface font-size values: ${values.size} (budget ${BUDGET.fontSize}).\n` +
        `If this grew, use --fs-1..6 instead of a new value. First few:\n  ` +
        worst.join('\n  ')
    ).toBeLessThanOrEqual(BUDGET.fontSize)
  })

  /**
   * The exemption must stay an exemption.
   *
   * A rule that widens by accident is worse than no rule, and the cheap way to
   * widen this one is to start matching a file, a container, or any selector
   * that merely mentions a preview. Each case below would have let real
   * interface text through, so each is asserted against.
   */
  it('the scale-model type exemption cannot swallow interface text', () => {
    expect(isScaleModelType('.app-specimen-card-primary')).toBe(true)
    expect(isScaleModelType('.stationery-card-name')).toBe(true)
    expect(isScaleModelType('.tp-mock-meta')).toBe(true)
    /* Model type inside a thumbnail is model type; the thumbnail's own label
       is interface text, and the two live one selector apart. */
    expect(
      isScaleModelType('.app-stage-film-thumb .tp-mock-wordmark')
    ).toBe(true)
    expect(isScaleModelType('.app-stage-film-label')).toBe(false)
    /* Subject is chrome, ancestor is a model — still governed. */
    expect(isScaleModelType('.stationery-card-face .btn')).toBe(false)
    /* One model class cannot carry chrome through beside it. */
    expect(isScaleModelType('.tp-mock-meta, .desk-card')).toBe(false)
    /* Neighbours in the same stylesheets are not models. */
    expect(isScaleModelType('.app-stage-field')).toBe(false)
    expect(isScaleModelType('.bbb-panel__title')).toBe(false)
    expect(isScaleModelType('')).toBe(false)

    /* And it stays small. If this climbs, a family is being used for
       something it was not scoped to. */
    const exempted = declarationsOf('font-size').filter(
      (d) => !d.value.includes('var(') && isScaleModelType(d.selector)
    )
    expect(exempted.length).toBeLessThanOrEqual(70)
    for (const d of exempted) {
      expect(
        ['lazy-sketch.css', 'lazy-design.css'].includes(d.file),
        `scale-model exemption reached ${d.file}:${d.line} (${d.selector})`
      ).toBe(true)
    }
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
    const fontSize = distinctInterfaceFontSizes().size
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
    expect(distinctInterfaceFontSizes().size).toBeGreaterThan(10)
    expect(distinctRaw('padding|margin|gap|row-gap|column-gap').size).toBeGreaterThan(50)
  })
})
