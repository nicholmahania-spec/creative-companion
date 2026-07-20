/**
 * Under-path strip: this-step fill chip + still-thin links + next-gap / ship CTA.
 * ADHD one-next-action chrome shared across path views.
 * G / strip = recovery; primary “Continue · …” lives on each step.
 */
export default function JourneyGapStrip({
  locale,
  thisStepFilled,
  thisStepHint,
  pathMissingShown = [],
  pathMissingRows = [],
  pathMissingExtra = 0,
  pathNextGap = null,
  leaveBehindThin = false,
  activeView,
  getNextJourney,
  pathLabel,
  i18nT,
  tFormat,
  goToProcessStep,
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
      <span
        className={`step-fill-chip${
          thisStepFilled ? ' is-filled' : ' is-open'
        }`}
        title={thisStepHint || undefined}
      >
        {thisStepFilled
          ? i18nT(locale, 'ui.stepFilled')
          : thisStepHint
            ? tFormat(locale, 'ui.openStepChip', { label: thisStepHint })
            : i18nT(locale, 'ui.stepOpen')}
      </span>
      {pathMissingShown.length > 0 && !onEarliestGap && (
        <span
          className="journey-still-thin"
          title={pathMissingRows
            .map((r) => pathLabel(locale, r.id) || r.label)
            .join(' · ')}
        >
          <strong>{i18nT(locale, 'ui.stillThin')}:</strong>{' '}
          <span className="journey-still-thin-list">
            {pathMissingShown.map((r, i) => (
              <span key={r.id}>
                {i > 0 ? ' · ' : null}
                <button
                  type="button"
                  className="journey-still-thin-link"
                  onClick={() => goToProcessStep(r)}
                >
                  {pathLabel(locale, r.id) || r.label}
                </button>
              </span>
            ))}
            {pathMissingExtra > 0 ? ` · +${pathMissingExtra}` : null}
          </span>
        </span>
      )}
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
