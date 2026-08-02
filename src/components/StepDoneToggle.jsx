/**
 * "Mark done" for the stage you are looking at.
 *
 * The app's own completion conditions are proxies (Touchpoints reads
 * `brandSurfaces`, Identity reads craft signals), so a mark drawn in
 * Illustrator or a stage signed off over the phone is invisible to them — and
 * Touchpoints has already shipped a bug where onboarding auto-ticked it before
 * any work existed. The toggle therefore works in BOTH directions: the user's
 * verdict outranks the app's, and the control always visibly does something.
 *
 * One tick, one meaning — the flag counts on the journey bar, the home dots,
 * "what's missing" and the next-gap jump alike. No second grade of done, no
 * "marked manually" asterisk: a tick that shows but does not count is the same
 * broken feedback loop as one that vanishes, and a third symbol is a decode
 * cost on every glance with no action attached.
 *
 * Undo carries no confirm. Nothing is destroyed, the control is its own undo,
 * and a confirm here would read as the app asking whether you are sure you are
 * behind — plus the honest prediction is that the answer is always yes, which
 * makes it a toll rather than a question.
 *
 * Carries a visible word, never a bare glyph: this is not one of the six
 * icon-only patterns, and the ✓ is decorative.
 */
export default function StepDoneToggle({ label, done, onChange }) {
  if (!label || typeof onChange !== 'function') return null

  return (
    <button
      type="button"
      className={`step-done-toggle${done ? ' is-done' : ''}`}
      aria-pressed={done}
      onClick={() => onChange(!done)}
    >
      {done ? (
        <>
          <span aria-hidden="true">✓</span> {label} done · Undo
        </>
      ) : (
        <>Mark {label} done</>
      )}
    </button>
  )
}
