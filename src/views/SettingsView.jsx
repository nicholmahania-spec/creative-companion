import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { pushProject } from '../services/projectSync'
import {
  discardRetainedVersion,
  retainCurrentVersion,
  getSyncStatus,
  listRetainedVersions,
  subscribeSyncStatus,
  syncAllProjects,
} from '../services/syncEngine'
import StudioIdentityBlock from '../features/studio/StudioIdentityBlock'
import { hasPinSetup, setAccessPin, removeAccessPin } from '../lib/auth'
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
    requestConfirm,
  } = props

  const ask = (label, onConfirm, confirmLabel) => {
    if (typeof requestConfirm === 'function')
      requestConfirm(label, onConfirm, confirmLabel)
    else if (window.confirm(label)) onConfirm?.()
  }

  /* Phase 1a walking skeleton: send ONE project, one direction, on demand.
     Separate from the Sync button above it on purpose — that one pushes the
     whole workspace blob to user_workspaces; this writes the active project
     through the new clients → brands → projects tables, and its result needs
     to be observable on its own while the new path is being proven. */
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const projects = useAppStore((s) => s.projects)
  const [projectPushBusy, setProjectPushBusy] = useState(false)
  const [pinCurrentPassword, setPinCurrentPassword] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinEnabled, setPinEnabled] = useState(hasPinSetup)
  const [settingsPage, setSettingsPage] = useState('preferences')

  /* Phase 1b: the honest sync state — synced / syncing / offline / failed.
     A failure stays on screen with a Retry until a sync succeeds; it does
     not vanish into a toast. */
  const [projSync, setProjSync] = useState(getSyncStatus)
  useEffect(() => subscribeSyncStatus(setProjSync), [])
  const retrySync = () =>
    syncAllProjects({
      getProjects: () => useAppStore.getState().projects,
      setProjects: (next) => useAppStore.setState({ projects: next }),
    })

  /* Retained versions — the losing side of every conflict, recoverable.
     Loaded on demand behind a disclosure so Settings stays quiet. */
  const [retained, setRetained] = useState(null)
  const [retainedPage, setRetainedPage] = useState(0)
  const [retainedMore, setRetainedMore] = useState(false)
  const loadRetained = async (page = 0) => {
    const r = await listRetainedVersions({ page })
    setRetained(r.ok ? r.rows : [])
    setRetainedMore(!!r.hasMore)
    setRetainedPage(page)
  }
  /* Discarding goes through the RPC, never a delete — see syncEngine. */
  const discard = (row) =>
    ask(
      `Delete this conflict copy of “${row.project_name || 'project'}”? This copy cannot be recovered.`,
      async () => {
        const r = await discardRetainedVersion(row.id)
        if (!r.ok) {
          flashToast('Could not discard that version')
          return
        }
        await loadRetained(retainedPage)
        flashToast('Discarded')
      },
      'Delete conflict copy',
    )
  const bringBack = (row) => {
    const doc = row?.data
    if (!doc || typeof doc !== 'object') return
    const localId = String(row.local_id || doc.id || '')
    if (!localId) return
    ask(
      `Restore this conflict copy of “${row.project_name || 'project'}”? Your current version will stay here, so nothing is lost.`,
      async () => {
        const cur = useAppStore.getState().projects
        /* Keep the version we are about to replace FIRST. Restoring makes
           the local copy dirty while the remote is unchanged, so the next
           sync decides `push`, not `conflict` — without this, the recovery
           button would be the one operation in the app that destroys a
           version with no safety net. */
        const current = cur.find((p) => String(p.id) === localId)
        if (current) {
          const kept = await retainCurrentVersion(current)
          if (!kept.ok) {
            flashToast(
              'Could not keep your current version, so nothing changed',
            )
            return
          }
        }
        const restored = { ...doc, id: localId }
        const exists = cur.some((p) => String(p.id) === localId)
        useAppStore.setState({
          projects: exists
            ? cur.map((p) => {
                if (String(p.id) !== localId) return p
                // device-local fields survive a restore, same as a pull
                return { ...restored, workLog: p.workLog || [] }
              })
            : [...cur, restored],
        })
        flashToast('Version brought back — it will sync as the newest edit')
        await loadRetained(0)
      },
      'Restore conflict copy',
    )
  }
  const sendActiveProject = async () => {
    const project = projects.find((p) => p.id === activeProjectId)
    if (!project) {
      flashToast('Open a project first')
      return
    }
    setProjectPushBusy(true)
    try {
      const r = await pushProject(project)
      flashToast(r.ok ? `Sent “${project.name}” to the cloud` : r.reason)
    } finally {
      setProjectPushBusy(false)
    }
  }

  return (
    <div className="settings-view settings-studio">
      <div className="flow-top">
        <h1 className="page-title">
          {settingsPage === 'preferences' ? 'Preferences' : 'Account settings'}
        </h1>
      </div>
      <div className="settings-page-tabs" role="group" aria-label="Settings pages">
        <button type="button" aria-pressed={settingsPage === 'preferences'} className={settingsPage === 'preferences' ? 'is-active' : ''} onClick={() => setSettingsPage('preferences')}>Preferences</button>
        <button type="button" aria-pressed={settingsPage === 'account'} className={settingsPage === 'account' ? 'is-active' : ''} onClick={() => setSettingsPage('account')}>Account settings</button>
      </div>

      {/* First block on the page, deliberately. This is the one setting whose
          absence silently degrades work already sent to a client: with nothing
          here, every export prints "<Project> · <date>" and the designer's name
          appears nowhere. Everything below it is a preference about how the app
          behaves; this is about what leaves the building. */}
      {settingsPage === 'account' && <div>
        <StudioIdentityBlock
          prefs={prefs}
          setPref={setPref}
          flashToast={flashToast}
        />

      </div>}

      {settingsPage === 'preferences' && <section className="panel brand-section" id="settings-preferences">
        <div className="brand-section-label">Focus and motion</div>

        <SettingsSwitch
          label="Hide nav while typing"
          checked={!!prefs.hideNavUntilBlur}
          onToggle={() => setPref('hideNavUntilBlur', !prefs.hideNavUntilBlur)}
        />
        <SettingsSwitch
          label="Reduce motion"
          checked={reduceMotion}
          onToggle={() => setPref('reduceMotion', !reduceMotion)}
        />
        <div className="settings-row">
          <strong>Notifications</strong>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              setPref('toastMode', prefs.toastMode === 'all' ? 'quiet' : 'all')
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
              View shortcuts
            </button>
          </div>
        ) : null}
      </section>}

      {settingsPage === 'account' && <section className="panel brand-section" id="settings-workspace">
        <div className="brand-section-label">App data</div>
        {CLOUD && accessName ? (
          <p className="settings-meta" role="status">
            {accessName}
            {` · ${
                  syncState === 'syncing'
                    ? 'Saving…'
                    : syncState === 'error'
                      ? 'Error'
                      : syncState === 'ok'
                        ? 'Synced'
                        : 'Idle'
                }`}
            {syncError ? ` — ${syncError}` : ''}
          </p>
        ) : null}
        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSignOut}
          >
            {CLOUD ? 'Log out' : 'Go to login screen'}
          </button>
          {CLOUD ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={syncState === 'syncing'}
              onClick={async () => {
                const result = await runCloudPush()
                if (result.ok) {
                  flashToast('Saved to the cloud')
                } else {
                  flashToast(result.error || 'Could not sync right now')
                }
              }}
            >
              {syncState === 'syncing' ? 'Syncing…' : 'Sync'}
            </button>
          ) : null}
          {CLOUD ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={projectPushBusy}
              onClick={sendActiveProject}
            >
              {projectPushBusy ? 'Sending…' : 'Send project'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={downloadDataBackup}
          >
            Download backup
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => importFileRef.current?.click()}
          >
            Import backup
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
                handleImportBackup(file),
              )
            }}
          />
        </div>
      </section>}

      {settingsPage === 'account' && <section className="panel brand-section" id="settings-account">
        <div className="brand-section-label">{CLOUD ? 'Sync and recovery' : 'Login'}</div>
        {!CLOUD && (
          <div className="settings-pin">
            <strong>Quick PIN</strong>
            <p className="settings-meta">
              {pinEnabled ? 'Change or remove your four-digit PIN.' : 'Add a four-digit PIN for quicker login.'}
            </p>
            <label className="onboard-label">
              Current password
              <input
                className="onboard-input"
                type="password"
                value={pinCurrentPassword}
                onChange={(e) => setPinCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label className="onboard-label">
              New PIN
              <input className="onboard-input" type="password" autoComplete="new-password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </label>
            <label className="onboard-label">
              Confirm PIN
              <input className="onboard-input" type="password" autoComplete="new-password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label="Save PIN"
              disabled={!pinCurrentPassword || newPin.length !== 4 || confirmPin.length !== 4 || newPin !== confirmPin}
              onClick={async () => {
                if (newPin !== confirmPin) {
                  flashToast('PINs do not match')
                  return
                }
                const result = await setAccessPin(pinCurrentPassword, newPin)
                if (!result.ok) {
                  flashToast(result.error || 'Could not update PIN')
                  return
                }
                setPinEnabled(true)
                setPinCurrentPassword('')
                setNewPin('')
                setConfirmPin('')
                flashToast('PIN saved')
              }}
            >
              Save
            </button>
            {pinEnabled ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  const result = await removeAccessPin(pinCurrentPassword)
                  if (!result.ok) {
                    flashToast(result.error || 'Could not remove PIN')
                    return
                  }
                  setPinEnabled(false)
                  setPinCurrentPassword('')
                  setNewPin('')
                  setConfirmPin('')
                  flashToast('PIN removed. Use your password to log in.')
                }}
              >
                Remove PIN
              </button>
            ) : null}
          </div>
        )}
        {CLOUD && projSync.state !== 'idle' ? (
          <p className="settings-meta" role="status">
            {projSync.state === 'synced' &&
              (projSync.conflicts > 0
                ? `Projects: synced · ${projSync.conflicts} other ${projSync.conflicts === 1 ? 'version was' : 'versions were'} kept — see Retained versions below`
                : 'Projects: synced')}
            {projSync.state === 'syncing' && 'Projects: syncing…'}
            {projSync.state === 'offline' &&
              'Projects: offline — will catch up when the connection returns'}
            {projSync.state === 'failed' && (
              <>
                {`Projects: ${projSync.reason || 'sync did not finish'} `}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={retrySync}
                >
                  Retry
                </button>
              </>
            )}
          </p>
        ) : null}
        {CLOUD ? (
          <details
            className="settings-retained"
            onToggle={(e) => {
              if (e.currentTarget.open && retained === null)
                void loadRetained(0)
            }}
          >
            <summary>Conflict copies</summary>
            {retained === null ? (
              <p className="settings-meta">Loading…</p>
            ) : retained.length === 0 ? (
              <p className="settings-meta">
                Nothing here. When two copies of a project disagree, the one
                that loses is kept on this list instead of being thrown away.
              </p>
            ) : (
              <ul className="settings-retained-list">
                {retained.map((row) => (
                  <li key={row.id}>
                    <span>
                      {row.project_name || 'Project'} ·{' '}
                      {row.losing_side === 'remote'
                        ? 'cloud copy'
                        : 'desk copy'}{' '}
                      · {new Date(row.created_at).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => bringBack(row)}
                    >
                      Restore this copy
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => discard(row)}
                    >
                      Delete this copy
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {retained && (retainedPage > 0 || retainedMore) ? (
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={retainedPage === 0}
                  onClick={() => loadRetained(retainedPage - 1)}
                >
                  Newer
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={!retainedMore}
                  onClick={() => loadRetained(retainedPage + 1)}
                >
                  Older
                </button>
              </div>
            ) : null}
          </details>
        ) : null}
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
                placeholder="Current password"
                autoComplete="current-password"
              />
              <input
                id="pw-next"
                type="password"
                className="field-input"
                value={pwNext}
                onChange={(e) => setPwNext(e.target.value)}
                placeholder="New password (6+)"
                autoComplete="new-password"
                aria-label="New password"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                aria-label="Save password"
                disabled={!pwCurrent || pwNext.length < 6}
                onClick={async () => {
                  const result = await changeAccessPassword(pwCurrent, pwNext)
                  if (result.ok) {
                    setPwCurrent('')
                    setPwNext('')
                    setPinEnabled(false)
                    flashToast('Password updated. Quick PIN removed.')
                  } else {
                    flashToast(result.error || 'Could not update')
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : null}

      </section>}
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
