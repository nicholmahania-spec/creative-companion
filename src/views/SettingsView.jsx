import { helperAiStatus } from '../lib/helperAi'
import { LOCALES, normalizeLocale, t as i18nT } from '../lib/i18n'

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
    locale: localeProp,
    requestConfirm,
    openForceBreakConsent,
  } = props
  const aiStatus = helperAiStatus()
  const locale = normalizeLocale(localeProp || prefs.locale || 'en')
  const ask = (label, onConfirm) => {
    if (typeof requestConfirm === 'function') requestConfirm(label, onConfirm)
    else if (window.confirm(label)) onConfirm?.()
  }

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
            </div>
          </div>

          <nav className="settings-jump" aria-label="Settings sections">
            {[
              ['focus', 'Focus'],
              ['data', i18nT(locale, 'ui.data')],
              ['advanced', 'Advanced'],
            ].map(([id, label]) => (
              <a key={id} className="settings-jump-link" href={`#settings-${id}`}>
                {label}
              </a>
            ))}
          </nav>

          <section className="panel brand-section" id="settings-focus">
            <div className="brand-section-label">Focus</div>
            <div className="settings-row">
              <div>
                <strong>Focus mode</strong>
                <span>Dim chrome while typing</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!prefs.focusMode}
                className={`pref-switch${prefs.focusMode ? ' is-on' : ''}`}
                onClick={() => setPref('focusMode', !prefs.focusMode)}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {prefs.focusMode ? 'On' : 'Off'}
                </span>
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Single-task lock</strong>
                <span>Hide sidebar while typing</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!prefs.hideNavUntilBlur}
                className={`pref-switch${prefs.hideNavUntilBlur ? ' is-on' : ''}`}
                onClick={() => setPref('hideNavUntilBlur', !prefs.hideNavUntilBlur)}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {prefs.hideNavUntilBlur ? 'On' : 'Off'}
                </span>
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Focus ring</strong>
                <span>Stronger border on focused field</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setPref(
                    'focusRingStrength',
                    prefs.focusRingStrength === 'high' ? 'normal' : 'high'
                  )
                }
              >
                {prefs.focusRingStrength === 'high' ? 'Normal' : 'High'}
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Batch toasts</strong>
                <span>Queue non-error notices</span>
              </div>
              <select
                className="field-input settings-locale-select"
                value={String(prefs.toastBatchWindow || 0)}
                aria-label="Batch toasts"
                onChange={(e) => setPref('toastBatchWindow', Number(e.target.value))}
              >
                <option value="0">Off</option>
                <option value="30">30s</option>
                <option value="120">2 min</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <strong>{i18nT(locale, 'ui.reduceMotion')}</strong>
                <span>{i18nT(locale, 'ui.reduceMotionHint')}</span>
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
            <div className="settings-row">
              <div>
                <strong>Hide tips</strong>
                <span>Lectures off</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!prefs.hideTips}
                className={`pref-switch${prefs.hideTips ? ' is-on' : ''}`}
                onClick={() => setPref('hideTips', !prefs.hideTips)}
              >
                <span className="pref-switch-knob" />
                <span className="sr-only">
                  {prefs.hideTips ? 'On' : 'Off'}
                </span>
              </button>
            </div>
          </section>

          <section className="panel brand-section" id="settings-appearance">
            <div className="brand-section-label">Appearance</div>
            <div className="settings-row">
              <div>
                <strong>{i18nT(locale, 'language')}</strong>
                <span>{i18nT(locale, 'languageHint')}</span>
              </div>
              <select
                className="field-input settings-locale-select"
                value={locale}
                aria-label={i18nT(locale, 'language')}
                onChange={(e) => setPref('locale', normalizeLocale(e.target.value))}
              >
                {LOCALES.map((L) => (
                  <option key={L.id} value={L.id}>
                    {L.native}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <div>
                <strong>{i18nT(locale, 'ui.theme')}</strong>
                <span>
                  {theme === 'warm'
                    ? i18nT(locale, 'ui.lightThemeOn')
                    : i18nT(locale, 'ui.darkThemeOn')}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => toggleTheme()}
              >
                {theme === 'warm'
                  ? i18nT(locale, 'ui.switchDark')
                  : i18nT(locale, 'ui.switchLight')}
              </button>
            </div>
          </section>

          <details className="panel brand-section settings-advanced" id="settings-advanced">
            <summary className="brand-section-label settings-advanced-sum">
              Advanced
            </summary>
          <section className="settings-advanced-body" id="settings-presence">
            <div className="brand-section-label">
              {i18nT(locale, 'ui.presenceSound')}
            </div>
            <div className="settings-row">
              <div>
                <strong>{i18nT(locale, 'ui.helper')}</strong>
                <span>{i18nT(locale, 'ui.helperHint')}</span>
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
            <p className="panel-hint settings-helper-note">
              {i18nT(locale, 'ui.helperBodyDoubleNote')}
            </p>
            <div className="settings-row">
              <div>
                <strong>{i18nT(locale, 'ui.helperQuiet')}</strong>
                <span>{i18nT(locale, 'ui.helperQuietHint')}</span>
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
                <strong>{i18nT(locale, 'ui.timerSound')}</strong>
                <span>{i18nT(locale, 'ui.timerSoundHint')}</span>
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
                <strong>{i18nT(locale, 'ui.forceBreaksTitle')}</strong>
                <span>{i18nT(locale, 'ui.forceBreaksHint')}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={forceBreaksEnabled}
                className={`pref-switch${forceBreaksEnabled ? ' is-on' : ''}`}
                onClick={() => {
                  const next = !forceBreaksEnabled
                  if (next && !prefs.forceBreaksConsented) {
                    openForceBreakConsent?.()
                    return
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

          <section className="panel brand-section" id="settings-work-prefs">
            <div className="brand-section-label">Desk</div>
            <div className="settings-row">
              <div>
                <strong>Collapse queue</strong>
                <span>Hide waiting steps</span>
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
                <strong>How this works</strong>
                <span>Sketch intro card</span>
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
                <strong>Progress strip</strong>
                <span>Off by default</span>
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
                <strong>Toasts</strong>
                <span>Quiet = errors + exports</span>
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

          <section className="panel brand-section" id="settings-account">
            <div className="brand-section-label">
              {CLOUD ? 'Account & sync' : 'Access'}
            </div>
            <p className="panel-hint settings-lect" style={{ marginBottom: '0.65rem' }}>
              {accessName ? `Signed in as ${accessName}. ` : ''}
              {CLOUD
                ? 'Syncs to Supabase · local cache on this browser'
                : 'Local password unlocks this browser only'}
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
                      flashToast(i18nT(locale, 'ui.syncedOk'))
                    } else {
                      setSyncState('error')
                      setSyncError(result.error || i18nT(locale, 'ui.syncFail'))
                      flashToast(result.error || i18nT(locale, 'ui.syncFail'))
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

          <section className="panel brand-section" id="settings-data">
            <div className="brand-section-label">Your data</div>
            <p className="panel-hint settings-lect" style={{ marginBottom: '0.65rem' }}>
              {CLOUD ? 'Cloud + local cache' : 'Saved on this device'}
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
                  ask(
                    'Replace all data on this device with the backup? Current work will be overwritten.',
                    () => handleImportBackup(file)
                  )
                }}
              />
            </div>
            <div className="settings-danger-zone">
              <p className="settings-danger-title">Danger zone</p>
              <p className="panel-hint settings-lect" style={{ marginBottom: '0.65rem' }}>
                Wipe work · backup first
              </p>
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn btn-ghost settings-danger"
                  onClick={() => {
                    ask(
                      'Wipe this desk and start empty (one blank project)? Download a backup first if needed.',
                      () => {
                        clearToEmpty()
                        setActiveView('flow')
                        flashToast('Empty desk ready')
                      }
                    )
                  }}
                >
                  Start empty desk
                </button>
                <button
                  type="button"
                  className="btn btn-ghost settings-danger"
                  onClick={() => {
                    ask(
                      'Full reset: clear all data and show first-run setup again?',
                      () => {
                        clearAllData()
                        setShowOnboarding(true)
                        setActiveView('project')
                        flashToast('Reset — set up your real project')
                      }
                    )
                  }}
                >
                  Full reset + setup
                </button>
              </div>
            </div>
          </section>

            <div className="settings-row" style={{ marginTop: '0.75rem' }}>
              <div>
                <strong>Demo</strong>
                <span>Replaces workspace</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => loadSoftSignalDemo()}
              >
                Soft Signal
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Helper AI</strong>
                <span>{aiStatus.detail}</span>
              </div>
              <span className={`helper-ai-badge is-${aiStatus.mode}`}>
                {aiStatus.short}
              </span>
            </div>
            <div className="settings-row" id="settings-about">
              <div>
                <strong>Version</strong>
                <span>
                  {versionLabel()}
                  {APP_BUILD_DATE ? ` · ${APP_BUILD_DATE}` : ''}
                </span>
              </div>
            </div>
            <p className="panel-hint settings-lect" style={{ margin: '0.5rem 0 0' }}>
              <a className="text-link" href="https://chadd.org/" target="_blank" rel="noopener noreferrer">
                CHADD
              </a>
              {' · not medical advice'}
            </p>
          </details>
        </div>
  )
}
