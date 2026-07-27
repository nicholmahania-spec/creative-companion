/**
 * A five-point positioning scale between two poles — "Modern … Traditional".
 *
 * Shared by the Define sheet and both client routes so the control itself is
 * decided in one place. It renders its own <fieldset>/<legend> rather than
 * taking a label from its caller: a radio group cannot be labelled by a
 * <label for=…>, which points at a single control.
 *
 * Each option carries a worded accessible name ("Mostly playful"), so a
 * screen reader announces a position rather than "radio 4 of 5" — the same
 * reason the visible scale has no numbers on it.
 */
import { spectrumChoices } from '../lib/detectiveBrief'

export default function BriefSpectrum({ field, value, onChange, idPrefix }) {
  const choices = spectrumChoices(field.poles)
  const group = `${idPrefix}-${field.id}`
  const [start, end] = field.poles || []
  const chosen = choices.find((c) => c.value === value)

  return (
    <fieldset className="brief-spectrum">
      <legend className="define-field-label">{field.label}</legend>
      <div className="brief-spectrum-scale">
        <span className="brief-spectrum-pole" aria-hidden="true">
          {start}
        </span>
        {choices.map((c) => (
          <label
            key={c.value}
            className={`brief-spectrum-step${value === c.value ? ' is-on' : ''}`}
            title={c.label}
          >
            <input
              type="radio"
              name={group}
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
              /* Clicking the chosen point again clears it. These questions
                 are optional and the form tells clients to leave anything
                 blank, but a radio group has no natural way back to "no
                 answer" — without this, one stray click is permanent. Done
                 on the selection itself rather than with a Clear button per
                 scale, which would put four more controls on the page to
                 undo something you rarely do. */
              onClick={() => {
                if (value === c.value) onChange('')
              }}
            />
            <span className="sr-only">{c.label}</span>
          </label>
        ))}
        <span className="brief-spectrum-pole" aria-hidden="true">
          {end}
        </span>
      </div>
      {/* Say the answer in words once there is one. A filled dot at position
          four of five is a position, not an answer — reading it back meant
          measuring it against the two pole words, and `title` never fires on
          touch, which is most clients. It also gives the clear gesture
          somewhere to be stated: re-clicking the chosen point already
          worked, but invisibly, and an undo nobody can find is no undo at
          all on a question the form says you may leave blank. */}
      {chosen && (
        <p className="brief-spectrum-answer">
          {chosen.label}
          <span className="brief-spectrum-clear-hint">
            {' '}
            · click again to clear
          </span>
        </p>
      )}
    </fieldset>
  )
}
