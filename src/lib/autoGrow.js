/**
 * Auto-growing textareas — fallback for browsers without `field-sizing`.
 *
 * The CSS in index.css does this natively wherever `field-sizing: content` is
 * supported. This module covers the rest, and only the rest: if the browser
 * has it, install() returns immediately and nothing is observed.
 *
 * Why it exists at all: a drag-to-resize grip makes the user decide how big a
 * box should be while they are trying to think inside it, and a too-small box
 * scrolls their own earlier sentences out of view mid-thought. Growing to fit
 * removes both without asking anything of them.
 */

const SELECTOR = [
  'textarea.field-textarea',
  'textarea.define-input',
  'textarea.onboard-input',
  'textarea.artboard-brief-input',
].join(',')

export function supportsFieldSizing() {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('field-sizing', 'content')
  )
}

/** Size one textarea to its content. Safe to call on anything. */
export function grow(el) {
  if (!el || el.tagName !== 'TEXTAREA') return
  // Reset first: without this the box can only ever get taller, because
  // scrollHeight is clamped by the height we last set.
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/**
 * Install global auto-grow. Returns a cleanup function.
 *
 * Uses event delegation plus a MutationObserver rather than per-component
 * hooks, so it covers every textarea in the app — including ones rendered
 * later — without touching each call site.
 */
export function installAutoGrow(root = document) {
  if (supportsFieldSizing()) return () => {}

  const growAll = () => root.querySelectorAll(SELECTOR).forEach(grow)

  const onInput = (e) => {
    if (e.target?.matches?.(SELECTOR)) grow(e.target)
  }

  // React writes values programmatically on rehydrate and on project switch,
  // which fires no input event — so re-measure when the DOM changes too.
  const observer = new MutationObserver(growAll)

  root.addEventListener('input', onInput, true)
  observer.observe(root.body || root, { childList: true, subtree: true })
  growAll()

  const onResize = () => growAll()
  window.addEventListener('resize', onResize)

  return () => {
    root.removeEventListener('input', onInput, true)
    window.removeEventListener('resize', onResize)
    observer.disconnect()
  }
}
