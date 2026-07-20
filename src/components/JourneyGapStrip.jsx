/**
 * Under-path strip: this-step fill chip + still-thin links + next-gap / ship CTA.
 * ADHD one-next-action chrome shared across path views.
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
  return (
    <div className="journey-gap-strip" role="status" aria-live="polite">
      <span
        className={`step-fill-chip${
          thisStepFilled ? ' is-filled' : ' is-open'
        }`}
        title={thisStepHint || undefined}
      >
        {thisStepFilled
          ? i18nT(locale, 'ui.stepFilled')
          : thisStepHint
            ? tFormat(locale, 'ui.openStepMicro', { label: thisStepHint })
            : i18nT(locale, 'ui.stepOpen')}
      </span>
      {pathMissingShown.length > 0 && (
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
      {!pathNextGap && leaveBehindThin && (
        <span className="journey-leavebehind-thin" role="status">
          {i18nT(locale, 'ui.pathFullLeaveBehindThin')}
        </span>
      )}
      {pathNextGap ? (
        <button
          type="button"
          className="journey-gap-strip-btn"
          onClick={() => goToNextProcessGap()}
          title="Keyboard G"
        >
          {(() => {
            const gapLabel =
              pathLabel(locale, pathNextGap.id) || pathNextGap.label
            const journeyNextNow = getNextJourney?.(activeView)
            const earliest =
              journeyNextNow && journeyNextNow.view !== pathNextGap.view
            return earliest
              ? tFormat(locale, 'ui.earliestEmptyBtn', {
                  label: gapLabel,
                })
              : tFormat(locale, 'ui.nextGapBtn', { label: gapLabel })
          })()}
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
