import { useState, useRef, useEffect, useCallback } from 'react'
import { measureTime } from '../../lib/performance'

/** Same selector family as useModalFocus — keep trap behavior consistent. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function FocusShell({
  stepLabel,
  stepIndex,
  stepCount,
  onBack,
  onExit,
  children,
  showPreviewDrawer = false,
  drawerContent = null,
  onDrawerToggle,
}) {
  const safeCount = Math.max(1, Number(stepCount) || 1)
  const safeIndex = Math.min(Math.max(0, Number(stepIndex) || 0), safeCount)
  const pct = Math.min(100, Math.round((safeIndex / safeCount) * 100))

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDrawerContentLoaded, setIsDrawerContentLoaded] = useState(false)
  const drawerRef = useRef(null)
  const restoreFocusRef = useRef(null)

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    onDrawerToggle?.(false)
    const prev = restoreFocusRef.current
    restoreFocusRef.current = null
    if (prev && typeof prev.focus === 'function') {
      requestAnimationFrame(() => {
        try {
          prev.focus()
        } catch {
          /* element may be gone */
        }
      })
    }
  }, [onDrawerToggle])

  const openDrawer = useCallback(() => {
    restoreFocusRef.current = document.activeElement
    setIsDrawerOpen(true)
    onDrawerToggle?.(true)
    requestAnimationFrame(() => {
      const first = drawerRef.current?.querySelector(FOCUSABLE)
      first?.focus?.()
    })
  }, [onDrawerToggle])

  const toggleDrawer = useCallback(() => {
    return measureTime('drawer-toggle', () => {
      if (isDrawerOpen) closeDrawer()
      else openDrawer()
    })
  }, [isDrawerOpen, closeDrawer, openDrawer])

  // Trap focus + Escape while drawer is open
  useEffect(() => {
    if (!isDrawerOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDrawer()
        return
      }
      if (e.key !== 'Tab' || !drawerRef.current) return
      const items = [...drawerRef.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => !el.disabled && el.offsetParent !== null
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isDrawerOpen, closeDrawer])

  // Escape exits focus mode entirely (when the preview drawer isn't open —
  // that case is handled above and takes priority).
  useEffect(() => {
    if (!onExit || isDrawerOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onExit()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onExit, isDrawerOpen])

  // Close drawer when clicking outside of it
  useEffect(() => {
    if (!isDrawerOpen) return undefined
    const onPointer = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        closeDrawer()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [isDrawerOpen, closeDrawer])

  // Load drawer content when drawer opens (lazy loading)
  useEffect(() => {
    if (isDrawerOpen && !isDrawerContentLoaded && drawerContent !== null) {
      setIsDrawerContentLoaded(true)
    }
    if (!isDrawerOpen && isDrawerContentLoaded) {
      setIsDrawerContentLoaded(false)
    }
  }, [isDrawerOpen, isDrawerContentLoaded, drawerContent])

  return (
    <div className="focus-shell">
      <header className="focus-header">
        {onBack && (
          <button
            type="button"
            className="focus-back-btn"
            onClick={onBack}
            aria-label="Back to previous step"
          >
            ←
          </button>
        )}
        <span className="focus-step-label">{stepLabel}</span>
        {showPreviewDrawer && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleDrawer}
            aria-label={isDrawerOpen ? 'Hide preview' : 'Show preview'}
            aria-pressed={isDrawerOpen}
          >
            {isDrawerOpen ? 'Hide preview' : 'Preview'}
          </button>
        )}
        <div className="focus-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="focus-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        {onExit && (
          <button
            type="button"
            className="focus-exit-btn"
            onClick={onExit}
            aria-label="Exit focus mode"
            title="Exit focus mode"
          >
            Exit
          </button>
        )}
      </header>

      <main className="focus-main">{children}</main>

      {showPreviewDrawer && isDrawerOpen && (
        <>
          <div
            className="focus-drawer-backdrop"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Preview"
            className="focus-drawer"
          >
            <div className="focus-drawer-head">
              <h2 className="focus-drawer-title">Preview</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeDrawer}
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className="focus-drawer-body">
              {isDrawerContentLoaded && drawerContent !== null ? drawerContent : null}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
