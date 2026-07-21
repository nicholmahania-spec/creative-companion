/**
 * Under-path recovery only when the user is ON the empty step (quiet G),
 * or path is full (ship). Primary “Next · …” lives on each step.
 * Never shout “First empty · Define” while working later steps.
 */
export default function JourneyGapStrip({
  locale,
  pathNextGap = null,
  leaveBehindThin = false,
  activeView,
  pathLabel,
  i18nT,
  goToNextProcessGap,
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
          {i18nT(
            locale,
            showPathFullPackThin
              ? 'ui.pathFullLeaveBehindThin'
              : 'ui.pathMarkPackThin'
          )}
        </span>
      )}
      {onEarliestGap && pathNextGap && (
        <button
          type="button"
          className="journey-gap-strip-btn is-quiet"
          onClick={() => goToNextProcessGap()}
          title={`G · ${pathLabel(locale, pathNextGap.id) || pathNextGap.label}`}
        >
          G
        </button>
      )}
      {pathFull && (
        <button
          type="button"
          className="journey-gap-strip-btn is-ship"
          onClick={() => setActiveView('finish')}
          title={i18nT(locale, 'ui.processFullDeliver')}
        >
          {i18nT(locale, 'ui.shipBrandBook')}
        </button>
      )}
    </div>
  )
}
