/**
 * Long-form guidance behind "?" — hidden entirely when prefs.hideTips is on.
 */
import useAppStore from '../store/useAppStore'

export default function InfoReveal({ children, label = 'Info' }) {
  const hideTips = useAppStore((s) => !!s.prefs?.hideTips)
  if (!children || hideTips) return null
  return (
    <details className="info-reveal">
      <summary className="info-reveal-toggle" aria-label={label}>
        ?
      </summary>
      <p className="info-reveal-body">{children}</p>
    </details>
  )
}
