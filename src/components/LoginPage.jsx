import { useState, useCallback } from 'react'
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
import { normalizeLocale } from '../lib/i18n'

// Password strength validation
const validatePasswordStrength = (password) => {
  const strength = {
    score: 0,
    maxScore: 4,
    issues: []
  };

  // Length check
  if (password.length >= 8) {
    strength.score++;
  } else {
    strength.issues.push('At least 8 characters');
  }

  // Contains uppercase
  if (/[A-Z]/.test(password)) {
    strength.score++;
  } else {
    strength.issues.push('Include uppercase letter');
  }

  // Contains lowercase
  if (/[a-z]/.test(password)) {
    strength.score++;
  } else {
    strength.issues.push('Include lowercase letter');
  }

  // Contains number
  if (/\d/.test(password)) {
    strength.score++;
  } else {
    strength.issues.push('Include a number');
  }

  // Contains special character
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    strength.score++;
  } else {
    strength.issues.push('Include special character (!@#$%^&*)');
  }

  return strength;
};

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
 * Login / access gate — Tech-Studio: single centered card, no marketing column.
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
  const [passwordStrength, setPasswordStrength] = useState(null)
  const [passwordStrength, setPasswordStrength] = useState(null)

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
          const strength = validatePasswordStrength(password)
          setPasswordStrength(strength)
          if (strength.score < strength.maxScore) {
            setError(`Password requirements: ${strength.issues.join(', ')}`)
            return
          }
          const result = await signUpWithEmail(email, password)
          if (!result.ok) {
            setError(result.error || 'Could not create account')
            return
          }
          if (result.needsEmailConfirm) {
            setInfo('Check your email to confirm, then sign in.')
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

  const handleReset = () => {
    setError('')
    setInfo('')
    setEmail('')
    setPassword('')
    setPassword2('')
    setName('')
    setShowPassword(false)
  }

  return (
    <div className="login-page login-page-studio">
      <div className="login-card login-card-solo">
        <div className="login-brand">
          <LogoLockup reduceMotion={false} />
          <h1 className="login-h1">Creative Companion</h1>
          <p className="login-lede login-lede-short">
            {useCloud
              ? mode === 'login'
                ? 'Sign in'
                : 'Create account'
              : mode === 'setup'
                ? 'Set password'
                : 'Unlock desk'}
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
              Create
            </button>
          </div>
        )}

        <form className="login-form" onSubmit={submit}>
          {useCloud ? (
            <label className="onboard-label">
              Email
              <input
                className="onboard-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </label>
          ) : (
            mode === 'setup' && (
              <label className="onboard-label">
                Name
                <input
                  className="onboard-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="username"
                  placeholder="Optional"
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
                autoComplete={
                  mode === 'setup' || mode === 'signup'
                    ? 'new-password'
                    : 'current-password'
                }
                autoFocus={!useCloud}
                required
                minLength={6}
                aria-invalid={!!error && error.includes('Password')}
                aria-describedby="password-error password-strength"
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
            {(mode === 'setup' || mode === 'signup') && (
              <div className="password-strength-meter" id="password-strength">
                <div className="password-strength-label">Password strength:</div>
                <div className="password-strength-bar">
                  <div
                    className="password-strength-fill"
                    style={{
                      width: `${passwordStrength && passwordStrength.score > 0 ? (passwordStrength.score / passwordStrength.maxScore) * 100 : 0}%`,
                      backgroundColor: passwordStrength && passwordStrength.score > 0
                        ? passwordStrength.score === passwordStrength.maxScore
                          ? 'var(--success)'
                          : passwordStrength.score >= passwordStrength.maxScore * 0.6
                            ? 'var(--warning)'
                            : 'var(--error)'
                        : 'var(--border-subtle)'
                    }}
                  ></div>
                </div>
                <div className="password-strength-text">
                  {passwordStrength ?
                    passwordStrength.score === passwordStrength.maxScore ? 'Strong' :
                    passwordStrength.score >= passwordStrength.maxScore * 0.6 ? 'Medium' :
                    'Weak' :
                    'Enter password'
                  }
                </div>
              </div>
            )}
          </label>

          {(mode === 'setup' || mode === 'signup') && (
            <label className="onboard-label">
              Confirm
              <input
                className="onboard-input"
                type={showPassword ? 'text' : 'password'}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                aria-invalid={!!error && error.includes('Passwords do not match')}
                aria-describedby="confirm-error"
              />
            </label>
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
            disabled={busy}
          >
            {busy
              ? '…'
              : useCloud
                ? mode === 'login'
                  ? 'Sign in'
                  : 'Create'
                : mode === 'setup'
                  ? 'Create'
                  : 'Open'}
          </button>

          {useCloud && mode === 'login' && (
            <>
              <button
                type="button"
                className="text-link login-forgot"
                onClick={handleForgot}
                disabled={busy}
              >
                Forgot
              </button>
              <button
                type="button"
                className="text-link login-reset ml-2"
                onClick={handleReset}
                disabled={busy}
              >
                Reset
              </button>
            </>
          )}
        </form>

        <p className="login-version" aria-hidden="true">
          {versionLabel()}
        </p>
      </div>
    </div>
  )
}
