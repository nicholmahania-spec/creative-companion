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
 *     whichever pairs co-vary — Weight/Energy, Formality/Era — silently get
 *     double weight.
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

/**
 * The strategy target: the average of every attribute that says something
 * on each axis, computed per axis.
 *
 * Per axis, not per attribute, on purpose. A designer may say "warm"
 * (which speaks to Warmth) and "modern" (which speaks to Era) without
 * either saying anything about Weight — and an attribute silent on an axis
 * must not drag that axis toward the middle. Averaging only the ones that
 * spoke keeps silence silent.
 *
 * @param {Array<object>} attributes
 * @returns {Record<string, number|null>}
 */
export function strategyTarget(attributes = []) {
  const out = {}
  for (const axis of AXIS_IDS) {
    const values = attributes
      .map((a) => axisValue(a, axis))
      .filter((v) => v !== null)
    out[axis] =
      values.length === 0
        ? null
        : values.reduce((sum, v) => sum + v, 0) / values.length
  }
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
    const t = target ? axisValue(target, axis.id) : null
    const v = axisValue(token, axis.id)
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
