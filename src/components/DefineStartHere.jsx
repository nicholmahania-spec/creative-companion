/**
 * "Start with these" — the Define page's anti-stall control.
 *
 * Lives in the header band rather than inside DetectiveSheet, and above the
 * milestone list rather than below it, for two reasons:
 *
 * 1. Task initiation. This block collapses "pick a chapter → scan for an
 *    empty field → pick one" into a single click; it is the page's ramp into
 *    the work. The milestone list beneath it is editable, satisfying and
 *    quick to complete — a lower-effort side quest sitting directly in the
 *    path to the real one. Placing the ramp first keeps the cheap task from
 *    intercepting the intended one.
 * 2. Interruption recovery. Rendered inside the sheet, its position moved
 *    down every time a milestone was added, and at three or four milestones
 *    it sat at or past the fold. It now has a fixed position that does not
 *    drift with content above it — same place on every return.
 *
 * The h1 and the deadline chip stay above it deliberately: the heading
 * answers "where am I" on a return visit, and `deadlineRelative` is the only
 * time-blindness compensation on the page.
 */
import { useCallback, useMemo } from 'react'
import { getRequiredEmpty, START_HERE_CAP } from '../lib/detectiveBrief'
import { trackChapterNavigation } from '../lib/analytics'

/** Smooth scrolling is a vestibular trigger for some users; honor the OS pref. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function DefineStartHere({ detective, onOpenChapter }) {
  const requiredEmpty = useMemo(() => getRequiredEmpty(detective), [detective])
  const startHere = useMemo(
    () => requiredEmpty.slice(0, START_HERE_CAP),
    [requiredEmpty]
  )

  /** Jump straight to one named field. Opening the chapter first matters in
   *  accordion mode, where the input is not mounted until it opens. */
  const jumpToField = useCallback(
    (fieldId, chapterId) => {
      if (chapterId) {
        onOpenChapter?.(chapterId)
        trackChapterNavigation(chapterId, 'open')
      }
      requestAnimationFrame(() => {
        const el =
          document.getElementById(`detective-${fieldId}`) ||
          // Checklist fields have no single input to focus — land on the
          // first checkbox so the jump still puts the cursor on the work.
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
    },
    [onOpenChapter]
  )

  return (
    <div
      className={`define-start-here${requiredEmpty.length === 0 ? ' is-done' : ''}`}
    >
      {startHere.length > 0 ? (
        <>
          <p className="define-start-here-title">
            Start with{' '}
            {startHere.length === 1 ? 'this one' : `these ${startHere.length}`}
          </p>
          <div className="define-start-here-list">
            {startHere.map((f) => (
              <button
                key={f.id}
                type="button"
                className="btn btn-primary"
                onClick={() => jumpToField(f.id, f.chapterId)}
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
