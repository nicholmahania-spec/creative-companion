import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { pushProject } from '../services/projectSync'
import {
  discardRetainedVersion,
  getSyncStatus,
  listRetainedVersions,
  subscribeSyncStatus,
  syncAllProjects,
} from '../services/syncEngine'
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

  /* Phase 1a walking skeleton: send ONE project, one direction, on demand.
     Separate from the Sync button above it on purpose — that one pushes the
     whole workspace blob to user_workspaces; this writes the active project
     through the new clients → brands → projects tables, and its result needs
     to be observable on its own while the new path is being proven. */
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const projects = useAppStore((s) => s.projects)
  const [projectPushBusy, setProjectPushBusy] = useState(false)

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
      `Discard this kept version of “${row.project_name || 'project'}”? It is the only copy.`,
      async () => {
        const r = await discardRetainedVersion(row.id)
        if (!r.ok) {
          flashToast('Could not discard that version')
          return
        }
        await loadRetained(retainedPage)
        flashToast('Discarded')
      },
    )
  const bringBack = (row) => {
    const doc = row?.data
    if (!doc || typeof doc !== 'object') return
    const localId = String(row.local_id || doc.id || '')
    if (!localId) return
    ask(
      `Bring back this version of “${row.project_name || 'project'}”? The current version stays in the cloud until the next sync.`,
      () => {
        const cur = useAppStore.getState().projects
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
      },
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
        <h1 className="page-title">Settings</h1>
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
                handleImportBackup(file),
              )
            }}
          />
        </div>
        {CLOUD && projSync.state !== 'idle' ? (
          <p className="settings-meta" role="status">
            {projSync.state === 'synced' && 'Projects: synced'}
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
              if (e.currentTarget.open && retained === null) void loadRetained(0)
            }}
          >
            <summary>Retained versions</summary>
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
                      Bring back
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => discard(row)}
                    >
                      Discard
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
                ask(
                  'Wipe every project? The desk will be empty until you start a new one.',
                  () => {
                    clearToEmpty()
                    setActiveView('create')
                    flashToast('Cleared — no projects')
                  },
                )
              }}
            >
              Clear all projects
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
