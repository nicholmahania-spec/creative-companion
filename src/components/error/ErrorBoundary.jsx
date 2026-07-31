import { Component } from 'react'

/**
 * The last line of defence: a render error anywhere below this turns into a
 * readable screen with a way out, instead of a blank white page.
 *
 * This file existed for a long time and was never rendered — imported into
 * App.jsx and used exactly zero times — so every crash the app has ever had
 * showed a white page. It was also written against a stack this repo does not
 * have: Tailwind utility classes that resolve to nothing here, `process.env`
 * which Vite does not define in the browser (so the fallback would itself
 * throw while trying to render the fallback), and a promise that "our team has
 * been notified" when nothing was reporting anything. A fallback that cannot
 * render is worse than none, because it turns one crash into two.
 *
 * It is mounted at two depths (see App.jsx and main.jsx). The inner one wraps
 * only the current view, so a crash on one screen leaves the header and the
 * project nav alive and the answer is "go somewhere else" rather than "the app
 * is gone" — the difference between an interruption and a dead end. The inner
 * one is keyed on the active view so navigating away clears the error without
 * a reload; without that key the boundary sticks and the error card becomes a
 * worse trap than the white page, because it looks intentional.
 *
 * What it says is deliberately short. The person reading it has just lost
 * their place mid-session, and the only two things worth knowing at that
 * moment are "your work is still there" and "press this". A stack trace, an
 * apology, or a support address that does not exist is reading homework at the
 * worst possible time, and a wall of red is exactly the shame-coded failure
 * this app is meant to be the opposite of. The detail still goes to the
 * console, where it is useful and not in the way.
 *
 * The reassurance is past tense on purpose. `useAppStore` persists to
 * localStorage on every change, so anything committed to the store survives a
 * reload — but a quota failure is swallowed to a console error and an event,
 * so the app can be in a not-saving state at the moment it crashes. "Everything
 * you'd saved is still here" stays true in that case; "your work is saved"
 * would be a lie the user only discovers later.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    /* Console, not the screen. This is the only copy of the detail, so it must
       not be swallowed even though the user never sees it. */
    console.error('Creative Companion crashed:', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { onLeave, leaveLabel = 'Back to the project' } = this.props

    return (
      <div className="crash-screen" role="alert">
        <div className="crash-panel">
          <h2 className="crash-title">This screen stopped loading.</h2>
          <p className="crash-body">Everything you’d saved is still here.</p>
          <div className="crash-actions">
            {onLeave && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  /* Clear before leaving. The key on the inner boundary already
                     remounts it on a view change, but this makes the button
                     work even if the two are ever wired up differently. */
                  this.setState({ hasError: false })
                  onLeave()
                }}
              >
                {leaveLabel}
              </button>
            )}
            <button
              type="button"
              className={`btn ${onLeave ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
