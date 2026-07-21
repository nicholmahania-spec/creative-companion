/**
 * Long-form guidance hidden behind a tiny "?" toggle — text-free by default.
 */
export default function InfoReveal({ children, label = 'Info' }) {
  if (!children) return null
  return (
    <details className="info-reveal">
      <summary className="info-reveal-toggle" aria-label={label}>
        ?
      </summary>
      <p className="info-reveal-body">{children}</p>
    </details>
  )
}
