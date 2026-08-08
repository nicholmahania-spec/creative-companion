import { roleContrastPairs } from '../../lib/color'
import { readabilityLine, resolutionsFor } from '../../lib/contrast/contrastMatrix'

/**
 * The four colour pairings a reader will actually meet.
 *
 * This replaces a control that asked the designer to choose a background from
 * a dropdown of raw hex strings and then listed every other colour against it.
 * Two problems with that: picking "#B3AF8F" from a list means holding the
 * swatch-to-hex mapping in your head, and most of the rows it produced were
 * combinations nobody would ever set type in.
 *
 * WHY FOUR AND NOT ALL OF THEM. A palette of eight colours has 56 ordered
 * pairs; four of them correspond to a surface that ships — body text on the
 * quiet surface, body text on the cover, accent on each. Showing all 56 means
 * showing roughly fifty verdicts on combinations that will never exist, most
 * of them failures, on work the designer just made. This codebase already
 * learned that lesson at the scoring layer: `color.js` records a palette
 * health score that compared every colour against the background and had to be
 * reverted as "a measurement that punished use", with a regression test
 * (`paletteHealth.test.js`) pinning it. A grid would reintroduce the same
 * property in the UI, where that test cannot see it.
 *
 * Each row shows REAL TYPE ON REAL COLOUR, not a swatch pair. Whether text is
 * comfortable to read is not fully expressible as a ratio, and the designer's
 * actual question — can I read that — is answered by looking, not by parsing
 * "4.52:1".
 *
 * An unassigned role is absent, never failed. `roleContrastPairs` filters
 * those out; an unanswered question is not a wrong answer.
 */

const ROW_LABEL = {
  'text-on-quiet': 'Body text on your background',
  'text-on-cover': 'Body text on your cover color',
  'accent-on-quiet': 'Accent on your background',
  'accent-on-cover': 'Accent on your cover color',
}

/* The pair ids encode which role is on which side — 'accent-on-quiet' is the
   accent set on the quiet surface. Derived here rather than adding fields to
   `roleContrastPairs`, which is shared with the palette health score; widening
   a shared return shape for one caller's convenience is how drift starts. */
const rolesOf = (id) => {
  const [fgRole, , bgRole] = String(id).split('-')
  return { fgRole, bgRole }
}

export default function ReadabilityRows({
  roles,
  onApply,
  sample = 'The quick brown fox',
  /* Raised to the AAA bar when the client's brief asked for extra contrast.
     `strictNote` is the client's reason, said out loud — a checker that
     quietly moved its own goalposts would read as broken, and the point of
     this is that somebody ASKED. */
  strict = false,
  strictNote = '',
}) {
  const pairs = roleContrastPairs(roles || {}, { strict })

  /* The raised bar is stated BEFORE the rows, and before there are any rows.
     It sat after the no-pairs early return, so on the screen where it matters
     most — a palette with no roles assigned yet, the moment the designer is
     about to choose them — the app knew the client had asked for AAA and said
     nothing. Measured in a browser: strict was true, the note rendered zero
     times. */
  const note =
    strict && strictNote ? (
      <p className="readability-strict-note" role="status">
        {strictNote}
      </p>
    ) : null

  if (!pairs.length) {
    return (
      <>
        {note}
        <p className="panel-hint">
          Give a color a job above and its readability shows up here.
        </p>
      </>
    )
  }

  return (
    <>
      {note}
      <ul className="readability-rows" aria-label="Readability">
      {pairs.map((pair) => {
        const routes = pair.ok ? [] : resolutionsFor(pair.fg, pair.bg, pair.need)
        const { fgRole, bgRole } = rolesOf(pair.id)
        return (
          <li key={pair.id} className="readability-row">
            <div
              className="readability-sample"
              style={{ background: pair.bg, color: pair.fg }}
            >
              <span className="readability-sample-text">{sample}</span>
            </div>

            <div className="readability-detail">
              <p className="readability-label">{ROW_LABEL[pair.id] || pair.id}</p>
              <p
                className={`readability-verdict${pair.ok ? '' : ' is-short'}`}
                /* Stated, not alarmed. The sentence carries the gap AND the
                   bar, which is strictly more use than a colour could be. */
              >
                {readabilityLine(pair)}
              </p>

              {routes.length > 0 && (
                <ul className="readability-routes">
                  {routes.map((r) => (
                    <li key={r.kind} className="readability-route">
                      {r.kind === 'use-as-is' ? (
                        <span className="readability-route-note">
                          Fine as it is for {r.usableFor.join(' and ')}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="text-link"
                            onClick={() =>
                              onApply?.({
                                ...r,
                                pairId: pair.id,
                                role:
                                  r.kind === 'move-background' ? bgRole : fgRole,
                              })
                            }
                          >
                            {r.kind === 'move-background'
                              ? 'Adjust the background'
                              : 'Adjust the text color'}
                          </button>
                          <span className="readability-route-swatches">
                            <i style={{ background: r.from }} aria-hidden="true" />
                            <span aria-hidden="true">→</span>
                            <i style={{ background: r.to }} aria-hidden="true" />
                            <span className="readability-route-hex">{r.to}</span>
                          </span>
                          {/* The warning that stops this being a trap. A large
                              drift means the suggestion clears the bar and is
                              no longer the designer's colour — the exact thing
                              a confident auto-fix hides behind a tick. */}
                          {r.newColour && (
                            <span className="readability-route-warn">
                              this is really a different color
                            </span>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
      </ul>
    </>
  )
}
