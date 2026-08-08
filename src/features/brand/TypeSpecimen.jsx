import { fontFamilyFromLabel } from '../../lib/color'
import { typeSpecimen } from '../../lib/brand/typeSpecimen'

/**
 * The pairing, set as a hierarchy, at real sizes, in the brand's own colors.
 *
 * This replaces two lines that showed each face's own NAME set in itself. A
 * font name rendered in its own font proves the font loaded; it does not
 * answer the question the screen exists for — does this display face hold a
 * page together above this body face, and does the caption still read at the
 * bottom of it.
 *
 * ON PAPER, NOT ON WORKSPACE CHROME. Type is judged against the surface it
 * will be printed and rendered on, and the app's own panel background is not
 * that surface — a light body face on a themed grey panel reads differently
 * in deep mode, which would make the same pairing look like two different
 * decisions depending on the designer's theme. This uses the brand's own
 * quiet/text roles when they are assigned and falls back to `--paper` /
 * `--paper-ink`, which G4.4 keeps out of `.app.deep` for exactly this reason.
 */
export default function TypeSpecimen({ project = {}, paper, ink }) {
  const rungs = typeSpecimen(project)
  const anyFallback = rungs.some((r) => !r.own)

  return (
    <div className="type-specimen">
      <div
        className="type-specimen-sheet"
        style={{
          background: paper || 'var(--paper)',
          color: ink || 'var(--paper-ink)',
        }}
      >
        {rungs.map((r) => (
          <div key={r.id} className="type-specimen-rung">
            {/* The rung's name and the face it is set in, so a pairing that
                looks wrong can be traced to which of the two faces did it. */}
            <span className="type-specimen-meta">
              {r.label} · {r.px}px · {r.faceLabel}
            </span>
            <p
              className={`type-specimen-line${r.own ? '' : ' is-fallback'}`}
              style={{
                fontFamily: fontFamilyFromLabel(r.faceLabel),
                fontSize: `${r.px}px`,
                fontWeight: r.weight,
                lineHeight: r.px >= 28 ? 1.1 : 1.5,
              }}
            >
              {r.text}
            </p>
          </div>
        ))}
      </div>
      {anyFallback && (
        /* Say which lines are placeholder text. A specimen that silently
           mixes the brand's own sentences with filler invites reading the
           filler as a decision somebody made. */
        <p className="field-hint type-specimen-note">
          Greyed lines are stand-in text — they fill in as you write the
          tagline, promise and positioning on the sheet.
        </p>
      )}
    </div>
  )
}
