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
import { JOURNEY_STEPS } from '../lib/journey/journey'
import LogoLockup from '../components/LogoLockup'
import '../styles/lazy-settings.css'

// Password strength validation
const validatePasswordStrength = (password) => {
  const strength = {
    score: 0,
    maxScore: 5,
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

/**
 * Login / access gate — Tech-Studio: single centered card, no marketing column.
 */
export default function LoginView({ onUnlocked, cloud = false }) {
  const useCloud = cloud && isSupabaseConfigured()
  const setupDone = hasAccessSetup()
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
          if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
          }
          const strength = validatePasswordStrength(password)
          setPasswordStrength(strength)
          // Require a reasonable mix (length + at least two more categories)
          // rather than demanding every single rule, which blocked signup.
          if (strength.score < 3) {
            setError(`Make it stronger: ${strength.issues.slice(0, 2).join(', ')}`)
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
          {/* Static mark here, deliberately. reduceMotion short-circuits
              before PathMarkMotion's `await import('lottie-web')`, so passing
              false pulled ~300 KB of animation library onto the one screen
              every visitor sees — including anyone who never signs in — to
              draw a mark next to a password field. The animated version still
              plays in the header after sign-in, where it is a flourish rather
              than a tax on the gate. */}
          <LogoLockup reduceMotion />
          <h1 className="login-h1">Creative Companion</h1>
          <p className="login-promise">
            Client brand projects — brief to leave-behind in five stops.
          </p>
          <ol className="login-path-mini" aria-label="The path">
            {JOURNEY_STEPS.map((s) => (
              <li key={s.id}>
                <span className="login-path-num">{s.num}</span>
                <span className="login-path-label">{s.label}</span>
              </li>
            ))}
          </ol>
          <p className="login-lede login-lede-short">
            {useCloud
              ? mode === 'login'
                ? 'Sign in to your studio'
                : 'Create your studio account'
              : mode === 'setup'
                ? 'Set a password for this device'
                : 'Unlock your desk'}
          </p>
          {!useCloud && mode === 'setup' && (
            <p className="login-lede login-setup-explain">
              Work stays on this device. There is no password reset — save it
              somewhere safe.
            </p>
          )}
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
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (mode === 'setup' || mode === 'signup') {
                    setPasswordStrength(validatePasswordStrength(e.target.value))
                  }
                }}
                autoComplete={
                  mode === 'setup' || mode === 'signup'
                    ? 'new-password'
                    : 'current-password'
                }
                autoFocus={!useCloud}
                required
                minLength={mode === 'setup' || mode === 'signup' ? 8 : 6}
                aria-invalid={!!error && error.includes('Password')}
                aria-describedby={
                  [
                    error ? 'password-error' : null,
                    mode === 'setup' || mode === 'signup'
                      ? 'password-strength'
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
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
              <p className="login-pw-hint">
                8+ characters, mixing upper/lowercase, numbers or symbols.
              </p>
            )}
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
                    'Needs more mix' :
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
                minLength={8}
                aria-invalid={!!error && error.includes('Passwords do not match')}
                aria-describedby={
                  error && error.includes('Passwords do not match')
                    ? 'password-error'
                    : undefined
                }
              />
            </label>
          )}

          {error && (
            <p id="password-error" className="login-error" role="alert">
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
                Clear form
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
