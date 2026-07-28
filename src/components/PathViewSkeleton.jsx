/**
 * Lightweight skeleton for lazy path/Tools views — reduces blank flash without
 * heavy animation (respects reduced-motion via CSS).
 */
export default function PathViewSkeleton({ label = 'Loading…' }) {
  return (
    <div
      className="path-view-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div className="path-view-skeleton-bar path-view-skeleton-title" />
      <div className="path-view-skeleton-bar path-view-skeleton-line" />
      <div className="path-view-skeleton-bar path-view-skeleton-line is-short" />
      <div className="path-view-skeleton-panel" />
    </div>
  )
}
