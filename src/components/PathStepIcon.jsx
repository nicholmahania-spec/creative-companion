/**
 * Playful micro-icons for path steps — visual anchors so users
 * recognize a step without reading the label.
 */
const ICONS = {
  define: (
    <path
      d="M8 3.5h5.5L17 7v9.5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z M13.5 3.5V7H17 M9 11h6 M9 14h4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  research: (
    <>
      <circle cx="10" cy="10" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.25 13.25 17 17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  ideate: (
    <path
      d="M12 3.5c-2.6 0-4.5 1.9-4.5 4.3 0 1.5.7 2.7 1.8 3.5.4.3.7.8.7 1.3v.9h3.9v-.9c0-.5.3-1 .7-1.3 1.1-.8 1.8-2 1.8-3.5C16.4 5.4 14.5 3.5 12 3.5Z M10.2 16.5h3.6 M10.8 18.5h2.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  sketch: (
    <path
      d="M5 16.5 14.2 7.3a1.4 1.4 0 0 1 2 0l.5.5a1.4 1.4 0 0 1 0 2L7.5 18.5H5v-2Z M13 8.5l2.5 2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  design: (
    <>
      <circle cx="8.5" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.5" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11.5" cy="14.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  review: (
    <path
      d="M5.5 12s2.2-4.5 6.5-4.5S18.5 12 18.5 12s-2.2 4.5-6.5 4.5S5.5 12 5.5 12Z M12 10.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  deliver: (
    <path
      d="M4.5 16.5h15 M7 16.5V9.5l5-4 5 4v7 M9.5 16.5v-4h5v4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

export default function PathStepIcon({ id, className = '' }) {
  const body = ICONS[id] || ICONS.define
  return (
    <svg
      className={`path-step-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  )
}

/** Circular progress ring for N/7 path completion (uses existing accent tokens). */
export function ProgressRing({
  value = 0,
  max = 7,
  size = 36,
  stroke = 3.5,
  className = '',
  children,
}) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)
  return (
    <span
      className={`progress-ring ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <svg
        className="progress-ring-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          className="progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="progress-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children != null && (
        <span className="progress-ring-label">{children}</span>
      )}
    </span>
  )
}
