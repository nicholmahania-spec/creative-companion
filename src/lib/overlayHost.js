/**
 * The transient layer's home in the DOM.
 *
 * A SIBLING of `#root`, declared in `index.html`. An open Workroom stage sets
 * `#root` to `inert` + `aria-hidden` + `visibility: hidden`, so anything that
 * must stay usable while a stop owns the viewport cannot live inside it. This
 * node is the one place that is structurally out of the stage's reach, which
 * is why the isolation code needs no exception for it.
 */
export function overlayHostEl() {
  let el = document.getElementById('cc-overlay-root')
  if (!el) {
    /* jsdom, and any mount that does not come from index.html. Idempotent, so
       StrictMode's double invoke cannot leave two hosts behind. */
    el = document.createElement('div')
    el.id = 'cc-overlay-root'
    document.body.appendChild(el)
  }
  return el
}
