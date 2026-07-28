/**
 * App footer — version + sync meta. Memoized shell chrome.
 */
import { memo } from 'react'
import { versionLabel } from '../../lib/version'

function AppFooter({
  APP_BUILD,
  APP_BUILD_DATE,
  accessName,
  CLOUD,
  syncState,
}) {
  return (
    <footer className="app-footer" role="contentinfo">
      <span className="app-footer-brand">Creative Companion</span>
      <span className="app-footer-sep" aria-hidden="true">
        ·
      </span>
      <span
        className="app-footer-version"
        title={`Build ${APP_BUILD}${APP_BUILD_DATE ? ` · ${APP_BUILD_DATE}` : ''}`}
      >
        {versionLabel()}
      </span>
      <span className="app-footer-sep" aria-hidden="true">
        ·
      </span>
      <span className="app-footer-meta">
        {accessName ? `${accessName} · ` : ''}
        {CLOUD
          ? syncState === 'syncing'
            ? 'Syncing…'
            : syncState === 'error'
              ? 'Sync error'
              : 'Cloud'
          : 'Local-only'}
      </span>
    </footer>
  )
}

export default memo(AppFooter)
