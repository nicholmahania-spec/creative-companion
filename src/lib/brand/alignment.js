/**
 * Alignment — how a candidate compares to the strategy, axis by axis.
 *
 * THE RULE, and the reason this module has no `score` export:
 *
 *   Five bars. Never one number.
 *
 * The Expansion Spec proposed a single "82% aligned" percentage from the
 * euclidean distance across five axes. That did not survive review
 * (DEVELOPMENT.md, "Contested claims"), on evidence rather than taste:
 *
 *   - Shaikh & Chaparro (379 participants, 40 typefaces) factor font
 *     personality into THREE CORRELATED factors, not five independent ones.
 *     Euclidean distance assumes orthogonal axes; over correlated ones,
 *     whichever pairs co-vary silently get double weight. (WHICH pairs is
 *     unverified — the loadings table could not be retrieved — so treat any
 *     named pairing as a guess. The structural argument stands without it.)
 *
 * OPEN QUESTION, recorded rather than resolved: review also pointed out that
 * killing the scalar did not validate the five axes themselves. If the real
 * structure is three correlated factors, five bars present five
 * independent-looking readings over three, and two bars that always move
 * together read as two pieces of evidence (Kahneman & Tversky's illusion of
 * validity) — which is arguably worse than one number, not better. The fix
 * for a bad basis is a better basis, and it stays compatible with this rule:
 * fewer, factor-derived bars are still bars. The cheap test, once ~50 tokens
 * are tagged: correlate the five axes across brand_tokens. |r| under ~0.3
 * and the axes behave independently; over ~0.6 and the basis needs
 * collapsing.
 *   - Brumberger: readers ascribe personality to the TEXT as much as the
 *     typeface, so a stored per-font vector is unstable however carefully
 *     it was tagged.
 *
 * And the practical failure is worse than the statistical one: a scalar
 * hides the axis that carried the brief. A typeface wrong on Warmth alone
 * still scores ~78% — which the spec's own copy renders as "worth a second
 * look, not a blocker" — when Warmth *was* the brief for "warm, playful,
 * approachable". The bar that matters is exactly the one the average erases.
 *
 * So this module answers "where does this differ, and by how much?" and
 * refuses to answer "how aligned is it?". If a combined number is ever
 * wanted, that is a decision to be argued with evidence, not a helper to
 * quietly add here.
 */

/** The five axes, with both poles named. A number without its poles is
 *  unreadable, and the poles are the only part the designer actually reads. */
export const AXES = [
  { id: 'formality', label: 'Formality', low: 'casual', high: 'formal' },
  { id: 'energy', label: 'Energy', low: 'calm', high: 'energetic' },
  { id: 'warmth', label: 'Warmth', low: 'cool', high: 'warm' },
  { id: 'weight', label: 'Weight', low: 'light', high: 'bold' },
  { id: 'era', label: 'Era', low: 'classic', high: 'modern' },
]

export const AXIS_IDS = AXES.map((a) => a.id)

/** A gap this size or under is not worth a designer's attention. Below it,
 *  an axis reads as "matches" rather than drawing the eye to a difference
 *  that is inside the noise of anyone's tagging. */
export const CLOSE_ENOUGH = 0.15

const clamp01 = (n) => Math.min(1, Math.max(0, n))

/** A stored axis value, or null when it was never set. Null is a real state
 *  — "not said" — and must never silently become 0, which would read as the
 *  low pole and invent a strategy nobody wrote. */
export function axisValue(row, axisId) {
  const raw = row?.[axisId]
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? clamp01(n) : null
}

/** Spread wider than this means the attributes genuinely disagree on an
 *  axis, and their mean is a number nobody asked for. */
export const SPLIT_SPREAD = 0.35

/**
 * The strategy profile: per axis, what the attributes say — and whether
 * they agree.
 *
 * Averaging per axis rather than per attribute is deliberate. A designer
 * may say "warm" (which speaks to Warmth) and "modern" (which speaks to
 * Era) without either saying anything about Weight, and an attribute
 * silent on an axis must not drag that axis toward the middle. Averaging
 * only the ones that spoke keeps silence silent.
 *
 * But silence was only half the problem. DISAGREEMENT produced the same
 * failure by another route, and it took a review to catch it: "playful"
 * (energy 0.9) and "trustworthy" (energy 0.25) average to 0.575, so a
 * typeface sitting at 0.575 — matching NEITHER attribute — was reported as
 * close and the note said nothing. That is a false negative in exactly the
 * direction this feature exists to prevent, and it is the same sin the
 * module already refuses for silence: inventing a strategy nobody wrote.
 *
 * So the spread travels with the mean, and a wide spread is reported as a
 * split rather than resolved into a confident midpoint. A brief that pulls
 * two ways is a real finding about the STRATEGY — arguably more useful than
 * anything about the candidate — and the designer should see it rather than
 * have it averaged away.
 *
 * @param {Array<object>} attributes
 * @returns {Record<string, {target: number|null, min: number|null,
 *   max: number|null, spread: number, split: boolean, voices: string[]}>}
 */
export function strategyProfile(attributes = []) {
  const out = {}
  for (const axis of AXIS_IDS) {
    const speaking = attributes.filter((a) => axisValue(a, axis) !== null)
    const values = speaking.map((a) => axisValue(a, axis))
    if (values.length === 0) {
      out[axis] = {
        target: null,
        min: null,
        max: null,
        spread: 0,
        split: false,
        voices: [],
      }
      continue
    }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = max - min
    out[axis] = {
      target: values.reduce((sum, v) => sum + v, 0) / values.length,
      min,
      max,
      spread,
      split: spread > SPLIT_SPREAD,
      /* Who pulled which way, so the split can be named in the designer's
         own words rather than as two numbers. Sorted by position on the
         axis: lowest first, so "X vs Y" reads low-pole to high-pole. */
      voices: speaking
        .slice()
        .sort((a, b) => axisValue(a, axis) - axisValue(b, axis))
        .map((a) => String(a.label || '').trim())
        .filter(Boolean),
    }
  }
  return out
}

/**
 * Per-axis means only. Kept because the mean is what gets snapshotted onto
 * a decision, and because plenty of callers only need the number.
 *
 * Prefer `strategyProfile` anywhere the result is shown to a designer —
 * this drops the disagreement, which is the part worth seeing.
 *
 * @param {Array<object>} attributes
 * @returns {Record<string, number|null>}
 */
export function strategyTarget(attributes = []) {
  const profile = strategyProfile(attributes)
  const out = {}
  for (const axis of AXIS_IDS) out[axis] = profile[axis].target
  return out
}

/**
 * Compare one candidate to the target, axis by axis.
 *
 * Returns one entry per axis, always in AXES order so the bars do not
 * reshuffle between renders — a chart whose rows move is a chart nobody
 * can compare across two candidates.
 *
 * `state` is the whole point:
 *   'unset'   — the strategy said nothing here, or the token is untagged.
 *               NOT a match and NOT a miss. Absence of data is not agreement.
 *   'close'   — within CLOSE_ENOUGH.
 *   'differs' — worth a look, with a direction the designer can act on.
 *
 * @returns {Array<{axis, label, low, high, target, value, delta, direction, state}>}
 */
export function compareToTarget(target, token) {
  return AXES.map((axis) => {
    /* Accepts either a plain target (`{warmth: 0.9}`) or a full profile
       from strategyProfile (`{warmth: {target, spread, split, voices}}`).
       The profile carries the disagreement; a plain target cannot. */
    const cell = target?.[axis.id]
    const isProfile = cell !== null && typeof cell === 'object'
    const t = isProfile ? cell.target : target ? axisValue(target, axis.id) : null
    const split = isProfile ? cell.split : false
    const voices = isProfile ? cell.voices : []
    const v = axisValue(token, axis.id)

    /* A split axis is reported as a split whatever the candidate does,
       because the honest answer is "your strategy has not decided this
       yet" — comparing to the midpoint of a disagreement would dress a
       number nobody asked for as a match. */
    if (split && t !== null) {
      return {
        axis: axis.id,
        label: axis.label,
        low: axis.low,
        high: axis.high,
        target: t,
        value: v,
        delta: v === null ? null : v - t,
        direction: null,
        voices,
        state: 'split',
      }
    }
    if (t === null || v === null) {
      return {
        axis: axis.id,
        label: axis.label,
        low: axis.low,
        high: axis.high,
        target: t,
        value: v,
        delta: null,
        direction: null,
        voices: [],
        state: 'unset',
      }
    }
    const delta = v - t
    return {
      axis: axis.id,
      label: axis.label,
      low: axis.low,
      high: axis.high,
      target: t,
      value: v,
      delta,
      // Which way it leans, in the axis's own words — "leans formal" is
      // actionable, "+0.22" is a number to decode.
      direction: delta > 0 ? axis.high : axis.low,
      voices: [],
      /* Epsilon because these are floats: 0.9 - 0.15 is 0.7499999999999999,
         so a gap of exactly CLOSE_ENOUGH lands a hair outside it and a
         designer sitting on the boundary would see the bar flip between
         "close" and "differs" for no reason they could act on. */
      state: Math.abs(delta) <= CLOSE_ENOUGH + 1e-9 ? 'close' : 'differs',
    }
  })
}

/**
 * One plain sentence naming the axes that differ — the prompt, not a verdict.
 *
 * Says nothing when everything is close, because a system that comments on
 * every choice trains the designer to stop reading it. Names at most two
 * axes: a sentence listing five differences is a paragraph, and a paragraph
 * is a thing to skip.
 *
 * Deliberately has no opinion about whether the choice is right. Per the
 * product's third principle, the platform can say "this does not meet the
 * standard you picked"; it must not say "use this instead."
 */
export function alignmentNote(rows = []) {
  /* Splits come first and alone. A split is a fact about the STRATEGY —
     two attributes pulling opposite ways — and it outranks anything about
     the candidate, because until it is settled there is nothing to compare
     against. Naming the two words back to the designer is the whole value:
     "playful vs trustworthy" is a conversation they can have with the
     client; "energy 0.575" is not. */
  const splits = rows.filter((r) => r.state === 'split')
  if (splits.length) {
    const first = splits[0]
    const pair =
      first.voices?.length >= 2
        ? ` — ${first.voices[0]} vs ${first.voices[first.voices.length - 1]}`
        : ''
    const more = splits.length > 1 ? `, and ${splits.length - 1} more` : ''
    return `Your strategy pulls both ways on ${first.label.toLowerCase()}${pair}${more}.`
  }

  const differing = rows
    .filter((r) => r.state === 'differs')
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  if (differing.length === 0) return ''
  const named = differing
    .slice(0, 2)
    .map((r) => `${r.label.toLowerCase()} leans ${r.direction}`)
  const rest =
    differing.length > 2 ? `, and ${differing.length - 2} more` : ''
  return `Against your strategy: ${named.join(', ')}${rest}.`
}
