/**
 * Who owns Escape when something is open on top of something else.
 *
 * THE DEFECT THIS EXISTS FOR. `useModalFocus` listens on `document` in the
 * BUBBLE phase; `Workroom` listens on `document` in the CAPTURE phase. Capture
 * always runs first, so a single Escape inside a nested modal ran both
 * handlers: the modal closed AND the stage under it closed and navigated to
 * the previous stop. Measured on the Brand book — Escape in the flipbook left
 * the app on Touchpoints with focus on `<body>`, and the button that had
 * opened the overlay was gone with the stage, so focus could not be restored
 * to it either.
 *
 * WHY NOT `stopPropagation`. It is the obvious fix and it breaks four working
 * closers. `App.jsx` mounts the export panel, the desk confirm and the
 * shortcuts dialog with NO `onClose`, so `useModalFocus` never handles their
 * Escape at all — they are closed solely by App's own window-level ladder, and
 * a modal that swallowed the event would strand all three open. `RunningTodo`
 * deliberately owns Escape on window-capture for the same reason.
 *
 * So this gates ACTING, never propagation. Event phase cannot express nesting,
 * because phase is a property of the listener and nesting is a property of the
 * moment — so nesting is recorded instead: innermost last, and only the top
 * layer acts. Everything else still sees the event and can still make its own
 * decision.
 */

/** Open modal layers, outermost first. Tokens are opaque identities. */
const layers = []

/**
 * Register a layer while it is open.
 * @param {object} token — an identity, typically a fresh `{}` per mount
 * @returns {() => void} pop, safe to call twice
 */
export function pushModalLayer(token) {
  layers.push(token)
  let popped = false
  return () => {
    if (popped) return
    popped = true
    /* `lastIndexOf` + `splice`, not `pop`. React does not guarantee that
       unmount order is the reverse of mount order once two modals close in
       the same commit, and a `pop` that removed someone else's token would
       leave a layer registered forever — after which the stage would never
       answer Escape again, silently and permanently. */
    const i = layers.lastIndexOf(token)
    if (i >= 0) layers.splice(i, 1)
  }
}

/** Is this token the one that should act on a key right now? */
export function isTopModalLayer(token) {
  return layers.length > 0 && layers[layers.length - 1] === token
}

/** Is anything open above the stage? */
export function hasOpenModalLayer() {
  return layers.length > 0
}

/** Test-only: forget every layer. Never call this from app code. */
export function resetModalLayers() {
  layers.length = 0
}
