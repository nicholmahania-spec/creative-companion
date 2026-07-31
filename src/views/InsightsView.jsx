/** Focus timer — off-path tool. ADHD: one instrument, short CTAs. */
import '../styles/lazy-sketch.css'

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
    /** Journey view to restore when leaving Timer (not Sketch-by-default). */
    pathReturnView = 'project',
  } = props

  const fromResearch = timerFocusSource === 'research'

  const go = (view) => {
    setTimerFocusSource?.(null)
    setActiveView(view)
  }

  const backToPath = () =>
    go(fromResearch ? 'studio' : pathReturnView || 'project')

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
        onClick={backToPath}
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
        {/* The FOCUS TIMER's own countdown, and nothing else.
            This showed `sessionLabel` — the work clock's count-up — so the
            page called "Timer" displayed a number that climbed on its own
            the moment you opened it, whether or not you had ever pressed
            start. It looked exactly like a timer you did not start, because
            the only thing separating the two is that one of them waits to be
            chosen. It has to read as stopped until it is. */}
        <div className="insights-timer">
          {isFocusRunning || focusLeft < POMODORO_WORK_MIN * 60
            ? `${focusMinutes}:${String(focusSeconds).padStart(2, '0')}`
            : 'not started'}
        </div>
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
                ? 'Timer finished. Ideate is under Tools — or stay on Research.'
                : 'Done'}
            </p>
            {fromResearch && (
              <div className="path-continue-row" style={{ margin: 0 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => go('spark')}
                >
                  {'Next · Ideate'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* "Break lock" is a coined name, so two weeks later it is recall
            rather than reading. The line states the mechanical consequence and
            nothing else — no "stops you skipping breaks", which blames the
            reader for a setting they are being asked to opt into, and makes
            turning it back off feel like an admission. The consent dialog
            already carries the detail, at the moment it matters. */}
        <div className="settings-row insights-break-row">
          <span className="insights-break-copy">
            <strong>Break lock</strong>
            <span className="insights-break-hint">
              When the timer ends, the screen locks until you take the break.
            </span>
          </span>
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
