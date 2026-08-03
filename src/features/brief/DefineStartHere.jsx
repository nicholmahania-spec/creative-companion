/**
 * "Start with these" — the Define page's anti-stall control.
 *
 * One jump only (first empty required field). Three chips restated the same
 * list the form NEEDED badges already show, and competed with Send.
 * Count line + one button = initiation without a second inventory.
 */
import { useCallback, useMemo } from 'react'
import { getRequiredEmpty } from '../../lib/brief/detectiveBrief'

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
  const first = requiredEmpty[0] || null

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
      {first ? (
        <>
          <p className="define-start-here-title">
            {requiredEmpty.length === 1
              ? `1 thing needed before ${researchLabel}`
              : `${requiredEmpty.length} things needed before ${researchLabel}`}
          </p>
          <div className="define-start-here-list">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => jumpToField(first.id)}
            >
              Start with {first.label}
            </button>
          </div>
        </>
      ) : (
        <p className="define-start-here-title">
          Everything needed is answered — the rest is optional.
        </p>
      )}
    </div>
  )
}
