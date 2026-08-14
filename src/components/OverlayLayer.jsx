import { createPortal } from 'react-dom'
import { overlayHostEl } from '../lib/overlayHost.js'
import '../styles/overlay-host.css'

/**
 * The layer above the stage.
 *
 * A Workroom stop hides the shell — `#root` goes `inert`, `aria-hidden` and
 * `visibility: hidden` — and that is the point of an immersive workspace. The
 * cost, until now, was that the app's transient layer lived inside `#root` and
 * went to sleep with it: an undo offered from inside a stage rendered at
 * 241x39 with `.cc-stage-ledge` on top of it, and Delivery's Preview opened a
 * full-viewport dialog at 1280x720 that could not be seen or reached.
 *
 * So the transient layer moves out of the room rather than the room letting go
 * of the shell. `#cc-overlay-root` is a sibling of `#root` in `index.html`,
 * which means the isolation code is untouched and structurally cannot reach
 * this. Nothing here changes what a stage does; it changes only what a stage
 * is capable of hiding.
 *
 * WHAT BELONGS HERE: things that are temporary, that can be raised from inside
 * a stage, and that the designer must be able to see and act on at the moment
 * they appear. WHAT DOES NOT: launchers and persistent chrome. A button that
 * opens something inert is worse than no button — that is the reasoning
 * `lib/stageSignals.js` already records, and it still holds for everything
 * that stays behind.
 */

/**
 * @param {{ theme?: string, children?: import('react').ReactNode }} props
 *   theme — the shell's current theme class. Load-bearing: the deep palette is
 *   declared on `.app.deep`, so a portal that dropped `app`/`theme` would
 *   render the light tokens on a dark canvas.
 */
export default function OverlayLayer({ theme = '', children }) {
  return createPortal(
    <div className={`app cc-overlay-layer ${theme}`.trim()}>{children}</div>,
    overlayHostEl()
  )
}
