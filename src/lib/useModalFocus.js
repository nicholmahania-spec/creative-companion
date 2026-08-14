import { useEffect, useRef } from 'react'
import { isTopModalLayer, pushModalLayer } from './modalLayers.js'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Focus trap + restore for a single open modal root.
 * @param {boolean} open
 * @param {() => (HTMLElement|null)} getRoot — return dialog container
 * @param {{ initialSelector?: string, onClose?: () => void }} [opts]
 *   onClose — if given, Escape closes the dialog. Escape was handled by each
 *   modal separately or, in several, not at all: the Discovery brief could
 *   only be dismissed by finding its "×", while the shortcuts dialog beside
 *   it closed on Escape, so the same gesture worked or didn't depending on
 *   which panel was open. A trap that keeps focus in but has no keyboard way
 *   out is the wrong half of the pattern.
 */
export function useModalFocus(open, getRoot, opts = {}) {
  const initialSelector = opts.initialSelector || ''

  /* getRoot and onClose are almost always inline arrows, so their identity
     changes on every render. With them in the dependency array the effect
     tore down and re-ran constantly — and its cleanup restores focus to
     whatever was focused BEFORE the modal opened, so each re-run yanked focus
     back out. The dialog opened with focus still on document.body: a trap
     with nothing trapped in it. Held in refs so the effect keys on `open`
     alone while still calling the latest callbacks. */
  const getRootRef = useRef(getRoot)
  const onCloseRef = useRef(opts.onClose)
  getRootRef.current = getRoot
  onCloseRef.current = opts.onClose

  useEffect(() => {
    if (!open) return undefined
    const getR = getRootRef.current
    const root = typeof getR === 'function' ? getR() : null
    if (!root) return undefined

    /* Register as the innermost open layer for as long as this modal is up.
       Workroom listens for Escape on capture and would otherwise close the
       whole stage out from under this dialog — see `lib/modalLayers.js` for
       why the fix is an ordering registry rather than `stopPropagation`. */
    const token = {}
    const popLayer = pushModalLayer(token)

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
      /* Something opened on top of this one. It answers, we do not — one
         Escape closes one thing. */
      if (!isTopModalLayer(token)) return
      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault()
        onCloseRef.current()
        return
      }
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
      /* Popped BEFORE the focus restore: restoring focus can synchronously
         mount or unmount another layer, and this one is already gone. */
      popLayer()
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [open, initialSelector])
}
