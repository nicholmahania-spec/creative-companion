/**
 * Shared shell for the "Tactile Minimalist" focus-mode rework.
 * One header (progress + step label), one centered card slot. Every
 * focus-mode stage view renders inside this.
 *
 * A slide-in preview drawer (toggled from the header) is for stages
 * that need a brand/pack preview (Design, Deliver).
 */
import { useState, useRef, useEffect } from 'react'

export default function FocusShell({
  stepLabel,
  stepIndex,
  stepCount,
  onBack,
  onExit,
  children,
  showPreviewDrawer = false,
  drawerContent = null,
  onDrawerToggle
}) {
  const pct = stepCount > 0 ? Math.round((stepIndex / stepCount) * 100) : 0
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const drawerRef = useRef(null)
  const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  const firstFocusableRef = useRef(null)
  const lastFocusableRef = useRef(null)

  const handleDrawerToggle = () => {
    setIsDrawerOpen(!isDrawerOpen)
    onDrawerToggle?.(!isDrawerOpen)

    if (!isDrawerOpen) {
      // Opening drawer - focus first element
      requestAnimationFrame(() => {
        if (drawerRef.current) {
          const firstFocusable = drawerRef.current.querySelector(focusableElements)
          if (firstFocusable) {
            firstFocusable.focus()
          }
        }
      })
    }
  }

  // Trap focus inside drawer when open
  useEffect(() => {
    if (!isDrawerOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleDrawerToggle()
      }

      if (e.key === 'Tab') {
        const focusableItems = drawerRef.current.querySelectorAll(focusableElements)
        const firstItem = focusableItems[0]
        const lastItem = focusableItems[focusableItems.length - 1]

        if (e.shiftKey) { // shift + tab
          if (document.activeElement === firstItem) {
            e.preventDefault()
            lastItem.focus()
          }
        } else { // tab
          if (document.activeElement === lastItem) {
            e.preventDefault()
            firstItem.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen, handleDrawerToggle])

  // Close drawer when clicking outside
  useEffect(() => {
    if (!isDrawerOpen) return

    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        handleDrawerToggle()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDrawerOpen, handleDrawerToggle])

  return (
    <div className="flex h-[calc(100%-4rem)]">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <div className="focus-shell p-4">
          <header className="flex items-center justify-between pb-3 border-b border-border">
            {onBack && (
              <button
                type="button"
                className="focus-back-btn btn btn-outline btn-icon"
                onClick={onBack}
                aria-label="Back to previous step"
              >
                ←
              </button>
            )}
            <div className="flex items-center space-x-3">
              <span className="focus-step-label">{stepLabel}</span>
              {showPreviewDrawer && (
                <button
                  type="button"
                  className="btn btn-outline btn-icon hover:bg-muted/50"
                  onClick={handleDrawerToggle}
                  aria-label={isDrawerOpen ? 'Hide preview' : 'Show preview'}
                  aria-pressed={isDrawerOpen}
                >
                  {isDrawerOpen ? '◀' : '▶'}
                </button>
              )}
            </div>
            <div className="flex-1">
              <div
                className="focus-progress-track"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="focus-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {onExit && (
              <button
                type="button"
                className="focus-exit-btn"
                onClick={onExit}
                aria-label="Exit focus mode"
              >
                ×
              </button>
            )}
          </header>

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>

      {/* Preview drawer */}
      {showPreviewDrawer && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          className={`fixed right-0 top-0 h-screen w-80 bg-warm border-l border-shadow translate-x-[${isDrawerOpen ? '0' : '100%'}]
                     transition-transform duration-300 ease-in-out z-50`}
        >
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold mb-2">
              Preview
            </h2>
            <button
              type="button"
              ref={firstFocusableRef}
              className="btn btn-outline btn-icon float-right text-sm"
              onClick={handleDrawerToggle}
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
          <div className="p-4 overflow-y-auto h-full">
            {drawerContent}
            <div ref={lastFocusableRef} tabIndex={-1} />
          </div>
        </div>
      )}
    </div>
  )
}
