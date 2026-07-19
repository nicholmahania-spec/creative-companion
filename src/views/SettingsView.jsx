import { helperAiStatus } from '../lib/helperAi'

/** Lazy-loaded Settings view */
export default function SettingsView(props) {
  const {
    setActiveView, CLOUD, accessName, syncState, syncError, pushWorkspace,
    exportAllData, setSyncState, setSyncError, handleSignOut, theme, toggleTheme,
    reduceMotion, soundEnabled, showHowItWorks, showProgress, queueCollapsed,
    forceBreaksEnabled, setPref, bodyDoubling, toggleBodyDoubling, flashToast,
    forcedBreak, endForcedBreak, prefs, pwCurrent, setPwCurrent, pwNext, setPwNext,
    changeAccessPassword, downloadDataBackup, handleImportBackup, importFileRef,
    clearToEmpty, clearAllData, setShowOnboarding, loadSoftSignalDemo,
    versionLabel, APP_BUILD, APP_BUILD_DATE, STORAGE_EXPLAIN, notifyAction,
    createNewProject,
  } = props
  const aiStatus = helperAiStatus()

  return (
        <div className="settings-view">
          <button
            type="button"
            className="back-link"
            onClick={() => setActiveView('project')}
          >
            ← Path
          </button>
          <div className="flow-top">
            <div>
              <h1 className="page-title">Settings</h1>
              <p className="page-sub">
                {CLOUD
                  ? 'Preferences, account, and data for your cloud desk.'
                  : 'Preferences and data for this device.'}
              </p>
            </div>
          </div>

          <section className="panel brand-section">
            <div className="brand-section-label">Appearance</div>
            <div className="settings-row">
              <div>
                <strong>Theme</strong>
                <span>Light or dark screen comfort</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => toggleTheme()}
              >
                {theme === 'warm' ? 'Switch to dark' : 'Switch to light'}
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Screen</strong>
                <span>
                  {theme === 'warm' ? 'Light' : 'Dark'}
                  {theme === 'warm' ? ' (warm paper)' : ' (deep charcoal)'}
                </span>
              </div>
            </div>
            <div className="settings-row">
              <div>
                <strong>Reduce motion</strong>
                <span>Less animation</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reduceMotion}
                className={`pref-switch${reduceMotion ? ' is-on' : ''}`}
                onClick={() => setPref('reduceMotion', !reduceMotion)}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {reduceMotion ? 'On' : 'Off'}
                </span>
              </button>
            </div>
          </section>

          <section className="panel brand-section">
            <div className="brand-section-label">Presence &amp; sound</div>
            <div className="settings-row">
              <div>
                <strong>Helper</strong>
                <span>
                  Corner coach (Coach · Critique · Break). Forced desk lockouts
                  are the separate switch below.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={bodyDoubling}
                className={`pref-switch${bodyDoubling ? ' is-on' : ''}`}
                onClick={() => toggleBodyDoubling()}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {bodyDoubling ? 'On' : 'Off'}
                </span>
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Helper quiet mode</strong>
                <span>
                  No timed pings or hyperfocus nags — only when you open Helper
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!prefs.helperQuiet}
                className={`pref-switch${prefs.helperQuiet ? ' is-on' : ''}`}
                onClick={() => setPref('helperQuiet', !prefs.helperQuiet)}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {prefs.helperQuiet ? 'On' : 'Off'}
                </span>
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Timer sound</strong>
                <span>Chime when a focus session ends</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={soundEnabled}
                className={`pref-switch${soundEnabled ? ' is-on' : ''}`}
                onClick={() => setPref('soundEnabled', !soundEnabled)}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {soundEnabled ? 'On' : 'Off'}
                </span>
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Force break lockouts</strong>
                <span>
                  Hard lock only: full-desk freeze after Pomodoro / long Helper
                  sessions. Soft tips still work if this is off.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={forceBreaksEnabled}
                className={`pref-switch${forceBreaksEnabled ? ' is-on' : ''}`}
                onClick={() => {
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
                    endForcedBreak(true)
                  }
                  flashToast(
                    next ? 'Forced break lockouts on' : 'Forced break lockouts off'
                  )
                }}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {forceBreaksEnabled ? 'On' : 'Off'}
                </span>
              </button>
            </div>
          </section>

          <section className="panel brand-section">
            <div className="brand-section-label">Work</div>
            <div className="settings-row">
              <div>
                <strong>Collapse queue by default</strong>
                <span>Only show the current step</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={queueCollapsed}
                className={`pref-switch${queueCollapsed ? ' is-on' : ''}`}
                onClick={() => setPref('queueCollapsed', !queueCollapsed)}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {queueCollapsed ? 'On' : 'Off'}
                </span>
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Show “How this works”</strong>
                <span>Intro card on Work</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showHowItWorks}
                className={`pref-switch${showHowItWorks ? ' is-on' : ''}`}
                onClick={() => setPref('showHowItWorks', !showHowItWorks)}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {showHowItWorks ? 'On' : 'Off'}
                </span>
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Progress bar (XP)</strong>
                <span>Optional level / quest strip under the path</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showProgress}
                className={`pref-switch${showProgress ? ' is-on' : ''}`}
                onClick={() => setPref('showProgress', !showProgress)}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {showProgress ? 'On' : 'Off'}
                </span>
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Toast detail</strong>
                <span>
                  Quiet hides micro feedback (stars, roles, helper). Errors and
                  pack download always show.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setPref(
                    'toastMode',
                    prefs.toastMode === 'all' ? 'quiet' : 'all'
                  )
                }
              >
                {prefs.toastMode === 'all' ? 'Use quiet' : 'Show all'}
              </button>
            </div>
          </section>

          <section className="panel brand-section">
            <div className="brand-section-label">
              {CLOUD ? 'Account & sync' : 'Access'}
            </div>
            <p className="panel-hint" style={{ marginBottom: '0.65rem' }}>
              {accessName ? `Signed in as ${accessName}. ` : ''}
              {CLOUD
                ? 'Your desk syncs to Supabase. This browser also keeps a local cache.'
                : 'Local password unlocks this browser only. Add Supabase env vars for cloud accounts.'}
            </p>
            {CLOUD && (
              <p className="panel-hint" style={{ marginBottom: '0.85rem' }}>
                Sync:{' '}
                <strong>
                  {syncState === 'syncing'
                    ? 'Saving…'
                    : syncState === 'error'
                      ? 'Error'
                      : syncState === 'ok'
                        ? 'Up to date'
                        : 'Idle'}
                </strong>
                {syncError ? ` — ${syncError}` : ''}
              </p>
            )}
            <div className="settings-actions" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSignOut}
              >
                {CLOUD ? 'Sign out' : 'Sign out / lock'}
              </button>
              {CLOUD && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async () => {
                    setSyncState('syncing')
                    const result = await pushWorkspace(exportAllData())
                    if (result.ok) {
                      setSyncState('ok')
                      setSyncError('')
                      flashToast('Synced to cloud')
                    } else {
                      setSyncState('error')
                      setSyncError(result.error || 'Sync failed')
                      flashToast(result.error || 'Sync failed')
                    }
                  }}
                >
                  Sync now
                </button>
              )}
            </div>
            {!CLOUD && (
              <>
                <div className="field-block" style={{ marginBottom: '0.65rem' }}>
                  <label className="field-label" htmlFor="pw-current">
                    Change local password
                  </label>
                  <input
                    id="pw-current"
                    type="password"
                    className="field-input"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    placeholder="Current password"
                    autoComplete="current-password"
                  />
                </div>
                <div className="capture-row" style={{ marginBottom: '0.5rem' }}>
                  <input
                    type="password"
                    className="field-input"
                    value={pwNext}
                    onChange={(e) => setPwNext(e.target.value)}
                    placeholder="New password (6+ chars)"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!pwCurrent || pwNext.length < 6}
                    onClick={async () => {
                      const result = await changeAccessPassword(
                        pwCurrent,
                        pwNext
                      )
                      if (result.ok) {
                        setPwCurrent('')
                        setPwNext('')
                        flashToast('Password updated')
                      } else {
                        flashToast(result.error || 'Could not update')
                      }
                    }}
                  >
                    Update
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="panel brand-section">
            <div className="brand-section-label">Your data</div>
            <p className="panel-hint" style={{ marginBottom: '0.65rem' }}>
              {CLOUD
                ? 'Your desk syncs to the cloud. Keep a JSON backup for portability.'
                : 'Work is saved on this device. Export a backup if it matters.'}
            </p>
            <details className="settings-advanced">
              <summary>Advanced storage</summary>
              <p className="panel-hint" style={{ margin: '0.5rem 0' }}>
                {CLOUD
                  ? 'Cloud + browser cache. JSON export is the best portable backup.'
                  : STORAGE_EXPLAIN.summary}
              </p>
              <p className="panel-hint">
                Cache key:{' '}
                <code className="settings-code">
                  {STORAGE_EXPLAIN.workDataKey}
                </code>
                {CLOUD ? ' · table: user_workspaces' : ''}
              </p>
            </details>
            <div className="settings-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={downloadDataBackup}
              >
                Download JSON backup
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => importFileRef.current?.click()}
              >
                Import JSON backup
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="Import JSON backup file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  if (
                    !window.confirm(
                      'Replace all data on this device with the backup? Current work will be overwritten.'
                    )
                  ) {
                    return
                  }
                  handleImportBackup(file)
                }}
              />
            </div>
            <div className="settings-danger-zone">
              <p className="settings-danger-title">Danger zone</p>
              <p className="panel-hint" style={{ marginBottom: '0.65rem' }}>
                These replace or wipe work. Download a backup first.
              </p>
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn btn-ghost settings-danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Wipe this desk and start empty (one blank project)? This cannot be undone unless you have a backup.'
                      )
                    ) {
                      clearToEmpty()
                      setActiveView('flow')
                      flashToast('Empty desk ready')
                    }
                  }}
                >
                  Start empty desk
                </button>
                <button
                  type="button"
                  className="btn btn-ghost settings-danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Full reset: clear all data and show first-run setup again?'
                      )
                    ) {
                      clearAllData()
                      setShowOnboarding(true)
                      setActiveView('project')
                      flashToast('Reset — set up your real project')
                    }
                  }}
                >
                  Full reset + setup
                </button>
              </div>
            </div>
          </section>

          <section className="panel brand-section">
            <div className="brand-section-label">Optional sample</div>
            <p className="panel-hint" style={{ marginBottom: '0.65rem' }}>
              Load a finished sample brand run to see the full path. It
              replaces your current workspace — export a backup first.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (
                  window.confirm(
                    'Replace your workspace with the Soft Signal sample project?'
                  )
                ) {
                  loadSoftSignalDemo()
                }
              }}
            >
              Load Soft Signal demo project
            </button>
          </section>

          <section className="panel brand-section">
            <div className="brand-section-label">Helper AI</div>
            <div className="settings-row">
              <div>
                <strong>{aiStatus.label}</strong>
                <span>{aiStatus.detail}</span>
              </div>
              <span className={`helper-ai-badge is-${aiStatus.mode}`}>
                {aiStatus.short}
              </span>
            </div>
            {aiStatus.mode === 'scripted' && (
              <p className="panel-hint" style={{ margin: '0.35rem 0 0' }}>
                For Live AI: set <code className="settings-code">XAI_API_KEY</code>{' '}
                with a proxy (Netlify / Vite), or{' '}
                <code className="settings-code">VITE_XAI_USE_PROXY=true</code>.
                See docs/DEPLOY_AI.md.
              </p>
            )}
            <div className="settings-row" style={{ marginTop: '0.75rem' }}>
              <div>
                <strong>Hide pack watermark</strong>
                <span>Remove tool footer on direction sheet / PDF</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!prefs.hidePackWatermark}
                className={`pref-switch${prefs.hidePackWatermark ? ' is-on' : ''}`}
                onClick={() =>
                  setPref('hidePackWatermark', !prefs.hidePackWatermark)
                }
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {prefs.hidePackWatermark ? 'On' : 'Off'}
                </span>
              </button>
            </div>
          </section>

          <section className="panel brand-section">
            <div className="brand-section-label">About</div>
            <div className="settings-row">
              <div>
                <strong>Version</strong>
                <span>
                  {versionLabel()}
                  {APP_BUILD_DATE ? ` · ${APP_BUILD_DATE}` : ''}
                  {APP_BUILD ? ` · ${APP_BUILD}` : ''}
                </span>
              </div>
            </div>
            <p className="panel-hint" style={{ margin: '0 0 0.5rem' }}>
              Creative Companion is a desk for ADHD creative work: one step at
              a time, optional Helper, optional forced breaks, and brand pack
              export
              {CLOUD ? ' — with optional cloud sync when configured.' : '.'}
            </p>
            <p className="panel-hint" style={{ margin: '0 0 0.5rem' }}>
              <strong>Offline:</strong> After one online visit, the app shell
              and assets cache locally. Your desk data is on this device — open
              Pack and download when offline.
            </p>
            <p className="panel-hint" style={{ margin: 0 }}>
              <strong>1.0:</strong> Full path desk + pack export, quiet/all
              toasts, offline SPA, axe + e2e CI, perf budget. See docs/RELEASE_1.0.md.
            </p>
          </section>
        </div>
  )
}
