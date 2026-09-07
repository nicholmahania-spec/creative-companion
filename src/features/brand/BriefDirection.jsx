import { labelForStepId } from '../../lib/journey/journey'
import { briefDirection } from '../../lib/brand/briefDirection'

/**
 * What the brief already settled, read on the Identity bench.
 *
 * IDENTITY CONSUMES THE BRIEF. Before this block, a designer choosing a
 * typeface held "warm, approachable, new parents" in their head or left
 * Identity to go and re-read the brief — an interruption that also lost the
 * artboard — while the app held every one of those answers. Now they sit at
 * the top of the tool column, read-only, with one route back to where they
 * are written. Nothing here is a control and nothing here is a copy: every
 * line resolves live from `detective`, so a brief edited tomorrow shows
 * through with nothing to sync.
 *
 * SCOPED TO THE SCREEN. Six lines repeated on every tool screen is six
 * lines of re-reading per screen with no decision attached — clutter, not
 * context. The strategy words always show, because they drive the alignment
 * bars right beside them; the prose lines are only the ones this screen's
 * decision actually bears on. Not collapsible: a toggle is a decision plus a
 * remembered state, and "did I close this or is it empty?" is the wrong
 * question to leave a designer with.
 *
 * NOT ON THE ARTBOARD. The sheet prints into the client pack; a competitor
 * list and an accessibility note are the designer's working material, not a
 * line on the brand's own leave-behind.
 */

export default function BriefDirection({ project, substep, onEditInBrief }) {
  const { words, lines } = briefDirection(project, substep)
  /* Nothing answered, nothing rendered. An empty "from the brief" box on a
     design bench would be a prompt to go and fill in a form. */
  if (!words.length && !lines.length) return null
  return (
    <section
      className="panel brand-section identity-brief"
      aria-label="From the brief"
      data-testid="identity-brief"
    >
      <header className="design-section-head">
        <h2 className="design-section-title identity-brief-title">
          From the brief
        </h2>
        <span className="design-section-rule" aria-hidden="true" />
        {onEditInBrief ? (
          <button
            type="button"
            className="text-link identity-brief-home"
            onClick={onEditInBrief}
          >
            {`Edit in ${labelForStepId('define')}`}
          </button>
        ) : null}
      </header>
      {words.length > 0 && (
        <ul className="identity-brief-words" aria-label="Brand words">
          {words.map((w) => (
            <li key={w} className="identity-brief-word">
              {w}
            </li>
          ))}
        </ul>
      )}
      {lines.length > 0 && (
        <dl className="identity-brief-lines">
          {lines.map((l) => (
            <div key={l.id} className="identity-brief-line">
              <dt className="kicker">{l.label}</dt>
              <dd>{l.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
