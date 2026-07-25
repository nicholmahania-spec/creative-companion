/**
 * Flat line icons for header chrome buttons — matches PathStepIcon's
 * stroke style. Real icons, not emoji (emoji render as colorful
 * platform glyphs and break the flat grayscale system).
 */
const ICONS = {
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 9.5h16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8 3.5v3.5M16 3.5v3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3.5 19.5c.6-3.4 2.8-5 5.5-5s4.9 1.6 5.5 5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="16.5" cy="9.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M14.8 15c1.9.3 3.4 1.5 4 4.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 9v4l2.8 1.6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 2.5h5M12 4.5V2.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  helper: (
    <>
      <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4.5 19.5c.9-4.3 3.6-6.5 7.5-6.5s6.6 2.2 7.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  list: (
    <>
      <circle cx="5.5" cy="7" r="1.15" fill="currentColor" />
      <circle cx="5.5" cy="12" r="1.15" fill="currentColor" />
      <circle cx="5.5" cy="17" r="1.15" fill="currentColor" />
      <path d="M9.5 7h9M9.5 12h9M9.5 17h9" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  print: (
    <>
      <path d="M6.5 8.5v-5h11v5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3.5" y="8.5" width="17" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <rect x="6.5" y="14" width="11" height="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </>
  ),
  tools: (
    <path
      d="M14.7 6.3a3.5 3.5 0 0 0-4.62 4.62L4.5 16.5a1.5 1.5 0 0 0 2.12 2.12l5.58-5.58a3.5 3.5 0 0 0 4.62-4.62l-2.2 2.2-1.9-.6-.6-1.9 2.2-2.2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

export default function HeaderIcon({ name, className = '' }) {
  const body = ICONS[name]
  if (!body) return null
  return (
    <svg
      className={`header-icon-svg ${className}`.trim()}
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
