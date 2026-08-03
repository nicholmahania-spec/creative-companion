import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The login screen must not force the animated mark on.
 *
 * PathMarkMotion does `await import('lottie-web')` unless reduceMotion is set —
 * the guard short-circuits before the import. LoginView rendered
 * <LogoLockup reduceMotion={false} />, hardcoding the animation on, so every
 * visitor fetched ~300 KB of animation library on the one screen shown before
 * sign-in, including anyone who never signs in, to draw a mark beside a
 * password field.
 *
 * This is NOT caught by the perf-budget's eager-entry check: lottie is a
 * runtime dynamic import, not a modulepreload, so it never appears in the
 * entry set the budget measures. The bytes load when the component mounts, not
 * when the page boots. That gap is exactly why this is a separate source-level
 * guard rather than a size assertion — verified by reintroducing the bug and
 * watching the eager total not move.
 */
const LOGIN = new URL('../views/LoginView.jsx', import.meta.url).pathname
const login = readFileSync(LOGIN, 'utf8')

describe('login screen weight', () => {
  it('does not force the animated mark on before sign-in', () => {
    // reduceMotion={false} on LogoLockup is the specific regression.
    expect(login).not.toMatch(/reduceMotion=\{false\}/)
  })

  it('renders the mark with reduce-motion on the login gate', () => {
    // Either bare `reduceMotion` or `reduceMotion={true}` — the static SVG path
    // that skips the lottie import entirely.
    expect(login).toMatch(/<LogoLockup[^>]*\breduceMotion\b(?!=\{false\})/)
  })
})
