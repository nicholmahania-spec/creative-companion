/**
 * Every pair in a palette, tested at once.
 *
 * A palette is not a list of colours, it is a set of possible COMBINATIONS,
 * and a combination is where accessibility actually succeeds or fails. Checking
 * swatches one at a time hides that: each colour looks fine on white, and the
 * pair a client will actually read — accent on neutral, say — is the one nobody
 * checked. This computes all of them in one pass so the failing pair cannot
 * hide behind the passing ones.
 *
 * WHAT THIS FILE DOES NOT DO: decide anything. It reports ratios and grades and
 * offers a candidate fix. Applying it is the designer's call — PRODUCT.md
 * Principle 3, "the platform may say this does not meet the standard, but not
 * this is the colour you must use."
 *
 * The contrast maths is NOT reimplemented here. `contrastRatio`,
 * `relativeLuminance` and `contrastGrade` already exist in `../color.js` and
 * are used by the brand book PDF among other things; a second copy would drift
 * from the first, and a contrast checker that disagrees with the exporter is
 * worse than either alone.
 */

import {
  contrastGrade,
  contrastRatio,
  hexToHsl,
  hslToHex,
  normalizeHex,
} from '../color.js'
import { deltaE00Hex } from '../brand/deltaE.js'

/** WCAG 2.1 thresholds, named so call sites read as intent not arithmetic. */
export const WCAG = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
  UI: 3,
}

/**
 * One cell: a foreground on a background, and what it is good for.
 *
 * `usableFor` is the useful half. A raw pass/fail cannot be right on its own,
 * because WCAG is not one threshold — 4.5:1 for body text, 3:1 for large text
 * and for UI components. A pair at 3.4:1 is a genuine failure for body copy and
 * genuinely fine for a 24px heading, and a cell that says only "FAIL" is wrong
 * about the second case.
 */
export function contrastCell(fgHex, bgHex) {
  const fg = normalizeHex(fgHex)
  const bg = normalizeHex(bgHex)
  if (!fg || !bg) return null
  const ratio = contrastRatio(fg, bg)
  const grade = contrastGrade(ratio)
  const usableFor = []
  if (grade.aaaNormal) usableFor.push('body text (AAA)')
  else if (grade.aaNormal) usableFor.push('body text')
  if (grade.aaLarge) usableFor.push('large text')
  if (grade.ui) usableFor.push('UI shapes')
  return {
    fg,
    bg,
    ratio,
    grade,
    usableFor,
    /* `same` marks the diagonal. A colour on itself is 1:1 and meaningless —
       reporting it as a failure would put N red cells down the middle of the
       grid for a mistake nobody made. */
    same: fg.toLowerCase() === bg.toLowerCase(),
  }
}

/**
 * The full matrix, plus a summary that does not require counting cells.
 *
 * `worst` and `failing` exist so the UI never has to make the designer scan a
 * grid to find out whether anything is wrong. The grid is for locating a
 * problem; the summary is for knowing whether to look.
 */
export function buildContrastMatrix(palette = []) {
  const colours = palette.map(normalizeHex).filter(Boolean)
  const rows = colours.map((fg) => colours.map((bg) => contrastCell(fg, bg)))

  const pairs = []
  for (let i = 0; i < colours.length; i++) {
    for (let j = 0; j < colours.length; j++) {
      const cell = rows[i][j]
      if (cell && !cell.same) pairs.push(cell)
    }
  }

  const failing = pairs.filter((c) => !c.grade.aaNormal)
  const unusable = pairs.filter((c) => !c.grade.aaLarge)
  return {
    colours,
    rows,
    pairs,
    failing,
    /* Below 3:1 nothing can be set in it at all — not body, not large, not a
       UI shape. That is the number worth surfacing, because "fails AA for body
       text" is often a deliberate, fine choice for a decorative pairing. */
    unusable,
    best: pairs.reduce((a, c) => (!a || c.ratio > a.ratio ? c : a), null),
    worst: pairs.reduce((a, c) => (!a || c.ratio < a.ratio ? c : a), null),
  }
}

/**
 * Move a foreground until it clears a target against its background.
 *
 * Lightness only. An earlier version had a saturation fallback and this
 * docstring described when it would run; measured over 4,000 random pairs at
 * four targets, it ran ZERO times, and that is structural rather than unlucky.
 * Contrast against black is (Lbg+0.05)/0.05, which clears 4.5 whenever the
 * background's luminance is at least ~0.175; against white it is
 * 1.05/(Lbg+0.05), which clears 4.5 whenever luminance is at most ~0.183.
 * Every possible background satisfies one of those, so the lightness search
 * always succeeds at AA by running toward one extreme — and where lightness
 * cannot reach a higher target, saturation cannot either, since it barely
 * moves luminance at all. Dead code that documented its own honesty was worse
 * than no fallback, so it is gone.
 *
 * Binary search rather than stepping, so the result is the SMALLEST change that
 * clears the bar. A fix that overshoots is a fix the designer has to argue with.
 *
 * Both directions are tried and the nearer winner is returned — for a mid-tone
 * on a mid-tone, going darker and going lighter can both work, and the one
 * closer to the original is the one that still looks like the colour they
 * picked.
 */
export function autoFixPair(fgHex, bgHex, target = WCAG.AA_NORMAL) {
  const fg = normalizeHex(fgHex)
  const bg = normalizeHex(bgHex)
  if (!fg || !bg) return null

  const start = contrastRatio(fg, bg)
  if (start >= target) {
    return { hex: fg, ratio: start, changed: false, axis: null, distance: 0 }
  }

  const hsl = hexToHsl(fg)
  if (!hsl) return null

  /* Two explicit searches rather than one clever one. The first version tried
     to handle both directions with a sign check and got `lo > hi`, so it never
     converged and returned pure BLACK for a pale blue — the largest possible
     change, from a function whose whole job is to find the smallest. Caught by
     the overshoot test, which is why that test exists. */

  /** Largest value in [0, start] that passes — i.e. darken as little as possible. */
  const searchDown = (make, start) => {
    let lo = 0
    let hi = start
    let best = null
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2
      const hex = make(mid)
      if (contrastRatio(hex, bg) >= target) {
        best = { hex, ratio: contrastRatio(hex, bg), at: mid }
        lo = mid
      } else {
        hi = mid
      }
    }
    return best
  }

  /** Smallest value in [start, 1] that passes — lighten as little as possible. */
  const searchUp = (make, start) => {
    let lo = start
    let hi = 1
    let best = null
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2
      const hex = make(mid)
      if (contrastRatio(hex, bg) >= target) {
        best = { hex, ratio: contrastRatio(hex, bg), at: mid }
        hi = mid
      } else {
        lo = mid
      }
    }
    return best
  }

  const mkL = (l) => hslToHex(hsl.h, hsl.s, l)
  const byLightness = [searchDown(mkL, hsl.l), searchUp(mkL, hsl.l)]
    .filter(Boolean)
    .map((r) => ({ ...r, axis: 'lightness', distance: Math.abs(r.at - hsl.l) }))

  if (byLightness.length) {
    const best = byLightness.sort((a, b) => a.distance - b.distance)[0]
    return { hex: best.hex, ratio: best.ratio, changed: true, axis: 'lightness', distance: best.distance }
  }

  /* Honest failure — and it is reachable, unlike the branch that used to sit
     above it. At the AA target it never fires (see above); at AAA it fires on
     roughly a third of random pairs, because 7:1 is beyond what moving one
     colour's lightness can reach for many backgrounds. Saying so beats
     returning a colour that does not actually pass. */
  return { hex: fg, ratio: start, changed: false, axis: null, distance: 0, impossible: true }
}

/**
 * A short, plain sentence for a cell. No jargon, no scolding.
 *
 * "Fails" is avoided as a verdict on the designer's work — the app's rule is
 * that state is described, not alarmed (`nonPunitiveState.test.js`). A pair
 * that cannot carry body text is still perfectly good for a graphic shape, and
 * the sentence says what it IS for before what it is not.
 */
export function cellSummary(cell) {
  if (!cell) return ''
  if (cell.same) return 'Same color'
  if (cell.usableFor.length === 0) return 'Too close to read either way'
  return `Good for ${cell.usableFor.join(', ')}`
}

/**
 * How far a suggested fix actually travelled, perceptually.
 *
 * The distance the search reports is HSL lightness, which is not a measure of
 * whether the colour still looks like itself. Measured case: #FFD100 against
 * white resolves to #8E7400 — hue preserved to within 1°, saturation preserved
 * at exactly 100%, lightness moved 0.22. By every number the search tracks
 * that is "the same yellow, a little darker". It is dark olive-brown.
 *
 * Ottosson's Okhsl work names the cause directly: HSL's lightness axis "does
 * not match the perception of lightness well at all for saturated colors". So
 * the drift is reported in ΔE00 instead — the same perceptual measure the
 * brand consistency checker uses — and the caller can say plainly when a
 * "fix" has stopped being the designer's colour.
 */
export function fixDrift(originalHex, fixedHex) {
  return deltaE00Hex(originalHex, fixedHex)
}

/** Past this, the suggestion is a different colour, not an adjustment. */
export const DRIFT_IS_A_NEW_COLOUR = 10

/**
 * Every honest way out of a failing pair — not just "rewrite the brand colour".
 *
 * The single most important thing this module does NOT assume: that the
 * foreground is the thing free to move. A brand colour is routinely
 * Pantone-matched, printed and trademarked — #ED1C24 is Pantone 185 in one of
 * the palettes this was built against — so a tool that helpfully rewrites it
 * has produced a value the client may be contractually unable to use, and the
 * brand book downstream would then ship that value as approved.
 *
 * So three routes are offered and none is applied:
 *
 *   1. move the background instead, which is usually the free surface
 *   2. move the foreground, flagged when it stops being the same colour
 *   3. change nothing and use the pair where it already works — a pair at
 *      3.4:1 is fine for large text, and "use it at display size" is a real
 *      resolution, not a consolation
 *
 * Route 3 exists because it is frequently the right answer and no auto-fixer
 * offers it. PRODUCT.md Principle 3: the platform may say this does not meet
 * the standard; it may not say this is the colour you must use.
 */
export function resolutionsFor(fgHex, bgHex, target = WCAG.AA_NORMAL) {
  const cell = contrastCell(fgHex, bgHex)
  if (!cell || cell.same) return []
  if (cell.ratio >= target) return []

  const out = []

  const bg = autoFixPair(bgHex, fgHex, target)
  if (bg?.changed) {
    out.push({
      kind: 'move-background',
      from: cell.bg,
      to: bg.hex,
      ratio: bg.ratio,
      drift: fixDrift(cell.bg, bg.hex),
    })
  }

  const fg = autoFixPair(fgHex, bgHex, target)
  if (fg?.changed) {
    const drift = fixDrift(cell.fg, fg.hex)
    out.push({
      kind: 'move-foreground',
      from: cell.fg,
      to: fg.hex,
      ratio: fg.ratio,
      drift,
      /* The warning that stops this being a trap. A large drift means the
         suggestion passes WCAG and is no longer the designer's colour, which
         is exactly the outcome a confident auto-fix would hide behind a
         green tick. */
      newColour: drift != null && drift > DRIFT_IS_A_NEW_COLOUR,
    })
  }

  if (cell.usableFor.length) {
    out.push({
      kind: 'use-as-is',
      usableFor: cell.usableFor,
      ratio: cell.ratio,
    })
  }

  /* Background first: it is the surface most often free to change, and putting
     the brand-colour rewrite at the top of the list is how a designer ends up
     accepting one without considering that the other side could have moved. */
  return out
}

/**
 * The plain sentence for a role pairing: what it is, and what it would need.
 *
 * Lives here rather than beside the component so the component file exports
 * only a component — a file that mixes the two breaks fast refresh, and the
 * wording is logic anyway: it is the thing the copy rules apply to.
 */
export function readabilityLine(pair) {
  const ratio = `${pair.ratio.toFixed(1)}:1`
  if (pair.ok) return `${ratio} — comfortable to read`
  return `${ratio} — this needs ${pair.need}:1 to be easy to read`
}
