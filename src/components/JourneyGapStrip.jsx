/**
 * Under-path strip: next-gap / ship CTA only.
 * ADHD one-next-action chrome shared across path views.
 * Whether the current step is filled already shows as a checkmark on its
 * own step-nav pill above — a second "this step · enough" chip here was
 * pure duplication of the same signal.
 * G / strip = recovery; primary “Continue · …” lives on each step.
 */
export default function JourneyGapStrip({
  locale,
  thisStepFilled,
  pathNextGap = null,
  leaveBehindThin = false,
  activeView,
  getNextJourney,
  pathLabel,
  i18nT,
  tFormat,
  goToNextProcessGap,
  setActiveView,
}) {
  const journeyNextNow = getNextJourney?.(activeView)
  const earliest =
    pathNextGap &&
    journeyNextNow &&
    journeyNextNow.view !== pathNextGap.view
  /** Already standing on the empty step G would open — hide redundant still-thin */
  const onEarliestGap =
    !!pathNextGap && pathNextGap.view === activeView
  /** This step filled on path but leave-behind still thin for client handoff */
  const showPathMarkPackThin = leaveBehindThin && !!thisStepFilled && !!pathNextGap
  /** Whole path has content but pack still thin */
  const showPathFullPackThin = leaveBehindThin && !pathNextGap

  return (
    <div
      className={`journey-gap-strip${onEarliestGap ? ' is-on-gap' : ''}${
        showPathMarkPackThin || showPathFullPackThin ? ' is-pack-thin' : ''
      }`}
      role="status"
      aria-live="polite"
    >
      {showPathMarkPackThin && (
        <span className="journey-leavebehind-thin" role="status">
          {i18nT(locale, 'ui.pathMarkPackThin')}
        </span>
      )}
      {showPathFullPackThin && (
        <span className="journey-leavebehind-thin" role="status">
          {i18nT(locale, 'ui.pathFullLeaveBehindThin')}
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
            ? // Already on the empty step — quiet recovery, not a second primary
              `Fill · G`
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
