/**
 * Shared shell for the "Tactile Minimalist" focus-mode rework.
 * One header (progress + step label), one centered card slot. Every
 * focus-mode stage view renders inside this.
 *
 * NOTE: this app ships NO Tailwind — styling comes from the semantic
 * `.focus-*` tokens in src/index.css. An earlier rework used Tailwind
 * utility classes that never resolved, leaving focus mode unstyled.
 * This shell uses only the semantic classes (theme-aware, dark-mode safe)
 * plus a small set of token-based inline styles for the optional drawer.
 *
 * A slide-in preview drawer (toggled from the header) is for stages
 * that want a brand/pack preview.
 */
import { useState, useRef, useEffect, useCallback } from 'react'

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function FocusShell({
  stepLabel,
  stepIndex,
  stepCount,
  onBack,
  children,
  showPreviewDrawer = false,
  drawerContent = null,
  onDrawerToggle,
}) {
  const pct = stepCount > 0 ? Math.round((stepIndex / stepCount) * 100) : 0
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const drawerRef = useRef(null)
  const restoreFocusRef = useRef(null)

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    onDrawerToggle?.(false)
    // Return focus to whatever opened the drawer
    try {
      restoreFocusRef.current?.focus?.()
    } catch {
      /* ignore */
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
    if (isDrawerOpen) closeDrawer()
    else openDrawer()
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
            className="focus-back-btn"
            onClick={toggleDrawer}
            aria-label={isDrawerOpen ? 'Hide preview' : 'Show preview'}
            aria-expanded={isDrawerOpen}
          >
            {isDrawerOpen ? '◀' : '▶'}
          </button>
        )}
        <div
          className="focus-progress-track"
          role="progressbar"
          aria-label="Step progress"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="focus-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <main className="focus-main">{children}</main>

      {showPreviewDrawer && isDrawerOpen && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Preview"
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            height: '100dvh',
            width: 'min(20rem, 90vw)',
            background: 'var(--bg-elevated)',
            borderLeft: '1px solid var(--border-subtle)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
            color: 'var(--text-primary)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              padding: '0.9rem 1rem',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <strong style={{ fontFamily: 'var(--font-display)' }}>Preview</strong>
            <button
              type="button"
              className="focus-back-btn"
              onClick={closeDrawer}
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
          <div style={{ padding: '1rem', overflowY: 'auto', flex: '1 1 auto' }}>
            {drawerContent}
          </div>
        </div>
      )}
    </div>
  )
}
