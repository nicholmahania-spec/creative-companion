import { useState } from 'react'
import {
  hasAccessSetup,
  setupAccess,
  verifyAccess,
} from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  signInWithEmail,
  signUpWithEmail,
  resetPasswordForEmail,
} from '../lib/cloudSync'
import { versionLabel } from '../lib/version'
import LogoLockup from './LogoLockup'
import { normalizeLocale, t as i18nT } from '../lib/i18n'

/** Read locale from persisted store (before unlock) when available */
function guestLocale() {
  try {
    const raw = localStorage.getItem('creative-companion-storage')
    if (!raw) return 'en'
    const p = JSON.parse(raw)
    return normalizeLocale(p?.state?.prefs?.locale || 'en')
  } catch {
    return 'en'
  }
}

/**
 * Login / access gate.
 * - Supabase configured → real email + password (cloud)
 * - Otherwise → local browser password gate
 */
export default function LoginPage({ onUnlocked, cloud = false }) {
  const useCloud = cloud && isSupabaseConfigured()
  const setupDone = hasAccessSetup()
  const locale = guestLocale()
  const [mode, setMode] = useState(
    useCloud ? 'login' : setupDone ? 'login' : 'setup'
  )
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (useCloud) {
        if (mode === 'setup' || mode === 'signup') {
          if (password !== password2) {
            setError('Passwords do not match')
            return
          }
          if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
          }
          const result = await signUpWithEmail(email, password)
          if (!result.ok) {
            setError(result.error || 'Could not create account')
            return
          }
          if (result.needsEmailConfirm) {
            setInfo(
              'Check your email to confirm your account, then sign in here.'
            )
            setMode('login')
            return
          }
          onUnlocked?.({
            mode: 'cloud',
            name: result.user?.email || email,
            user: result.user,
            session: result.session,
          })
          return
        }
        const result = await signInWithEmail(email, password)
        if (!result.ok) {
          setError(result.error || 'Could not sign in')
          return
        }
        onUnlocked?.({
          mode: 'cloud',
          name: result.user?.email || email,
          user: result.user,
          session: result.session,
        })
        return
      }

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
        onUnlocked?.({ mode: 'local', name: result.name })
        return
      }
      const result = await verifyAccess(password)
      if (!result.ok) {
        setError(result.error || 'Could not unlock')
        return
      }
      onUnlocked?.({ mode: 'local', name: result.name })
    } finally {
      setBusy(false)
    }
  }

  const handleForgot = async () => {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Enter your email above, then tap Forgot password')
      return
    }
    setBusy(true)
    try {
      const result = await resetPasswordForEmail(email)
      if (!result.ok) {
        setError(result.error || 'Could not send reset email')
        return
      }
      setInfo('Password reset link sent — check your email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-layout">
        <aside className="login-proof" aria-hidden="true">
          <p className="login-proof-eyebrow">For designers who scatter</p>
          <h2 className="login-proof-title">
            One next design step.
            <br />
            Leave with a brand leave-behind.
          </h2>
          <div className="login-pack-specimen">
            <div className="login-pack-cover">
              <span className="login-pack-kicker">Brand book</span>
              <strong className="login-pack-name">Your project</strong>
              <p className="login-pack-tagline">Direction you can hand to a client</p>
            </div>
            <div className="login-pack-swatches" aria-hidden="true">
              <i style={{ background: '#1C1917' }} />
              <i style={{ background: '#0F766E' }} />
              <i style={{ background: '#A8A29E' }} />
              <i style={{ background: '#FAFAF9' }} />
            </div>
            <div className="login-pack-pins" aria-hidden="true">
              <span className="login-pack-pin" />
              <span className="login-pack-pin is-muted" />
            </div>
            <p className="login-pack-foot">Multi-page PDF · direction you can ship</p>
          </div>
          <ul className="login-proof-list">
            <li>Define → Research → Ideate → Sketch → Design → Review → Deliver</li>
            <li>One process · refs · drafts · brand book PDF</li>
          </ul>
        </aside>

        <div className="login-card">
          <div className="login-brand">
            <LogoLockup reduceMotion={false} />
            <p className="login-tag">
              {i18nT(locale, 'tagline')}
            </p>
            <p className="login-path-line" aria-hidden="true">
              Define → Research → Ideate → Sketch → Design → Review → Deliver
            </p>
          </div>

          {useCloud && (
            <div className="login-mode-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={`login-mode-tab${mode === 'login' ? ' is-active' : ''}`}
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login')
                  setError('')
                  setInfo('')
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                className={`login-mode-tab${
                  mode === 'signup' || mode === 'setup' ? ' is-active' : ''
                }`}
                aria-selected={mode === 'signup' || mode === 'setup'}
                onClick={() => {
                  setMode('signup')
                  setError('')
                  setInfo('')
                }}
              >
                Create account
              </button>
            </div>
          )}

          <p className="login-lede">
            {useCloud
              ? mode === 'login'
                ? 'Sign in to open your desk. Work syncs across devices.'
                : 'Create an account. Your projects stay private to you.'
              : mode === 'setup'
                ? 'Protect this desk on this device with a password. Work stays local.'
                : 'Enter your password to open your desk on this device.'}
          </p>

          <form className="login-form" onSubmit={submit}>
            {useCloud ? (
              <label className="onboard-label">
                Email
                <input
                  className="onboard-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </label>
            ) : (
              mode === 'setup' && (
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
              )
            )}

            <label className="onboard-label">
              Password
              <div className="login-password-row">
                <input
                  className="onboard-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === 'setup' || mode === 'signup'
                      ? 'At least 6 characters'
                      : '••••••••'
                  }
                  autoComplete={
                    mode === 'setup' || mode === 'signup'
                      ? 'new-password'
                      : 'current-password'
                  }
                  autoFocus={!useCloud}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="login-show-pw"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {(mode === 'setup' || mode === 'signup') && (
              <label className="onboard-label">
                Confirm password
                <input
                  className="onboard-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </label>
            )}

            {useCloud && mode === 'login' && (
              <button
                type="button"
                className="text-link login-forgot"
                onClick={handleForgot}
                disabled={busy}
              >
                Forgot password?
              </button>
            )}

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            {info && (
              <p className="login-info" role="status">
                {info}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={busy || !password || (useCloud && !email)}
            >
              {busy
                ? 'Working…'
                : useCloud
                  ? mode === 'login'
                    ? 'Sign in'
                    : 'Create account'
                  : mode === 'setup'
                    ? 'Create access & continue'
                    : 'Unlock desk'}
            </button>
          </form>

          <div className="login-note">
            <p className="login-note-one">
              {useCloud
                ? 'Work syncs to your account · local cache for speed. Export a JSON backup anytime.'
                : 'Work stays on this device. Export a JSON backup if it matters.'}
            </p>
            <p className="login-note-meta">
              {useCloud ? 'Synced · ' : 'Local · '}
              {versionLabel()}
              {' · '}
              Details in Settings after unlock
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
