/**
 * Says which copy of the app you have open.
 *
 * Three copies of this app are reachable and they look identical. When they
 * behave differently — and they do — the difference reads as a bug in the app
 * rather than a fact about the URL. On 2026-08-01 that cost most of an
 * evening, twice.
 *
 * This is a mode annunciator, borrowed from the cockpit: display the mode
 * continuously rather than leaving it to be inferred. Deliberately:
 *
 * - It renders NOTHING on production and nothing on a local build. An
 *   annunciator that is always lit is wallpaper, and a toll on the normal
 *   path is exactly what this app exists to remove.
 * - It is not dismissible. A dismissed banner puts you straight back in the
 *   state where the copy is invisible, which is the bug.
 * - Header chrome, not a footer and not a modal — the owner's own rule: "if
 *   it's at the bottom, I won't see it or use it."
 * - Neutral language and no alarm colour. It names the artifact ("this is the
 *   Pages mirror") and offers the action ("open the main copy"), never the
 *   omission.
 */

import { currentDeployNotice } from '../lib/deploy/currentDeploy'

export default function DeployNotice() {
  const notice = currentDeployNotice()
  if (!notice) return null

  return (
    <div className={`deploy-notice is-${notice.tone}`} role="status">
      <span className="deploy-notice-text">{notice.text}</span>
      {notice.actionHref && (
        <a
          className="deploy-notice-link"
          href={notice.actionHref}
          rel="noreferrer"
        >
          {notice.actionLabel}
        </a>
      )}
    </div>
  )
}
