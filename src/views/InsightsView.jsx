/** Lazy-loaded Focus timer (off-path tool) */
import { normalizeLocale, t as i18nT, tFormat, pathLabel } from '../lib/i18n'

export default function InsightsView(props) {
  const {
    setActiveView,
    nextTask,
    focusMinutes,
    focusSeconds,
    forcedBreak,
    startOrPauseFocus,
    resetFocus,
    isFocusRunning,
    focusLeft,
    POMODORO_WORK_MIN,
    forceBreaksEnabled,
    setPref,
    bodyDoubling,
    toggleBodyDoubling,
    flashToast,
    endForcedBreak,
    sessionComplete,
    toggleTask,
    completedCount,
    deskTasks,
    prefs = {},
    openForceBreakConsent,
    timerFocusSource = null,
    setTimerFocusSource,
    locale: localeProp = 'en',
  } = props

  const locale = normalizeLocale(localeProp || prefs.locale || 'en')
  const fromResearch = timerFocusSource === 'research'

  const go = (view) => {
    setTimerFocusSource?.(null)
    setActiveView(view)
  }

  const toggleForceBreaks = () => {
    const next = !forceBreaksEnabled
    if (next && !prefs.forceBreaksConsented) {
      // Shared desk consent banner (App) — no silent auto-consent
      openForceBreakConsent?.()
      return
    }
    setPref('forceBreaksEnabled', next)
    if (!next && forcedBreak) {
      endForcedBreak?.(true)
    }
    flashToast(
      next
        ? 'Forced breaks on — desk will lock after cycles'
        : 'Forced breaks off — no lockout'
    )
  }

  return (
    <div className="insights-layout">
      <button
        type="button"
        className="back-link"
        onClick={() => go(fromResearch ? 'studio' : 'flow')}
      >
        ← Path
      </button>
      <div className="flow-top">
        <div>
          <h1 className="page-title">Focus timer</h1>
        </div>
      </div>
      {nextTask && (
        <div className="mood-linked-step" style={{ marginBottom: '1rem' }}>
          <span className="task-badge">Working on</span>
          <p className="mood-linked-title">{nextTask.title}</p>
        </div>
      )}
      <section className="panel focus-panel brand-section">
        <div className="brand-section-label">Timer</div>
        <div className="insights-timer">
          {focusMinutes}:{String(focusSeconds).padStart(2, '0')}
        </div>
        <div className="insights-focus-actions">
          <button
            type="button"
            onClick={startOrPauseFocus}
            className="btn btn-primary"
            disabled={!!forcedBreak || (focusLeft === 0 && !isFocusRunning)}
          >
            {isFocusRunning
              ? 'Pause'
              : focusLeft > 0 && focusLeft < POMODORO_WORK_MIN * 60
                ? 'Resume'
                : focusLeft === 2 * 60
                  ? 'Start 2 min'
                  : 'Start 25 min (Pomodoro)'}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerFocusSource?.(null)
              resetFocus(25)
            }}
            className="btn btn-secondary"
            disabled={!!forcedBreak}
          >
            25 min
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerFocusSource?.(null)
              resetFocus(2)
            }}
            className="btn btn-ghost"
            disabled={!!forcedBreak}
          >
            2 min
          </button>
        </div>
        {sessionComplete && !forcedBreak && (
          <div className="session-done">
            <p style={{ margin: '0 0 0.55rem' }}>
              {fromResearch
                ? i18nT(locale, 'ui.timerDoneIdeate')
                : forceBreaksEnabled
                  ? 'Work block done — a required break lock should open. Rest, then continue.'
                  : 'Work block done. Forced lockouts are off — take a stretch if you want.'}
            </p>
            {fromResearch && (
              <div className="path-continue-row" style={{ margin: 0 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => go('spark')}
                >
                  {tFormat(locale, 'ui.continueNext', {
                    label: pathLabel(locale, 'ideate') || 'Ideate',
                  })}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => go('studio')}
                >
                  {i18nT(locale, 'ui.backToResearch')}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="settings-row" style={{ marginTop: '0.85rem' }}>
          <div>
            <strong>Force break lockouts</strong>
            <span>
              When on: desk locks 5–10 min after a Pomodoro (or 25+ min with
              Helper on). Same consent as Settings.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={forceBreaksEnabled}
            className={`pref-switch${forceBreaksEnabled ? ' is-on' : ''}`}
            onClick={toggleForceBreaks}
          >
            <span className="pref-switch-knob" />
            <span className="sr-only">
              {forceBreaksEnabled ? 'On' : 'Off'}
            </span>
          </button>
        </div>
      </section>
      <section className="panel brand-section">
        <div className="brand-section-label">After</div>
        <div className="timer-after-actions path-continue-row">
          {fromResearch ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => go('spark')}
              >
                {i18nT(locale, 'ui.backToIdeate')}
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => go('studio')}
              >
                {i18nT(locale, 'ui.backToResearch')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!nextTask}
                onClick={() => {
                  if (nextTask) toggleTask(nextTask.id)
                  go('flow')
                }}
              >
                Mark step done
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => go('flow')}
              >
                Back to Sketch
                {deskTasks.length
                  ? ` · ${completedCount}/${deskTasks.length} done`
                  : ''}
              </button>
            </>
          )}
          <button
            type="button"
            className="text-link"
            onClick={() => toggleBodyDoubling()}
          >
            {bodyDoubling ? 'Helper on' : 'Turn Helper on'}
          </button>
        </div>
      </section>
    </div>
  )
}
