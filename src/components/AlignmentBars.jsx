import { AXES, alignmentNote, compareToTarget } from '../lib/brand/alignment'
import '../styles/lazy-alignment.css'

/**
 * Five bars comparing a candidate to the strategy. Never a score.
 *
 * Each row shows the strategy's position and the candidate's on the same
 * ruler, with both poles named. The poles are the readable part — "leans
 * formal" is something a designer can act on, "+0.22" is a number to
 * decode first.
 *
 * This component states, and never advises. Per the product's third
 * principle it may say "this does not meet the standard you picked"; it may
 * not say "use this instead". So there is no verdict, no tick, no cross,
 * and nothing is coloured as an error — a difference is information, not a
 * mistake, and the designer is the one who decides.
 */
export default function AlignmentBars({
  target,
  token,
  thingLabel = 'this',
  /** true when the values were READ from the work (hex, font metrics)
   *  rather than placed on sliders by the designer. Changes what the panel
   *  may honestly claim, so it changes what it says. */
  derived = false,
}) {
  const rows = compareToTarget(target, token)
  const note = alignmentNote(rows)

  /* Show the bars as soon as the STRATEGY says anything, even before this
     typeface has been placed on the rulers. Requiring both sides was wrong:
     the strategy reappearing at the moment of choosing IS the feature, and
     an untagged candidate should show the target it has to meet rather than
     an empty box. Only a project with no strategy at all gets the prompt. */
  const strategySpeaks = rows.some((r) => r.target !== null)
  const tokenSpeaks = rows.some((r) => r.value !== null)

  if (!strategySpeaks && !tokenSpeaks) {
    return (
      <p className="align-empty">
        Set a few words in Strategy — warm, playful, trustworthy — and they
        show up here as you choose.
      </p>
    )
  }

  return (
    <div className="align-block">
      {/* Say what this actually knows, because a cold-start test proved the
          old framing lied. It read the axis values the designer had typed,
          then printed the TYPEFACE NAME into the verdict — so renaming the
          font to Comic Sans left it saying "Comic Sans MS matches your
          strategy", and swapping a palette to the client's explicitly
          forbidden orange changed nothing. It reads no font file and no
          hex. Comparing your own two readings is still worth something —
          it catches you drifting from your own brief — but only if it is
          not dressed up as the app judging the work. */}
      <p className="align-basis">
        {derived
          ? `Read from ${thingLabel} itself, against the words you set in Strategy.`
          : `Comparing where you placed ${thingLabel} against where you placed your words — it does not look at the work itself.`}
      </p>
      {note ? (
        <p className="align-note" role="status">
          {note}
        </p>
      ) : null}
      <ul className="align-rows">
        {rows.map((r) => {
          /* An axis the strategy set but this candidate has not been tagged
             for is NOT the same as one nobody mentioned. Say which. */
          /* A split row must never also render as awaiting: both were
             truthy at once and the two labels concatenated on screen into
             "strategy setstrategy is split". Split wins — it is a fact
             about the strategy, and it outranks anything about the work. */
          const awaiting =
            r.state !== 'split' && r.target !== null && r.value === null
          return (
          <li
            key={r.axis}
            className={`align-row is-${awaiting ? 'awaiting' : r.state}`}
          >
            <span className="align-axis">{r.label}</span>
            <span className="align-poles" aria-hidden="true">
              {r.low}
            </span>
            <span className="align-track">
              {r.state === 'unset' && !awaiting ? null : (
                <>
                  {/* The strategy's position — a line, because it is a
                      target, not a value the candidate has. */}
                  {r.target !== null && (
                    <span
                      className="align-target"
                      style={{ left: `${r.target * 100}%` }}
                    />
                  )}
                  {r.state === 'split' && (
                    /* A split renders as a BAND, not a point. Drawing the
                       mean of two attributes that disagree as a single mark
                       would be the very fiction this state exists to
                       refuse. */
                    <span className="align-band" />
                  )}
                  {r.value !== null && (
                    <span
                      className="align-value"
                      style={{ left: `${r.value * 100}%` }}
                    />
                  )}
                </>
              )}
            </span>
            <span className="align-poles" aria-hidden="true">
              {r.high}
            </span>
            <span className="align-read">
              {awaiting && (derived ? 'not in the colors' : 'strategy set')}
              {!awaiting && r.state === 'unset' && 'not said'}
              {r.state === 'close' && 'matches'}
              {r.state === 'split' && 'strategy is split'}
              {r.state === 'differs' && `leans ${r.direction}`}
            </span>
            {/* The whole row as one sentence for screen readers — the bars
                are meaningless without the poles, and a screen reader
                reading five bare numbers would be worse than silence. */}
            <span className="sr-only">
              {r.label}:{' '}
              {awaiting
                ? derived
                  ? /* Do NOT say "not placed yet" here. On the colour panel
                       there is no slider to place anything with, so that
                       phrasing sends the designer hunting for a control
                       that does not exist — reported in a cold-start run.
                       The truth is simpler: a hex cannot carry this. */
                    `your strategy asks for ${r.target > 0.5 ? r.high : r.low}; a color cannot say`
                  : `your strategy asks for ${r.target > 0.5 ? r.high : r.low}; ${thingLabel} is not placed yet`
                : r.state === 'unset'
                ? 'not said'
                : r.state === 'split'
                  ? `your strategy is split between ${r.low} and ${r.high}`
                  : r.state === 'close'
                    ? 'where you placed it matches your strategy'
                    : `where you placed it leans ${r.direction} of your strategy`}
            </span>
          </li>
          )
        })}
      </ul>
    </div>
  )
}

export { AXES }
