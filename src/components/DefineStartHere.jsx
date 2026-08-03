/**
 * "Start with these" — the Define page's anti-stall control.
 *
 * Lives in the brief header band, fixed position, above the form:
 * task initiation ramp that collapses "pick a chapter → scan empty field"
 * into one click. Milestones and scope sit below the form so they cannot
 * intercept this ramp (adhd-executive-function-advisor 2026-08-03).
 */
import { useCallback, useMemo } from 'react'
import { getRequiredEmpty, START_HERE_CAP } from '../lib/detectiveBrief'

/** Smooth scrolling is a vestibular trigger for some users; honor the OS pref. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function DefineStartHere({
  detective,
  projectDeadline = '',
  /** Path stop label — always pass `labelForStepId('research')` from the parent. */
  researchLabel = 'next',
}) {
  const requiredEmpty = useMemo(
    () => getRequiredEmpty(detective, projectDeadline),
    [detective, projectDeadline]
  )
  const startHere = useMemo(
    () => requiredEmpty.slice(0, START_HERE_CAP),
    [requiredEmpty]
  )

  const jumpToField = useCallback((fieldId) => {
    requestAnimationFrame(() => {
      const el =
        document.getElementById(`detective-${fieldId}`) ||
        document
          .getElementById(`detective-field-${fieldId}`)
          ?.querySelector('input[type="checkbox"]')
      if (!el) return
      el.scrollIntoView({
        block: 'center',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
      el.focus()
    })
  }, [])

  return (
    <div
      className={`define-start-here${requiredEmpty.length === 0 ? ' is-done' : ''}`}
    >
      {startHere.length > 0 ? (
        <>
          <p className="define-start-here-title">
            {requiredEmpty.length === 1
              ? `1 thing needed before ${researchLabel} — start with this`
              : `${requiredEmpty.length} things needed before ${researchLabel} — start with these`}
          </p>
          <div className="define-start-here-list">
            {startHere.map((f) => (
              <button
                key={f.id}
                type="button"
                /* Outline, not solid primary — Send/Next keep the only filled
                   CTAs so five white bricks don't compete (declutter 2026-08-03). */
                className="btn btn-secondary"
                onClick={() => jumpToField(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="define-start-here-title">
          Everything needed is answered — the rest is optional detail.
        </p>
      )}
    </div>
  )
}
