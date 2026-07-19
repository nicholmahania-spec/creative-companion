import { useState } from 'react'
import {
  hasAccessSetup,
  setupAccess,
  verifyAccess,
  STORAGE_EXPLAIN,
} from '../lib/auth'
import { versionLabel } from '../lib/version'

/**
 * Access gate for the public site.
 * First visit: create password. Later: unlock with password.
 */
export default function LoginPage({ onUnlocked }) {
  const setupDone = hasAccessSetup()
  const [mode, setMode] = useState(setupDone ? 'login' : 'setup')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'setup') {
        if (password !== password2) {
          setError('Passwords do not match')
          return
        }
        const result = await setupAccess({ name, password })
        if (!result.ok) {
          setError(result.error || 'Could not create access')
          return
        }
        onUnlocked?.(result.name)
        return
      }
      const result = await verifyAccess(password)
      if (!result.ok) {
        setError(result.error || 'Could not unlock')
        return
      }
      onUnlocked?.(result.name)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="logo-mark" aria-hidden="true" />
          <div>
            <h1 className="login-title">Creative Companion</h1>
            <p className="login-tag">Creative work tool for ADHD brains</p>
          </div>
        </div>

        <p className="login-lede">
          {mode === 'setup'
            ? 'This site is public. Create an access password so casual visitors can’t open your desk. Your work still stays only on this device.'
            : 'Enter your access password to open your desk on this device.'}
        </p>

        <form className="login-form" onSubmit={submit}>
          {mode === 'setup' && (
            <label className="onboard-label">
              Your name <span className="onboard-optional">(optional)</span>
              <input
                className="onboard-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nichol"
                autoComplete="username"
              />
            </label>
          )}

          <label className="onboard-label">
            {mode === 'setup' ? 'Create password' : 'Password'}
            <input
              className="onboard-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'setup' ? 'At least 6 characters' : '••••••••'}
              autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
              autoFocus
              required
              minLength={6}
            />
          </label>

          {mode === 'setup' && (
            <label className="onboard-label">
              Confirm password
              <input
                className="onboard-input"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </label>
          )}

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={busy || !password}
          >
            {busy
              ? 'Working…'
              : mode === 'setup'
                ? 'Create access & continue'
                : 'Unlock desk'}
          </button>
        </form>

        <div className="login-note">
          <strong>Where is my information saved?</strong>
          <p>{STORAGE_EXPLAIN.summary}</p>
          <p className="login-note-meta">
            Storage key: <code>{STORAGE_EXPLAIN.workDataKey}</code> ·{' '}
            {versionLabel()}
          </p>
        </div>

        <p className="login-fineprint">
          Access password is checked in this browser only — not a cloud account.
          Closing the tab signs you out. Clear site data wipes password and work
          unless you exported a backup.
        </p>
      </div>
    </div>
  )
}
