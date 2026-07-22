import { helperAiStatus } from '../lib/helperAi'
import { LOCALES, normalizeLocale, t as i18nT } from '../lib/i18n'

/** Settings — short labels, Focus first, Advanced collapsed. */
export default function SettingsView(props) {
  const {
    setActiveView,
    CLOUD,
    accessName,
    syncState,
    syncError,
    pushWorkspace,
    exportAllData,
    setSyncState,
    setSyncError,
    handleSignOut,
    theme,
    toggleTheme,
    reduceMotion,
    soundEnabled,
    showHowItWorks,
    showProgress,
    queueCollapsed,
    forceBreaksEnabled,
    setPref,
    bodyDoubling,
    toggleBodyDoubling,
    flashToast,
    forcedBreak,
    endForcedBreak,
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
    setShowOnboarding,
    loadSoftSignalDemo,
    versionLabel,
    APP_BUILD_DATE,
    STORAGE_EXPLAIN,
    requestConfirm,
    openForceBreakConsent,
  } = props
  const aiStatus = helperAiStatus()
  const locale = normalizeLocale(localeProp(props))
  const ask = (label, onConfirm) => {
    if (typeof requestConfirm === 'function') requestConfirm(label, onConfirm)
    else if (window.confirm(label)) onConfirm?.()
  }

  return (
    <div className="settings-view settings-studio">
      <button
        type="button"
        className="back-link settings-back"
        onClick={() => setActiveView('project')}
      >
        ← Path
      </button>
      <div className="flow-top">
        <h1 className="page-title">Settings</h1>
      </div>

      <nav className="settings-jump" aria-label="Settings sections">
        {[
          ['focus', 'Focus'],
          ['desk', 'Desk'],
          ['data', i18nT(locale, 'ui.data') || 'Data'],
          ['advanced', 'Advanced'],
        ].map(([id, label]) => (
          <a
            key={id}
            className="settings-jump-link"
            href={`#settings-${id}`}
          >
            {label}
          </a>
        ))}
      </nav>

      <section className="panel brand-section" id="settings-focus">
        <div className="brand-section-label">Focus</div>

        <p className="settings-subhead">
          Dim the sidebar and header while typing
        </p>
        <SettingsSwitch
          label="Focus mode"
          checked={!!prefs.focusMode}
          onToggle={() => setPref('focusMode', !prefs.focusMode)}
        />
        <SettingsSwitch
          label="Hide nav"
          checked={!!prefs.hideNavUntilBlur}
          onToggle={() => setPref('hideNavUntilBlur', !prefs.hideNavUntilBlur)}
        />

        <p className="settings-subhead">
          Dim other fields while one is focused
        </p>
        <div className="settings-row">
          <strong>Focus ring</strong>
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
        <div className="settings-row settings-row-stack">
          <strong>
            Focus mask · {Number(prefs.focusMaskPct ?? 25)}%
          </strong>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            className="settings-range"
            value={Number(prefs.focusMaskPct ?? 25)}
            aria-label="Focus mask intensity"
            onChange={(e) =>
              setPref('focusMaskPct', Number(e.target.value))
            }
          />
        </div>
        <div className="settings-row">
          <strong>Mask blur</strong>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              setPref('focusMaskBlur', Number(prefs.focusMaskBlur) > 0 ? 0 : 2)
            }
          >
            {Number(prefs.focusMaskBlur) > 0 ? '2px' : 'Off'}
          </button>
        </div>

        <p className="settings-subhead">Notifications</p>
        <div className="settings-row">
          <strong>Batch toasts</strong>
          <select
            className="field-input settings-locale-select"
            value={String(prefs.toastBatchWindow || 0)}
            aria-label="Batch toasts"
            onChange={(e) =>
              setPref('toastBatchWindow', Number(e.target.value))
            }
          >
            <option value="0">Off</option>
            <option value="30">30s</option>
            <option value="120">2 min</option>
          </select>
        </div>
        <SettingsSwitch
          label={i18nT(locale, 'ui.reduceMotion') || 'Reduce motion'}
          checked={reduceMotion}
          onToggle={() => setPref('reduceMotion', !reduceMotion)}
        />
        <SettingsSwitch
          label="Hide tips"
          checked={!!prefs.hideTips}
          onToggle={() => setPref('hideTips', !prefs.hideTips)}
        />
        <div className="settings-row">
          <strong>{i18nT(locale, 'language') || 'Language'}</strong>
          <select
            className="field-input settings-locale-select"
            value={locale}
            aria-label={i18nT(locale, 'language') || 'Language'}
            onChange={(e) =>
              setPref('locale', normalizeLocale(e.target.value))
            }
          >
            {LOCALES.map((L) => (
              <option key={L.id} value={L.id}>
                {L.native}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-row">
          <strong>{i18nT(locale, 'ui.theme') || 'Theme'}</strong>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => toggleTheme()}
          >
            {theme === 'warm'
              ? i18nT(locale, 'ui.switchDark') || 'Dark'
              : i18nT(locale, 'ui.switchLight') || 'Light'}
          </button>
        </div>
      </section>

      <section className="panel brand-section" id="settings-desk">
        <div className="brand-section-label">Desk</div>
        <SettingsSwitch
          label="Collapse queue"
          checked={queueCollapsed}
          onToggle={() => setPref('queueCollapsed', !queueCollapsed)}
        />
        <SettingsSwitch
          label="Sketch intro"
          checked={showHowItWorks}
          onToggle={() => setPref('showHowItWorks', !showHowItWorks)}
        />
        <SettingsSwitch
          label="Progress strip"
          checked={showProgress}
          onToggle={() => setPref('showProgress', !showProgress)}
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
          {CLOUD && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
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
              Sync
            </button>
          )}
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
        {!CLOUD && (
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
                type="password"
                className="field-input"
                value={pwNext}
                onChange={(e) => setPwNext(e.target.value)}
                placeholder="New (6+)"
                autoComplete="new-password"
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
        )}
        <div className="settings-danger-zone">
          <p className="settings-danger-title">Danger</p>
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-ghost settings-danger btn-sm"
              onClick={() => {
                ask('Wipe desk · one blank project?', () => {
                  clearToEmpty()
                  setActiveView('flow')
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
                  setShowOnboarding(true)
                  setActiveView('project')
                  flashToast('Reset')
                })
              }}
            >
              Full reset
            </button>
          </div>
        </div>
      </section>

      <details
        className="panel brand-section settings-advanced"
        id="settings-advanced"
      >
        <summary className="brand-section-label settings-advanced-sum">
          Advanced
        </summary>
        <div className="settings-advanced-body">
          <SettingsSwitch
            label={i18nT(locale, 'ui.helper') || 'Helper'}
            checked={bodyDoubling}
            onToggle={() => toggleBodyDoubling()}
          />
          <SettingsSwitch
            label={i18nT(locale, 'ui.helperQuiet') || 'Helper quiet'}
            checked={!!prefs.helperQuiet}
            onToggle={() => setPref('helperQuiet', !prefs.helperQuiet)}
          />
          <SettingsSwitch
            label={i18nT(locale, 'ui.timerSound') || 'Timer sound'}
            checked={soundEnabled}
            onToggle={() => setPref('soundEnabled', !soundEnabled)}
          />
          <SettingsSwitch
            label={i18nT(locale, 'ui.forceBreaksTitle') || 'Forced breaks'}
            checked={forceBreaksEnabled}
            onToggle={() => {
              const next = !forceBreaksEnabled
              if (next && !prefs.forceBreaksConsented) {
                openForceBreakConsent?.()
                return
              }
              setPref('forceBreaksEnabled', next)
              if (!next && forcedBreak) endForcedBreak(true)
              flashToast(next ? 'Breaks on' : 'Breaks off')
            }}
          />
          <details className="settings-nested">
            <summary>Storage</summary>
            <p className="settings-meta">
              {CLOUD
                ? 'Cloud + cache'
                : STORAGE_EXPLAIN?.summary || 'Local only'}
            </p>
            <p className="settings-meta">
              <code className="settings-code">
                {STORAGE_EXPLAIN?.workDataKey}
              </code>
            </p>
          </details>
          <div className="settings-row">
            <strong>Demo</strong>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => loadSoftSignalDemo()}
            >
              Soft Signal
            </button>
          </div>
          <div className="settings-row">
            <strong>Helper AI</strong>
            <span className={`helper-ai-badge is-${aiStatus.mode}`}>
              {aiStatus.short}
            </span>
          </div>
          <div className="settings-row" id="settings-about">
            <strong>Version</strong>
            <span className="settings-meta-inline">
              {versionLabel()}
              {APP_BUILD_DATE ? ` · ${APP_BUILD_DATE}` : ''}
            </span>
          </div>
        </div>
      </details>
    </div>
  )
}

function localeProp(props) {
  return props.locale || props.prefs?.locale || 'en'
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
