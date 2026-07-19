/** Lazy-loaded InsightsView */
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
  } = props

  const toggleForceBreaks = () => {
    const next = !forceBreaksEnabled
    if (next && !prefs.forceBreaksConsented) {
      const ok = window.confirm(
        'Forced breaks lock the whole desk for 5–10 minutes after a Pomodoro (or long Helper sessions). You can turn this off anytime. Enable?'
      )
      if (!ok) return
      setPref('forceBreaksConsented', true)
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
        onClick={() => setActiveView('flow')}
      >
        ← Work
      </button>
      <div className="flow-top">
        <div>
          <h1 className="page-title">Focus timer</h1>
          <p className="page-sub">
            Hold attention · then complete the current step
          </p>
        </div>
      </div>
      {nextTask && (
        <div className="mood-linked-step" style={{ marginBottom: '1rem' }}>
          <span className="task-badge">Work on</span>
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
            onClick={() => resetFocus(25)}
            className="btn btn-secondary"
            disabled={!!forcedBreak}
          >
            25 min
          </button>
          <button
            type="button"
            onClick={() => resetFocus(2)}
            className="btn btn-ghost"
            disabled={!!forcedBreak}
          >
            2 min
          </button>
        </div>
        {sessionComplete && !forcedBreak && (
          <p className="session-done">
            {forceBreaksEnabled
              ? 'Work block done — a required break lock should open. Rest, then continue.'
              : 'Work block done. Forced lockouts are off — take a stretch if you want.'}
          </p>
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
        <div className="help-grid help-grid-3">
          <button
            type="button"
            className="help-card"
            disabled={!nextTask}
            onClick={() => {
              if (nextTask) toggleTask(nextTask.id)
              setActiveView('flow')
            }}
          >
            <strong>Mark step done</strong>
            <span>Complete current desk step</span>
          </button>
          <button
            type="button"
            className="help-card"
            onClick={() => setActiveView('flow')}
          >
            <strong>Back to Work</strong>
            <span>
              {completedCount}/{deskTasks.length || 0} done
            </span>
          </button>
          <button
            type="button"
            className="help-card"
            onClick={() => toggleBodyDoubling()}
          >
            <strong>Helper</strong>
            <span>{bodyDoubling ? 'On' : 'Turn on'}</span>
          </button>
        </div>
      </section>
    </div>
  )
}
