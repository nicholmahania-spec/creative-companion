/** Focus timer — off-path tool. ADHD: one instrument, short CTAs. */
import { normalizeLocale, t as i18nT, tFormat, pathLabel } from '../lib/i18n'

export default function InsightsView(props) {
  const {
    setActiveView,
    nextTask,
    focusMinutes,
    focusSeconds,
    sessionLabel,
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
    workLog = [],
    onRemoveWorkEntry,
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
      openForceBreakConsent?.()
      return
    }
    setPref('forceBreaksEnabled', next)
    if (!next && forcedBreak) endForcedBreak?.(true)
    flashToast(next ? 'Breaks on' : 'Breaks off')
  }

  const startLabel = isFocusRunning
    ? 'Pause'
    : focusLeft > 0 && focusLeft < POMODORO_WORK_MIN * 60
      ? 'Resume'
      : 'Start 25'

  return (
    <div className="insights-layout insights-studio">
      <button
        type="button"
        className="back-link"
        onClick={() => go(fromResearch ? 'studio' : 'flow')}
      >
        ← Path
      </button>
      <div className="flow-top">
        <h1 className="page-title">Timer</h1>
        {nextTask && (
          <p className="insights-now" title={nextTask.title}>
            Now · {String(nextTask.title).slice(0, 48)}
            {String(nextTask.title).length > 48 ? '…' : ''}
          </p>
        )}
      </div>

      <section className="panel focus-panel brand-section">
        {/* Time worked, counting up. This read mm:ss of time REMAINING,
            which framed a work session as something running out. */}
        <div className="insights-timer">{sessionLabel || 'not started'}</div>
        <div className="insights-focus-actions">
          <button
            type="button"
            onClick={startOrPauseFocus}
            className={`btn ${!!forcedBreak || (focusLeft === 0 && !isFocusRunning) ? 'btn-secondary' : 'btn-primary'}`}
            disabled={!!forcedBreak || (focusLeft === 0 && !isFocusRunning)}
          >
            {startLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerFocusSource?.(null)
              resetFocus(25)
            }}
            className="btn btn-secondary btn-sm"
            disabled={!!forcedBreak}
          >
            25
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerFocusSource?.(null)
              resetFocus(2)
            }}
            className="btn btn-ghost btn-sm"
            disabled={!!forcedBreak}
          >
            2
          </button>
        </div>

        {sessionComplete && !forcedBreak && (
          <div className="session-done">
            <p className="session-done-line">
              {fromResearch
                ? i18nT(locale, 'ui.timerDoneIdeate') || 'Done · Ideate next'
                : 'Done'}
            </p>
            {fromResearch && (
              <div className="path-continue-row" style={{ margin: 0 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => go('spark')}
                >
                  {tFormat(locale, 'ui.continueNext', {
                    label: pathLabel(locale, 'ideate') || 'Ideate',
                  })}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="settings-row insights-break-row">
          <strong>Break lock</strong>
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

      {/* Your clocked hours. Deliberately NOT the invoice: this is the
          record of where the time went, kept for you, and nothing here is
          billed or sent anywhere. Hours & invoice stays hand-entered. */}
      <section className="panel brand-section work-log-panel">
        <h2 className="work-log-title">Your hours</h2>
        {workLog.length === 0 ? (
          <p className="work-log-empty">
            The clock fills this in while you work. Just for you — nothing here
            goes on an invoice.
          </p>
        ) : (
          <>
            <ul className="work-log-list">
              {[...workLog]
                .sort((a, b) => String(b.date).localeCompare(String(a.date)))
                .map((e) => (
                  <li key={e.id} className="work-log-row">
                    <span className="work-log-date">{e.date}</span>
                    <span className="work-log-stage">{e.stage || e.note}</span>
                    <span className="work-log-hours">
                      {Number(e.hours).toFixed(2)}h
                    </span>
                    {onRemoveWorkEntry && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onRemoveWorkEntry(e.id)}
                        aria-label={`Remove ${e.stage || 'entry'} on ${e.date}`}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
            </ul>
            <p className="work-log-total">
              {workLog
                .reduce((s, e) => s + (Number(e.hours) || 0), 0)
                .toFixed(2)}
              h logged
            </p>
          </>
        )}
      </section>

      <div className="path-continue-row insights-continue">
        {fromResearch ? null : (
          <>
            {nextTask && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => toggleTask(nextTask.id)}
              >
                Mark done
              </button>
            )}
            {(deskTasks.length > 0) && (
              <p className="text-muted insight-hint">
                {completedCount}/{deskTasks.length} steps
              </p>
            )}
          </>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => toggleBodyDoubling()}
        >
          {bodyDoubling ? 'Helper on' : 'Helper'}
        </button>
      </div>
    </div>
  )
}
