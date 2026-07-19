import { useEffect } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Focus trap + restore for a single open modal root.
 * @param {boolean} open
 * @param {() => (HTMLElement|null)} getRoot — return dialog container
 * @param {{ initialSelector?: string }} [opts]
 */
export function useModalFocus(open, getRoot, opts = {}) {
  const initialSelector = opts.initialSelector || ''

  useEffect(() => {
    if (!open) return undefined
    const root = typeof getRoot === 'function' ? getRoot() : null
    if (!root) return undefined

    const prev = document.activeElement
    const list = () =>
      [...root.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      )

    const focusInitial = () => {
      const preferred = initialSelector
        ? root.querySelector(initialSelector)
        : null
      const focusable = list()
      const target = preferred || focusable[0]
      try {
        target?.focus?.()
      } catch {
        /* ignore */
      }
    }
    const raf = window.requestAnimationFrame(focusInitial)

    const onKey = (e) => {
      if (e.key !== 'Tab') return
      const focusable = list()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [open, getRoot, initialSelector])
}
