/**
 * The stage — one primitive, every stop.
 *
 * WHY THIS EXISTS. Directions, Identity and Touchpoints each grew their own
 * copy of the same ~110 lines: createPortal into body, `#root` set inert +
 * aria-hidden + visibility:hidden, a hand-rolled focus trap, Escape-to-close,
 * and a recovery header. Three copies of one behaviour is the dominant defect
 * this codebase records against itself, and it had already produced three
 * different answers to the same question — Directions restored focus from
 * `document.activeElement` as a fallback, Identity did not; Identity honoured
 * a `suspended` flag, the other two had no concept of it. Any fix to the trap
 * had to be made three times or it was not made.
 *
 * WHAT IT OWNS, so a stop does not have to:
 *   - the portal, and the shell isolation that goes with it
 *   - the focus trap, Escape, and returning focus to the exact launcher
 *   - the quiet path edge (see below)
 *   - the stage ground, type scale and rhythm (`workroom.css`)
 *
 * WHAT A STOP OWNS: its plane, its masthead content and its next action.
 * Everything inside `children` is the creative work, and the stage is
 * deliberately near-silent around it.
 *
 * `masthead` and `ledge` are SLOTS, not behaviour. The stage decides where a
 * stop names itself and where its next action sits, and what both look like;
 * the view still decides what the words are and what pressing the button
 * does. That split is the whole point — before it, six stops had six answers
 * to "where does the next action go", including two that had no answer and
 * one that had two competing ones.
 *
 * THE PATH EDGE IS NOT OPTIONAL, and this is the one place the rebuilt rooms
 * got it wrong. The first three rooms replaced the shell's nav with a single
 * "Back to <previous stop>" link, which took navigation from dominant to
 * ABSENT — from Identity there was no route to Brief at all. CLAUDE.md §21
 * lists progress visibility (Completed → Current → Next) as a core principle
 * and the product is built first for people who cannot hold the path in
 * working memory. Subordinate means small, quiet and at the edge. It does not
 * mean gone. So the stage carries every stop of the project's own path, one
 * hairline row, no boxes.
 *
 * The stops come from `stepsForProject`, never from a local list — a project
 * type that switches a stage off must not be offered it here.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStageSignals, stageSignalLines } from '../lib/stageSignals'
import { getPrevJourney, labelForStepId } from '../lib/journey/journey'
import { stepsForProject } from '../lib/journey/projectTypes'
import { pathStepHasContent } from '../lib/journey/journeyProgress'
import '../styles/workroom.css'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * @param {object} p
 * @param {string} p.stepId       journey step id this stage presents
 * @param {object} p.project      active project (path membership + ticks)
 * @param {object} [p.pathCtx]    progress ctx from App; ticks are omitted without it
 * @param {Function} p.setActiveView
 * @param {{current: HTMLElement|null}} [p.launcherRef] element to restore focus to
 * @param {string} [p.status]     right-hand status line ("Working on Mark")
 * @param {React.ReactNode} [p.masthead] how this stop names itself, on the plane
 * @param {React.ReactNode} [p.ledge]    the stop's next action(s), at the stage edge
 * @param {boolean} [p.suspended] stage stays mounted but yields the viewport
 * @param {string} [p.className]  extra classes for the stage element
 * @param {string} [p.testId]
 * @param {React.ReactNode} p.children
 */
/**
 * The two signals the stage may show from outside itself.
 *
 * Says nothing at all when there is nothing to say: no provider, no unread
 * and no open to-dos all render empty rather than "0". A zero here would be
 * a scoreboard of nothing, which is the read `openTodoCount`'s own comment in
 * App.jsx already refuses on the header pill.
 */
function StageSignals() {
  const lines = stageSignalLines(useStageSignals())
  if (!lines.length) return null
  return (
    <p className="cc-stage-signals">
      {lines.map((line) => (
        <span key={line} className="cc-stage-signal">
          {line}
        </span>
      ))}
    </p>
  )
}

export default function Workroom({
  stepId,
  project = null,
  pathCtx = null,
  setActiveView,
  launcherRef = null,
  status = '',
  masthead = null,
  ledge = null,
  suspended = false,
  className = '',
  testId,
  children,
}) {
  const roomRef = useRef(null)
  const restoreRef = useRef(null)
  const headingId = `stage-${stepId}-title`

  const steps = useMemo(() => stepsForProject(project), [project])
  const current = steps.find((s) => s.id === stepId) || null
  const label = labelForStepId(stepId)

  /* Where Escape and the exit control go. The stop BEFORE this one on the
     project's own path — read from the filtered list, so a logo job that has
     no Research stop exits Directions to Brief rather than to a stage it does
     not have. The first stop exits to the desk, which is the only thing
     upstream of it. */
  const exit = useMemo(() => {
    const idx = steps.findIndex((s) => s.id === stepId)
    if (idx > 0) return { view: steps[idx - 1].view, label: steps[idx - 1].label }
    const prev = current ? getPrevJourney(current.view) : null
    if (prev) return { view: prev.view, label: prev.label }
    return { view: 'desk', label: 'the desk' }
  }, [steps, stepId, current])

  /* Capture before App's post-navigation effect parks focus in main. The
     launcher stays mounted under the inert shell, so it is still the exact
     element to hand focus back to when the stage closes. */
  useLayoutEffect(() => {
    const active = document.activeElement
    restoreRef.current =
      launcherRef?.current || (active instanceof HTMLElement ? active : null)
  }, [launcherRef])

  const leave = useCallback(
    (view) => {
      const launcher = restoreRef.current
      setActiveView?.(view)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (launcher?.isConnected) launcher.focus({ preventScroll: true })
        })
      })
    },
    [setActiveView]
  )

  const close = useCallback(() => leave(exit.view), [leave, exit.view])

  /* Shell isolation. The shell stays MOUNTED — route state, the work clock
     and the toast host all live there — but it is inert, hidden from the
     accessibility tree and invisible while the stage owns the viewport. */
  useEffect(() => {
    if (suspended) return undefined
    const root = document.getElementById('root')
    const hadInert = root?.hasAttribute('inert')
    const priorAriaHidden = root?.getAttribute('aria-hidden')
    const priorVisibility = root?.style.visibility
    const priorOverflow = document.body.style.overflow
    root?.setAttribute('inert', '')
    root?.setAttribute('aria-hidden', 'true')
    if (root) root.style.visibility = 'hidden'
    document.body.style.overflow = 'hidden'

    const focusables = () =>
      [...(roomRef.current?.querySelectorAll(FOCUSABLE) || [])].filter(
        (element) => element instanceof HTMLElement
      )

    const focusRoom = (last = false) => {
      const items = focusables()
      ;(last ? items.at(-1) : items[0])?.focus({ preventScroll: true })
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) {
        event.preventDefault()
        roomRef.current?.focus({ preventScroll: true })
        return
      }
      const active = document.activeElement
      const index = items.indexOf(active)
      if (event.shiftKey && (active === roomRef.current || index <= 0)) {
        event.preventDefault()
        items.at(-1)?.focus({ preventScroll: true })
      } else if (!event.shiftKey && index === items.length - 1) {
        event.preventDefault()
        items[0]?.focus({ preventScroll: true })
      }
    }

    const onFocusIn = (event) => {
      if (roomRef.current && !roomRef.current.contains(event.target)) focusRoom()
    }

    requestAnimationFrame(() => roomRef.current?.focus({ preventScroll: true }))
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      if (!hadInert) root?.removeAttribute('inert')
      if (priorAriaHidden == null) root?.removeAttribute('aria-hidden')
      else root?.setAttribute('aria-hidden', priorAriaHidden)
      if (root) root.style.visibility = priorVisibility || ''
      document.body.style.overflow = priorOverflow
    }
  }, [close, suspended])

  return createPortal(
    <section
      ref={roomRef}
      className={`cc-stage cc-stage--${stepId}${suspended ? ' is-suspended' : ''}${
        className ? ` ${className}` : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-hidden={suspended ? true : undefined}
      tabIndex={-1}
      data-testid={testId || `stage-${stepId}`}
      data-stage={stepId}
    >
      <header className="cc-stage-edge">
        <button
          type="button"
          className="cc-stage-exit"
          onClick={close}
          data-testid={`stage-${stepId}-exit`}
        >
          <span aria-hidden="true">←</span> Back to {exit.label}
        </button>

        <nav className="cc-stage-path" aria-label="Process position">
          <ol className="cc-stage-path-list">
            {steps.map((step) => {
              const here = step.id === stepId
              const done = pathCtx ? pathStepHasContent(step.id, pathCtx) : false
              return (
                <li key={step.id} className="cc-stage-path-item">
                  <button
                    type="button"
                    className={`cc-stage-stop${here ? ' is-here' : ''}${
                      done && !here ? ' is-done' : ''
                    }`}
                    aria-current={here ? 'step' : undefined}
                    onClick={() => {
                      if (!here) leave(step.view)
                    }}
                  >
                    {step.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="cc-stage-aside">
          {/* What the shell would have told you, if the shell were visible.
              Read-only by design — see `lib/stageSignals.js`. */}
          <StageSignals />
          <p className="cc-stage-status" role="status">
            {status}
          </p>
        </div>
      </header>

      <h1 id={headingId} className="sr-only">
        {label}
      </h1>

      <div className="cc-stage-plane">
        {masthead ? (
          <header className="cc-stage-masthead">{masthead}</header>
        ) : null}
        {children}
      </div>

      {ledge ? <div className="cc-stage-ledge">{ledge}</div> : null}
    </section>,
    document.body
  )
}
