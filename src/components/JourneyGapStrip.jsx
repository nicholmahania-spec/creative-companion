/**
 * Under-path recovery only when the path is full (ship). Primary
 * “Next · …” lives on each step. Never shout “First empty · Define”
 * while working later steps.
 */
import { labelForStepId } from '../lib/journey'

export default function JourneyGapStrip({
  pathNextGap = null,
  leaveBehindThin = false,
  activeView,
  setActiveView,
  thisStepFilled,
}) {
  const onEarliestGap = !!pathNextGap && pathNextGap.view === activeView
  const pathFull = !pathNextGap
  const showPathMarkPackThin =
    leaveBehindThin && !!thisStepFilled && !!pathNextGap && onEarliestGap
  const showPathFullPackThin = leaveBehindThin && pathFull

  // Nothing useful: not on gap, path not full, no thin warning
  if (!onEarliestGap && !pathFull && !showPathFullPackThin) {
    return null
  }

  return (
    <div
      className={`journey-gap-strip${onEarliestGap ? ' is-on-gap' : ''}${
        showPathMarkPackThin || showPathFullPackThin ? ' is-pack-thin' : ''
      }`}
      role="status"
      aria-live="polite"
    >
      {(showPathMarkPackThin || showPathFullPackThin) && (
        <span className="journey-leavebehind-thin" role="status">
          {showPathFullPackThin
            ? 'Client pack still thin for handoff'
            : 'Need tagline or ★ pins for client pack'}
        </span>
      )}
      {pathFull && (
        <button
          type="button"
          className="journey-gap-strip-btn is-ship"
          onClick={() => setActiveView('finish')}
          title={`Steps look full · open ${labelForStepId('deliver')}`}
        >
          Download brand book PDF
        </button>
      )}
    </div>
  )
}
