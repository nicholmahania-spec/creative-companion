import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { measureTime } from '../../lib/performance'

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
  const [isDrawerContentLoaded, setIsDrawerContentLoaded] = useState(false)
  const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  const firstFocusableRef = useRef(null)
  const lastFocusableRef = useRef(null)

  // Measure drawer toggle performance
  const handleDrawerToggle = useCallback(() => {
    return measureTime('drawer-toggle', () => {
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
    })
  }, [isDrawerOpen, onDrawerToggle])

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

  // Load drawer content when drawer opens (lazy loading)
  useEffect(() => {
    if (isDrawerOpen && !isDrawerContentLoaded && drawerContent !== null) {
      setIsDrawerContentLoaded(true)
    }

    // Unload content when drawer closes to free memory
    if (!isDrawerOpen && isDrawerContentLoaded) {
      setIsDrawerContentLoaded(false)
    }
  }, [isDrawerOpen, isDrawerContentLoaded, drawerContent])

  return (
    <div className="flex flex-col">
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
                  {isDrawerOpen ? (
                    <ChevronLeft className="h-4 w-4 hidden sm:block" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-4 w-4 hidden sm:block" aria-hidden="true" />
                  )}
                  <span className="sm:hidden text-xs">{isDrawerOpen ? '▼' : '▲'}</span>
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

      {/* Preview drawer with lazy loading */}
      {showPreviewDrawer && (
        <>
          {/* Mobile backdrop */}
          {isDrawerOpen && (
            <div
              className="fixed inset-0 bg-black/30 z-40 sm:hidden"
              onClick={handleDrawerToggle}
              aria-hidden="true"
            />
          )}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            className={[
              // Mobile: bottom sheet
              'fixed bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl',
              // Desktop: right sidebar
              'sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-screen sm:w-80 sm:rounded-none',
              // Shared
              'bg-background border border-border flex flex-col',
              'transition-transform duration-300 ease-in-out z-50',
              // Slide state — mobile uses translate-y, desktop uses translate-x
              isDrawerOpen
                ? 'translate-y-0 sm:translate-y-0 sm:translate-x-0'
                : 'translate-y-full sm:translate-y-0 sm:translate-x-full',
            ].join(' ')}
          >
            {/* Mobile drag handle */}
            <div className="flex justify-center pt-2 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Preview</h2>
              <button
                type="button"
                ref={firstFocusableRef}
                className="btn btn-outline btn-icon text-sm"
                onClick={handleDrawerToggle}
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {isDrawerContentLoaded && drawerContent !== null ? (
                <>
                  {drawerContent}
                  <div ref={lastFocusableRef} tabIndex={-1} />
                </>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  )
}