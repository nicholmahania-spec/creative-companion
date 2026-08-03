import '../styles/lazy-settings.css'

/**
 * Settings — one door, open surface (no Advanced nest).
 *
 * Calm prefs + data/account only. Focus-mask knobs, Desk chrome toggles,
 * Helper, and break-lock left as store defaults (no UI). Tools menu is
 * separate (off-path work). Samples stay here so Soft Signal can replace
 * a live desk (empty-home demos cannot).
 */
export default function SettingsView(props) {
  const {
    setActiveView,
    CLOUD,
    accessName,
    syncState,
    syncError,
    runCloudPush,
    handleSignOut,
    theme,
    toggleTheme,
    openShortcuts,
    reduceMotion,
    setPref,
    flashToast,
    prefs,
    pwCurrent,
    setPwCurrent,
    pwNext,
    setPwNext,
    changeAccessPassword,
    downloadDataBackup,
    handleImportBackup,
    importFileRef,
    clearToEmpty,
    clearAllData,
    loadSoftSignalDemo,
    loadHarborHearthDemo,
    versionLabel,
    APP_BUILD_DATE,
    requestConfirm,
  } = props

  const ask = (label, onConfirm) => {
    if (typeof requestConfirm === 'function') requestConfirm(label, onConfirm)
    else if (window.confirm(label)) onConfirm?.()
  }

  return (
    <div className="settings-view settings-studio">
      <div className="flow-top">
        <h1 className="page-title">Settings</h1>
        <p className="settings-intro">
          Calm typing and desk data. Everything here is already open.
        </p>
      </div>

      <section className="panel brand-section" id="settings-calm">
        <div className="brand-section-label">Calm</div>

        <SettingsSwitch
          label="Hide nav while typing"
          checked={!!prefs.hideNavUntilBlur}
          onToggle={() => setPref('hideNavUntilBlur', !prefs.hideNavUntilBlur)}
        />
        <SettingsSwitch
          label="Less motion"
          checked={reduceMotion}
          onToggle={() => setPref('reduceMotion', !reduceMotion)}
        />
        <SettingsSwitch
          label="Hide tips"
          checked={!!prefs.hideTips}
          onToggle={() => setPref('hideTips', !prefs.hideTips)}
        />
        <div className="settings-row">
          <strong>Toasts</strong>
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
            {prefs.toastMode === 'all' ? 'Quiet' : 'All'}
          </button>
        </div>
        <div className="settings-row">
          <strong>Theme</strong>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => toggleTheme()}
          >
            {theme === 'warm' ? 'Switch to dark' : 'Switch to light'}
          </button>
        </div>
        {openShortcuts ? (
          <div className="settings-row">
            <strong>Keyboard shortcuts</strong>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openShortcuts()}
            >
              Show
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel brand-section" id="settings-data">
        <div className="brand-section-label">
          {CLOUD ? 'Account' : 'Access'} · Data
        </div>
        {accessName ? (
          <p className="settings-meta" role="status">
            {accessName}
            {CLOUD
              ? ` · ${
                  syncState === 'syncing'
                    ? 'Saving…'
                    : syncState === 'error'
                      ? 'Error'
                      : syncState === 'ok'
                        ? 'Synced'
                        : 'Idle'
                }`
              : ''}
            {syncError ? ` — ${syncError}` : ''}
          </p>
        ) : null}
        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSignOut}
          >
            {CLOUD ? 'Sign out' : 'Lock'}
          </button>
          {CLOUD ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={syncState === 'syncing'}
              onClick={async () => {
                const result = await runCloudPush()
                if (result.ok) {
                  flashToast('Desk saved to the cloud')
                } else {
                  flashToast(result.error || 'Could not sync right now')
                }
              }}
            >
              {syncState === 'syncing' ? 'Syncing…' : 'Sync'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={downloadDataBackup}
          >
            Backup
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => importFileRef.current?.click()}
          >
            Import
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
              ask('Replace all data with backup?', () =>
                handleImportBackup(file)
              )
            }}
          />
        </div>
        {!CLOUD ? (
          <div className="settings-pw-block">
            <label className="field-label" htmlFor="pw-current">
              Password
            </label>
            <div className="capture-row">
              <input
                id="pw-current"
                type="password"
                className="field-input"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                placeholder="Current"
                autoComplete="current-password"
              />
              <input
                id="pw-next"
                type="password"
                className="field-input"
                value={pwNext}
                onChange={(e) => setPwNext(e.target.value)}
                placeholder="New (6+)"
                autoComplete="new-password"
                aria-label="New password"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!pwCurrent || pwNext.length < 6}
                onClick={async () => {
                  const result = await changeAccessPassword(pwCurrent, pwNext)
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
          </div>
        ) : null}

        <div className="settings-row">
          <strong>Sample project</strong>
          <div className="settings-row-actions settings-samples">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => loadSoftSignalDemo?.()}
            >
              Soft Signal
            </button>
            {typeof loadHarborHearthDemo === 'function' ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => loadHarborHearthDemo()}
              >
                Harbor &amp; Hearth
              </button>
            ) : null}
          </div>
        </div>

        <div className="settings-row" id="settings-about">
          <strong>Version</strong>
          <span className="settings-meta-inline">
            {versionLabel()}
            {APP_BUILD_DATE ? ` · ${APP_BUILD_DATE}` : ''}
          </span>
        </div>

        <div className="settings-danger-zone">
          <p className="settings-danger-title">Danger</p>
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-ghost settings-danger btn-sm"
              onClick={() => {
                ask('Wipe desk · one blank project?', () => {
                  clearToEmpty()
                  setActiveView('project')
                  flashToast('Empty desk ready')
                })
              }}
            >
              Empty desk
            </button>
            <button
              type="button"
              className="btn btn-ghost settings-danger btn-sm"
              onClick={() => {
                ask('Full reset + setup?', () => {
                  clearAllData()
                  setActiveView('home')
                  flashToast('Reset')
                })
              }}
            >
              Full reset
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function SettingsSwitch({ label, checked, onToggle }) {
  return (
    <div className="settings-row">
      <strong>{label}</strong>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        className={`pref-switch${checked ? ' is-on' : ''}`}
        onClick={onToggle}
      >
        <span className="pref-switch-knob" />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}
