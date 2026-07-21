/**
 * Under-path recovery only — single quiet control.
 * Primary “Next · …” lives on each step (path-continue-row).
 * Path rail checkmarks already show fill state.
 */
export default function JourneyGapStrip({
  locale,
  pathNextGap = null,
  leaveBehindThin = false,
  activeView,
  getNextJourney,
  pathLabel,
  i18nT,
  tFormat,
  goToNextProcessGap,
  setActiveView,
  thisStepFilled,
}) {
  const journeyNextNow = getNextJourney?.(activeView)
  const earliest =
    pathNextGap &&
    journeyNextNow &&
    journeyNextNow.view !== pathNextGap.view
  const onEarliestGap = !!pathNextGap && pathNextGap.view === activeView
  const showPathMarkPackThin =
    leaveBehindThin && !!thisStepFilled && !!pathNextGap
  const showPathFullPackThin = leaveBehindThin && !pathNextGap

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
      {pathNextGap ? (
        <button
          type="button"
          className={`journey-gap-strip-btn${
            onEarliestGap ? ' is-quiet' : ''
          }`}
          onClick={() => goToNextProcessGap()}
          title="Keyboard G"
        >
          {onEarliestGap
            ? 'G'
            : earliest
              ? tFormat(locale, 'ui.earliestEmptyBtn', {
                  label:
                    pathLabel(locale, pathNextGap.id) || pathNextGap.label,
                })
              : tFormat(locale, 'ui.nextGapBtn', {
                  label:
                    pathLabel(locale, pathNextGap.id) || pathNextGap.label,
                })}
        </button>
      ) : (
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
